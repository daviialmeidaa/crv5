/**
 * services/sync_custos.js
 * 
 * Orquestra a sincronização de notas de vendas e devoluções do Supra
 * para o PostgreSQL, buscando os custos via cost_engine.
 */

const { getPool, getPoolSGC2, sql } = require('../db/connection'); // Supra
const pgPool = require('../db/pgConnection'); // Postgres
const { findCusto } = require('./cost_engine');

// Mapeamento CFOP
const CFOP_VENDA = [5102, 6102];
const CFOP_DEVOLUCAO = [1202, 2202];
const CFOPS_VALIDOS = [...CFOP_VENDA, ...CFOP_DEVOLUCAO];

async function syncAnoMes(ano, mes, onProgress = null) {
    const notify = (data) => {
        if (onProgress) onProgress(data);
    };

    notify({ message: `Iniciando sincronização: ${mes}/${ano}`, isHighlight: true });
    
    // 1. Buscar notas já importadas no Postgres para o mês/ano
    const pgNotasResult = await pgPool.query(`
        SELECT DISTINCT empresa, nota_fiscal 
        FROM financeiro.vendas_custos 
        WHERE EXTRACT(YEAR FROM data_emissao) = $1 AND EXTRACT(MONTH FROM data_emissao) = $2
    `, [ano, mes]);
    
    const notasImportadas = new Set();
    pgNotasResult.rows.forEach(r => notasImportadas.add(`${r.empresa}-${r.nota_fiscal}`));
    notify({ message: `${notasImportadas.size} itens já existem no histórico local (ignorado).`, isSuccess: true });

    const conexoes = [
        { pool: await getPool(), empresa: 'Nexomed' },
        { pool: await getPoolSGC2(), empresa: 'BML' }
    ];

    let totalAnalisadas = 0;
    let novasInsercoes = 0;
    
    // Estatísticas
    const notasProcessadas = new Set();
    let notasVenda = 0;
    let notasDevolucao = 0;
    let totalItensProcessados = 0;
    let custosEncontrados = 0;
    let semCusto = 0;
    
    // Estatísticas de Nível para UI em Tempo Real
    let custosNivel1e2 = 0;
    let custosNivel3e4 = 0;
    let custosNivel5 = 0;
    
    const pgClient = await pgPool.connect();

    try {
        await pgClient.query('BEGIN');

        let allItensSupra = [];

        for (const cx of conexoes) {
            if (!cx.pool) {
                notify({ message: `Ignorando empresa ${cx.empresa} (sem conexão com o banco).`, isWarning: true });
                continue;
            }

            notify({ message: `Consultando banco Supra da empresa: ${cx.empresa}`, isHighlight: true });

            // Query unificando os itens e seus lotes (se existirem)
            const querySupra = `
                SELECT 
                    nf.empr_codigo,
                    nf.numero_nota,
                    nf.datahora_emissao_nfe as data_emissao,
                    nf.cfop_codigo,
                    c.codigo as codigo_cliente,
                    c.nome as cliente,
                    c.uf_sigla,
                    nfi.prod_codigo,
                    p.nome as produto,
                    cp.nome as classificacao,
                    f.nome as fabricante,
                    nfi.Unidade as unidade,
                    nfil.lote_numero as lote,
                    COALESCE(nfil.quantidade, nfi.quantidade) as quantidade,
                    nfi.valor_unitario
                FROM nota_fiscal_venda nf
                JOIN nota_fiscal_venda_item nfi ON nfi.nf_numero = nf.codigo
                LEFT JOIN nota_fiscal_venda_item_lote nfil ON nfil.nfit_nf_numero = nfi.nf_numero AND nfil.nfit_codigo = nfi.codigo
                LEFT JOIN produto p ON nfi.prod_codigo = p.codigo
                LEFT JOIN classificacao_produto cp ON p.claspro_codigo_1 = cp.codigo
                LEFT JOIN cliente_fornecedor c ON nf.clifor_codigo = c.codigo
                LEFT JOIN fabricante f ON p.fabr_codigo = f.codigo
                WHERE YEAR(nf.datahora_emissao_nfe) = @ano 
                  AND MONTH(nf.datahora_emissao_nfe) = @mes
                  AND nf.cfop_codigo IN (${CFOPS_VALIDOS.join(',')})
                  AND nf.situacao = 2 -- 2: Concretizada / Faturada (Status Interno ERP Supra)
                  AND (nf.id_situacao_nfe = 4 OR nf.id_situacao_nfe IS NULL) -- 4: Nota Transmitida/Autorizada na SEFAZ
            `;

            const supraResult = await cx.pool.request()
                .input('ano', sql.Int, ano)
                .input('mes', sql.Int, mes)
                .query(querySupra);

            const itensSupra = supraResult.recordset;
            itensSupra.forEach(i => i.empresa_origem = cx.empresa);
            allItensSupra = allItensSupra.concat(itensSupra);
            
            notify({ message: `${itensSupra.length} registros encontrados para ${cx.empresa}.`, isSuccess: true });
        }

        const totalItensToProcess = allItensSupra.length;
        
        if (totalItensToProcess > 0) {
            notify({ message: `Iniciando análise de ${totalItensToProcess} registros no total...`, isHighlight: true });
        } else {
            notify({ message: `Nenhum registro encontrado para este período.`, isWarning: true });
        }

        for (let i = 0; i < totalItensToProcess; i++) {
            const item = allItensSupra[i];
            const cxEmpresa = item.empresa_origem;
            const notaFiscal = item.numero_nota;

            if (i % 5 === 0) {
                notify({ progress: (i / totalItensToProcess) * 100 });
            }
            
            // Pular se a nota já foi importada inteiramente
            if (notasImportadas.has(`${cxEmpresa}-${notaFiscal}`)) {
                continue;
            }

            const tipoNota = CFOP_DEVOLUCAO.includes(item.cfop_codigo) ? 'DEVOLUÇÃO RETORNO DE VENDA' : 'VENDA';
            
            // Rastrear Notas Fiscais unicas processadas agora
            const notaKey = `${cxEmpresa}-${notaFiscal}`;
            if (!notasProcessadas.has(notaKey)) {
                notasProcessadas.add(notaKey);
                if (tipoNota === 'VENDA') {
                    notasVenda++;
                } else {
                    notasDevolucao++;
                }
            }

            totalItensProcessados++;

            const multiplier = tipoNota === 'DEVOLUÇÃO RETORNO DE VENDA' ? -1 : 1;

            const qtd = (item.quantidade || 0) * multiplier;
            const valUnit = item.valor_unitario || 0;
            const valTotal = qtd * valUnit;

            // 4. Buscar custo via Cost Engine
            const engineResult = await findCusto(cxEmpresa, item.prod_codigo, item.lote, item.classificacao);
            const custoUnitario = engineResult.cost;
            const level = engineResult.level;

            if (level === 1 || level === 2) custosNivel1e2++;
            else if (level === 3 || level === 4) custosNivel3e4++;
            else custosNivel5++;

            // Emitir progresso e status em tempo real (stats)
            const currentItemDesc = `Produto [${item.prod_codigo}]${item.lote ? ` Lote [${item.lote}]` : ''}`;
            notify({ 
                progress: (i / totalItensToProcess) * 100,
                currentItem: currentItemDesc,
                stats: { n12: custosNivel1e2, n34: custosNivel3e4, n5: custosNivel5 }
            });

            const custoTotal = qtd * custoUnitario; 
            
            if (custoUnitario > 0) {
                custosEncontrados++;
            } else {
                semCusto++;
            }

            // 5. Inserir no Postgres
            await pgClient.query(`
                INSERT INTO financeiro.vendas_custos (
                    empresa, nota_fiscal, codigo_cliente, cliente, cidade, uf, data_emissao, tipo_nota,
                    cod_produto, produto, lote, classificacao, fabricante, unidade,
                    quantidade, valor_unitario, valor_total, custo_unitario, custo_total
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
                )
            `, [
                cxEmpresa, 
                notaFiscal, 
                item.codigo_cliente, 
                item.cliente || '(Não Informado)', 
                null, 
                item.uf_sigla, 
                item.data_emissao, 
                tipoNota,
                item.prod_codigo, 
                item.produto, 
                item.lote || null, 
                item.classificacao, 
                item.fabricante, 
                item.unidade,
                qtd, valUnit, valTotal, custoUnitario, custoTotal
            ]);

            novasInsercoes++;
        }

        notify({ progress: 100 });
        await pgClient.query('COMMIT');
        
        return { 
            success: true, 
            analisadas: totalItensToProcess, 
            inseridas: novasInsercoes,
            totalNotas: notasProcessadas.size,
            notasVenda,
            notasDevolucao,
            totalItens: totalItensProcessados,
            custosEncontrados,
            semCusto,
            n12: custosNivel1e2,
            n34: custosNivel3e4,
            n5: custosNivel5
        };

    } catch (err) {
        await pgClient.query('ROLLBACK');
        console.error('❌ Erro na sincronização:', err);
        throw err;
    } finally {
        pgClient.release();
    }
}

module.exports = {
    syncAnoMes
};
