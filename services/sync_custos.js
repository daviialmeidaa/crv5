/**
 * services/sync_custos.js
 * 
 * Orquestra a sincronização de notas de vendas e devoluções do Supra
 * para o PostgreSQL, buscando os custos via cost_engine.
 */

const { getPool, sql } = require('../db/connection'); // Supra
const pgPool = require('../db/pgConnection'); // Postgres
const { findCusto } = require('./cost_engine');

// Mapeamento CFOP
const CFOP_VENDA = [5102, 6102];
const CFOP_DEVOLUCAO = [1202, 2202];
const CFOPS_VALIDOS = [...CFOP_VENDA, ...CFOP_DEVOLUCAO];

async function syncAnoMes(ano, mes) {
    console.log(`\n🔄 Iniciando sincronização: ${mes}/${ano}`);
    
    // 1. Buscar notas já importadas no Postgres para o mês/ano
    const pgNotasResult = await pgPool.query(`
        SELECT DISTINCT empresa, nota_fiscal 
        FROM financeiro.vendas_custos 
        WHERE EXTRACT(YEAR FROM data_emissao) = $1 AND EXTRACT(MONTH FROM data_emissao) = $2
    `, [ano, mes]);
    
    const notasImportadas = new Set();
    pgNotasResult.rows.forEach(r => notasImportadas.add(`${r.empresa}-${r.nota_fiscal}`));
    console.log(`   ✓ ${notasImportadas.size} notas já existem no histórico local.`);

    // 2. Conectar ao Supra e buscar TODAS as notas do mês/ano
    const supraPool = await getPool();
    if (!supraPool) throw new Error("Falha ao conectar no Supra SQL Server");

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
            p.classificacao_fiscal as classificacao,
            f.nome as fabricante,
            nfi.Unidade as unidade,
            nfil.lote_numero as lote,
            COALESCE(nfil.quantidade, nfi.quantidade) as quantidade,
            nfi.valor_unitario
        FROM nota_fiscal_venda nf
        JOIN nota_fiscal_venda_item nfi ON nfi.nf_numero = nf.codigo
        LEFT JOIN nota_fiscal_venda_item_lote nfil ON nfil.nfit_nf_numero = nfi.nf_numero AND nfil.nfit_codigo = nfi.codigo
        LEFT JOIN produto p ON nfi.prod_codigo = p.codigo
        LEFT JOIN cliente_fornecedor c ON nf.clifor_codigo = c.codigo
        LEFT JOIN cliente_fornecedor f ON p.fabr_codigo = f.codigo
        WHERE YEAR(nf.datahora_emissao_nfe) = @ano 
          AND MONTH(nf.datahora_emissao_nfe) = @mes
          AND nf.cfop_codigo IN (${CFOPS_VALIDOS.join(',')})
          AND nf.situacao = 2 -- 2: Concretizada / Faturada (Status Interno ERP Supra)
          AND (nf.id_situacao_nfe = 4 OR nf.id_situacao_nfe IS NULL) -- 4: Nota Transmitida/Autorizada na SEFAZ (Tratando NULL para notas legadas muito antigas se houver)
    `;

    const supraResult = await supraPool.request()
        .input('ano', sql.Int, ano)
        .input('mes', sql.Int, mes)
        .query(querySupra);

    const itensSupra = supraResult.recordset;
    console.log(`   ✓ ${itensSupra.length} itens de nota encontrados no Supra para ${mes}/${ano}.`);

    // 3. Filtrar e Processar itens NOVOS
    let novasInsercoes = 0;
    const pgClient = await pgPool.connect();

    try {
        await pgClient.query('BEGIN');

        for (const item of itensSupra) {
            const empresa = 'Nexomed'; // SGC is Nexomed
            const notaFiscal = item.numero_nota;
            
            // Pular se a nota já foi importada inteiramente
            if (notasImportadas.has(`${empresa}-${notaFiscal}`)) {
                continue;
            }

            const tipoNota = CFOP_DEVOLUCAO.includes(item.cfop_codigo) ? 'Devolução' : 'Venda';
            const multiplier = tipoNota === 'Devolução' ? -1 : 1;

            const qtd = (item.quantidade || 0) * multiplier;
            const valUnit = item.valor_unitario || 0;
            const valTotal = qtd * valUnit; // qtd já está com sinal

            // 4. Buscar custo via Cost Engine
            const custoUnitario = await findCusto(empresa, item.prod_codigo, item.lote);
            const custoTotal = qtd * custoUnitario; // qtd já está com sinal

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
                empresa, 
                notaFiscal, 
                item.codigo_cliente, 
                item.cliente || '(Não Informado)', 
                null, // cidade não está diretamente em cliente_fornecedor, vamos manter null por agora
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

        await pgClient.query('COMMIT');
        console.log(`   ✅ Sincronização concluída! ${novasInsercoes} novos itens inseridos.`);
        return { success: true, analisadas: itensSupra.length, inseridas: novasInsercoes };

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
