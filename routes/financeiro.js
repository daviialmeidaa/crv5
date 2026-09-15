/**
 * routes/financeiro.js
 * Rotas da API para o módulo Financeiro (Custos de Produtos).
 * 
 * GET  /api/financeiro/custos/resumo?ano=XXXX    → Totais gerais, mensais e trimestrais
 * GET  /api/financeiro/custos/nulos?ano=XXXX&mes=X → Registros com custo_unitario = 0
 * GET  /api/financeiro/custos/historico?ano=XXXX   → Histórico completo
 * PUT  /api/financeiro/custos/:id                  → Atualizar custo unitário manualmente
 */

const express = require('express');
const router = express.Router();
const pool = require('../db/pgConnection');
const { getCache, setCache, clearCache } = require('../db/redis');
const { syncAnoMes } = require('../services/sync_custos');

// =============================================================
// POST /api/financeiro/custos/sincronizar
// Dispara a sincronização Supra -> Postgres
// =============================================================
router.post('/custos/sincronizar', async (req, res) => {
    const { ano, mes } = req.body;
    if (!ano || !mes) {
        return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
    }

    try {
        const resultado = await syncAnoMes(parseInt(ano), parseInt(mes));
        
        // Limpar cache de totais do ano
        await clearCache(`financeiro:resumo:${ano}`);
        await clearCache(`financeiro:historico:${ano}`);
        
        res.json(resultado);
    } catch (error) {
        console.error('Erro na rota de sincronização:', error);
        res.status(500).json({ error: 'Erro interno na sincronização' });
    }
});

// =============================================================
// GET /api/financeiro/custos/sincronizar/stream
// Dispara a sincronização e retorna progresso via SSE
// =============================================================
router.get('/custos/sincronizar/stream', async (req, res) => {
    const { ano, mes } = req.query;
    
    // Headers necessários para Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Envia os headers imediatamente

    if (!ano || !mes) {
        res.write(`data: ${JSON.stringify({ error: 'Ano e mês são obrigatórios' })}\n\n`);
        return res.end();
    }

    const onProgress = (data) => {
        const payload = typeof data === 'object' ? data : { message: data };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
        const resultado = await syncAnoMes(parseInt(ano), parseInt(mes), onProgress);
        
        // Limpar cache após sucesso
        await clearCache(`financeiro:resumo:${ano}`);
        await clearCache(`financeiro:historico:${ano}`);
        
        // Envia o resultado final
        res.write(`data: ${JSON.stringify({ done: true, result: resultado })}\n\n`);
    } catch (error) {
        console.error('Erro na sincronização stream:', error);
        res.write(`data: ${JSON.stringify({ error: error.message || 'Erro interno' })}\n\n`);
    } finally {
        res.end();
    }
});

// =============================================================
// GET /api/financeiro/custos/resumo?ano=2025
// Retorna totais gerais, mensais e trimestrais para o ano selecionado
// =============================================================
router.get('/custos/resumo', async (req, res) => {
    const ano = parseInt(req.query.ano) || new Date().getFullYear();
    const cacheKey = `financeiro:resumo:${ano}`;

    try {
        // Tentar cache
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        // --- Totais Gerais ---
        const totaisResult = await pool.query(`
            SELECT 
                empresa,
                SUM(CASE WHEN tipo_nota = 'VENDA' THEN valor_total ELSE 0 END) as vendas,
                SUM(CASE WHEN tipo_nota = 'DEVOLUÇÃO RETORNO DE VENDA' THEN valor_total ELSE 0 END) as devolvidas,
                SUM(CASE WHEN tipo_nota = 'VENDA' THEN custo_total ELSE 0 END) as custos,
                SUM(CASE WHEN tipo_nota = 'DEVOLUÇÃO RETORNO DE VENDA' THEN custo_total ELSE 0 END) as custos_dev
            FROM financeiro.vendas_custos
            WHERE EXTRACT(YEAR FROM data_emissao) = $1
            GROUP BY empresa
        `, [ano]);

        const totaisGerais = { nexo: { vendas: 0, devolvidas: 0, custos: 0, custosDev: 0 }, bml: { vendas: 0, devolvidas: 0, custos: 0, custosDev: 0 } };
        for (const row of totaisResult.rows) {
            const key = row.empresa === 'Nexomed' ? 'nexo' : 'bml';
            totaisGerais[key] = {
                vendas: parseFloat(row.vendas) || 0,
                devolvidas: parseFloat(row.devolvidas) || 0,
                custos: parseFloat(row.custos) || 0,
                custosDev: parseFloat(row.custos_dev) || 0,
            };
        }

        // --- Totais Mensais ---
        const mensaisResult = await pool.query(`
            SELECT 
                empresa,
                EXTRACT(MONTH FROM data_emissao)::int as mes,
                SUM(CASE WHEN tipo_nota = 'VENDA' THEN valor_total ELSE 0 END) as vendas,
                SUM(CASE WHEN tipo_nota = 'DEVOLUÇÃO RETORNO DE VENDA' THEN valor_total ELSE 0 END) as devolvidas,
                SUM(CASE WHEN tipo_nota = 'VENDA' THEN custo_total ELSE 0 END) as custos,
                SUM(CASE WHEN tipo_nota = 'DEVOLUÇÃO RETORNO DE VENDA' THEN custo_total ELSE 0 END) as custos_dev
            FROM financeiro.vendas_custos
            WHERE EXTRACT(YEAR FROM data_emissao) = $1
            GROUP BY empresa, mes
            ORDER BY empresa, mes
        `, [ano]);

        // Montar arrays 1-12
        const mensais = { nexo: Array(12).fill(null).map(() => ({ vendas: 0, devolvidas: 0, custos: 0, custosDev: 0 })), bml: Array(12).fill(null).map(() => ({ vendas: 0, devolvidas: 0, custos: 0, custosDev: 0 })) };
        for (const row of mensaisResult.rows) {
            const key = row.empresa === 'Nexomed' ? 'nexo' : 'bml';
            const idx = row.mes - 1;
            mensais[key][idx] = {
                vendas: parseFloat(row.vendas) || 0,
                devolvidas: parseFloat(row.devolvidas) || 0,
                custos: parseFloat(row.custos) || 0,
                custosDev: parseFloat(row.custos_dev) || 0,
            };
        }

        // --- Totais Trimestrais ---
        const trimestraisResult = await pool.query(`
            SELECT 
                empresa,
                EXTRACT(QUARTER FROM data_emissao)::int as trimestre,
                SUM(CASE WHEN tipo_nota = 'VENDA' THEN valor_total ELSE 0 END) as vendas,
                SUM(CASE WHEN tipo_nota = 'DEVOLUÇÃO RETORNO DE VENDA' THEN valor_total ELSE 0 END) as devolvidas,
                SUM(CASE WHEN tipo_nota = 'VENDA' THEN custo_total ELSE 0 END) as custos,
                SUM(CASE WHEN tipo_nota = 'DEVOLUÇÃO RETORNO DE VENDA' THEN custo_total ELSE 0 END) as custos_dev
            FROM financeiro.vendas_custos
            WHERE EXTRACT(YEAR FROM data_emissao) = $1
            GROUP BY empresa, trimestre
            ORDER BY empresa, trimestre
        `, [ano]);

        const trimestrais = { nexo: Array(4).fill(null).map(() => ({ vendas: 0, devolvidas: 0, custos: 0, custosDev: 0 })), bml: Array(4).fill(null).map(() => ({ vendas: 0, devolvidas: 0, custos: 0, custosDev: 0 })) };
        for (const row of trimestraisResult.rows) {
            const key = row.empresa === 'Nexomed' ? 'nexo' : 'bml';
            const idx = row.trimestre - 1;
            trimestrais[key][idx] = {
                vendas: parseFloat(row.vendas) || 0,
                devolvidas: parseFloat(row.devolvidas) || 0,
                custos: parseFloat(row.custos) || 0,
                custosDev: parseFloat(row.custos_dev) || 0,
            };
        }

        const result = { totaisGerais, mensais, trimestrais };
        await setCache(cacheKey, result, 3600);
        res.json(result);

    } catch (err) {
        console.error('Erro ao buscar resumo de custos:', err.message);
        res.status(500).json({ error: 'Erro interno ao buscar resumo.' });
    }
});

// =============================================================
// GET /api/financeiro/custos/nulos?ano=2025&mes=3
// Retorna registros onde custo_unitario = 0
// =============================================================
router.get('/custos/nulos', async (req, res) => {
    const ano = parseInt(req.query.ano) || new Date().getFullYear();
    const mes = req.query.mes ? parseInt(req.query.mes) : null;

    try {
        let query = `
            SELECT id, empresa, nota_fiscal, cliente, cod_produto, produto, lote, classificacao, fabricante, quantidade, valor_unitario, valor_total, custo_unitario, custo_total, data_emissao, tipo_nota
            FROM financeiro.vendas_custos
            WHERE (custo_unitario = 0 OR custo_unitario IS NULL)
            AND EXTRACT(YEAR FROM data_emissao) = $1
        `;
        const params = [ano];

        if (mes) {
            query += ` AND EXTRACT(MONTH FROM data_emissao) = $2`;
            params.push(mes);
        }

        query += ` ORDER BY nota_fiscal DESC, cod_produto`;

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (err) {
        console.error('Erro ao buscar custos nulos:', err.message);
        res.status(500).json({ error: 'Erro interno ao buscar custos nulos.' });
    }
});

// =============================================================
// GET /api/financeiro/custos/historico?ano=2025
// Retorna todo o histórico de vendas_custos do ano
// =============================================================
router.get('/custos/historico', async (req, res) => {
    // Retiramos o limite de ano para exibir todo o histórico
    const cacheKey = `financeiro:historico:all`;

    try {
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const result = await pool.query(`
            SELECT id, empresa, nota_fiscal, tipo_nota, cliente, cidade, uf, cod_produto, produto, lote, classificacao, fabricante, unidade, quantidade, valor_unitario, valor_total, custo_unitario, custo_total, data_emissao
            FROM financeiro.vendas_custos
            ORDER BY data_emissao DESC, nota_fiscal DESC
        `);

        await setCache(cacheKey, result.rows, 3600);
        res.json(result.rows);

    } catch (err) {
        console.error('Erro ao buscar histórico:', err.message);
        res.status(500).json({ error: 'Erro interno ao buscar histórico.' });
    }
});

// =============================================================
// PUT /api/financeiro/custos/:id
// Atualiza o custo unitário de um registro (input manual)
// =============================================================
router.put('/custos/save-batch', async (req, res) => {
    const { id, custo_unitario } = req.body;

    if (custo_unitario === undefined || custo_unitario === null || !id) {
        return res.status(400).json({ error: 'Dados insuficientes. Exige id e custo_unitario.' });
    }

    const custoNum = parseFloat(custo_unitario);
    if (isNaN(custoNum)) {
        return res.status(400).json({ error: 'custo_unitario deve ser um número válido.' });
    }

    try {
        let query = `
            UPDATE financeiro.vendas_custos
            SET custo_unitario = $1,
                custo_total = quantidade * $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING id, custo_unitario, custo_total
        `;
        let params = [custoNum, id];

        const result = await pool.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Nenhum registro encontrado para atualizar.' });
        }

        // Limpar caches (nulos, resumo, historico)
        const currentYear = new Date().getFullYear();
        await clearCache(`financeiro:historico:all`);
        for (let y = 2023; y <= currentYear + 1; y++) {
            await clearCache(`financeiro:resumo:${y}`);
            for(let m = 1; m <= 12; m++) {
                await clearCache(`financeiro:custos_nulos:${y}:${m}`);
            }
        }

        res.json({ success: true, count: result.rowCount, data: result.rows });

    } catch (err) {
        console.error('Erro ao atualizar custo:', err.message);
        res.status(500).json({ error: 'Erro interno ao atualizar custo.' });
    }
});


// POST /api/financeiro/custos/email-contabilidade
const nodemailer = require('nodemailer');
const xlsx = require('xlsx');

function formatCurrency(value) {
    const num = parseFloat(value) || 0;
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const formatted = absNum.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return isNegative ? `(R$ ${formatted})` : `R$ ${formatted}`;
}

function padRight(str, length) {
    return (str + ' '.repeat(length)).substring(0, length);
}

function padLeft(str, length) {
    return (' '.repeat(length) + str).slice(-length);
}

router.post('/custos/email-contabilidade', async (req, res) => {
    try {
        const { to, cc, year } = req.body;
        if (!to || !year) {
            return res.status(400).json({ error: 'Destinatário (to) e Ano (year) são obrigatórios.' });
        }

        // 1. Fetch RAW data for the year
        const query = `
            SELECT 
                empresa, nota_fiscal, codigo_cliente, cliente, cidade, uf, 
                TO_CHAR(data_emissao, 'DD/MM/YYYY') as data_emissao, tipo_nota,
                cod_produto, produto, lote, classificacao, fabricante, unidade,
                quantidade, valor_unitario, valor_total, custo_unitario, custo_total,
                data_emissao as data_raw

            FROM financeiro.vendas_custos
            WHERE EXTRACT(YEAR FROM data_emissao) = $1
            ORDER BY data_emissao ASC, empresa, nota_fiscal
        `;
        const result = await pool.query(query, [year]);
        const data = result.rows;

        // 2. Calculate Totals for the TXT report
        let vNexo = 0, vdNexo = 0, cNexo = 0, cdNexo = 0;
        let vBml = 0, vdBml = 0, cBml = 0, cdBml = 0;

        const mensais = {
            nexo: Array(12).fill(null).map(() => ({ v: 0, vd: 0, c: 0, cd: 0 })),
            bml: Array(12).fill(null).map(() => ({ v: 0, vd: 0, c: 0, cd: 0 }))
        };

        const trimestrais = {
            nexo: Array(4).fill(null).map(() => ({ v: 0, vd: 0, c: 0, cd: 0 })),
            bml: Array(4).fill(null).map(() => ({ v: 0, vd: 0, c: 0, cd: 0 }))
        };

        for (const row of data) {
            const isNexo = row.empresa.toUpperCase() === 'NEXOMED';
            const isBml = row.empresa.toUpperCase() === 'BML';
            const isVenda = row.tipo_nota === 'VENDA';
            const isDevolucao = row.tipo_nota === 'DEVOLUÇÃO RETORNO DE VENDA';
            
            const valorTotal = Math.abs(parseFloat(row.valor_total) || 0);
            const custoTotal = Math.abs(parseFloat(row.custo_total) || 0);
            // Garantir que a data pura seja usada para matemática (evitando bug de UTC-3 Node vs Postgres)
            const dataEmissao = new Date(row.data_raw);
            const mesIndex = dataEmissao.getUTCMonth(); // 0-11
            const trimIndex = Math.floor(mesIndex / 3); // 0-3
            
            if (isNexo) {
                if (isVenda) { 
                    vNexo += valorTotal; cNexo += custoTotal; 
                    mensais.nexo[mesIndex].v += valorTotal; mensais.nexo[mesIndex].c += custoTotal;
                    trimestrais.nexo[trimIndex].v += valorTotal; trimestrais.nexo[trimIndex].c += custoTotal;
                }
                if (isDevolucao) { 
                    vdNexo += valorTotal; cdNexo += custoTotal; 
                    mensais.nexo[mesIndex].vd += valorTotal; mensais.nexo[mesIndex].cd += custoTotal;
                    trimestrais.nexo[trimIndex].vd += valorTotal; trimestrais.nexo[trimIndex].cd += custoTotal;
                }
            } else if (isBml) {
                if (isVenda) { 
                    vBml += valorTotal; cBml += custoTotal; 
                    mensais.bml[mesIndex].v += valorTotal; mensais.bml[mesIndex].c += custoTotal;
                    trimestrais.bml[trimIndex].v += valorTotal; trimestrais.bml[trimIndex].c += custoTotal;
                }
                if (isDevolucao) { 
                    vdBml += valorTotal; cdBml += custoTotal; 
                    mensais.bml[mesIndex].vd += valorTotal; mensais.bml[mesIndex].cd += custoTotal;
                    trimestrais.bml[trimIndex].vd += valorTotal; trimestrais.bml[trimIndex].cd += custoTotal;
                }
            }
        }

        const vTot = vNexo + vBml;
        const vdTot = vdNexo + vdBml;
        const cTot = cNexo + cBml;
        const cdTot = cdNexo + cdBml;

        const totalNexo = (vNexo - vdNexo) - (cNexo - cdNexo);
        const totalBml = (vBml - vdBml) - (cBml - cdBml);
        const totalGeral = totalNexo + totalBml;

        // 3. Generate TXT Content (Dot-Matrix Style)
        let txt = `===========================================================================================\n`;
        txt += `               RELATORIO DE CUSTOS E VENDAS - ANO ${year}\n`;
        txt += `===========================================================================================\n`;
        txt += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;
        
        // TOTAIS GERAIS
        txt += `[ TOTAIS GERAIS ]\n`;
        txt += `-------------------------------------------------------------------------------------------\n`;
        txt += `${padRight('DESCRICAO', 25)} | ${padLeft('NEXOMED', 16)} | ${padLeft('BML', 16)} | ${padLeft('TOTAL', 16)}\n`;
        txt += `-------------------------------------------------------------------------------------------\n`;
        txt += `${padRight('Vendas', 25)} | ${padLeft(formatCurrency(vNexo), 16)} | ${padLeft(formatCurrency(vBml), 16)} | ${padLeft(formatCurrency(vTot), 16)}\n`;
        txt += `${padRight('Vendas Devolvidas', 25)} | ${padLeft(formatCurrency(-vdNexo), 16)} | ${padLeft(formatCurrency(-vdBml), 16)} | ${padLeft(formatCurrency(-vdTot), 16)}\n`;
        txt += `${padRight('Custos', 25)} | ${padLeft(formatCurrency(cNexo), 16)} | ${padLeft(formatCurrency(cBml), 16)} | ${padLeft(formatCurrency(cTot), 16)}\n`;
        txt += `${padRight('Custos Devolvidos', 25)} | ${padLeft(formatCurrency(-cdNexo), 16)} | ${padLeft(formatCurrency(-cdBml), 16)} | ${padLeft(formatCurrency(-cdTot), 16)}\n`;
        txt += `-------------------------------------------------------------------------------------------\n`;
        txt += `${padRight('LUCRO BRUTO', 25)} | ${padLeft(formatCurrency(totalNexo), 16)} | ${padLeft(formatCurrency(totalBml), 16)} | ${padLeft(formatCurrency(totalGeral), 16)}\n`;
        txt += `===========================================================================================\n\n`;
        
        const mesesNomes = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
        
        // TOTAIS MENSAIS NEXOMED
        txt += `[ TOTAIS MENSAIS - NEXOMED ]\n`;
        txt += `------------------------------------------------------------------------------------------------------\n`;
        txt += `${padRight('MES', 4)} | ${padLeft('VENDAS', 16)} | ${padLeft('DEVOLUCOES', 16)} | ${padLeft('CUSTOS', 16)} | ${padLeft('CUSTOS DEV', 16)} | ${padLeft('LUCRO', 16)}\n`;
        txt += `------------------------------------------------------------------------------------------------------\n`;
        for (let i=0; i<12; i++) {
            const m = mensais.nexo[i];
            const lb = (m.v - m.vd) - (m.c - m.cd);
            txt += `${padRight(mesesNomes[i], 4)} | ${padLeft(formatCurrency(m.v), 16)} | ${padLeft(formatCurrency(-m.vd), 16)} | ${padLeft(formatCurrency(m.c), 16)} | ${padLeft(formatCurrency(-m.cd), 16)} | ${padLeft(formatCurrency(lb), 16)}\n`;
        }
        txt += `======================================================================================================\n\n`;

        // TOTAIS MENSAIS BML
        txt += `[ TOTAIS MENSAIS - BML ]\n`;
        txt += `------------------------------------------------------------------------------------------------------\n`;
        txt += `${padRight('MES', 4)} | ${padLeft('VENDAS', 16)} | ${padLeft('DEVOLUCOES', 16)} | ${padLeft('CUSTOS', 16)} | ${padLeft('CUSTOS DEV', 16)} | ${padLeft('LUCRO', 16)}\n`;
        txt += `------------------------------------------------------------------------------------------------------\n`;
        for (let i=0; i<12; i++) {
            const m = mensais.bml[i];
            const lb = (m.v - m.vd) - (m.c - m.cd);
            txt += `${padRight(mesesNomes[i], 4)} | ${padLeft(formatCurrency(m.v), 16)} | ${padLeft(formatCurrency(-m.vd), 16)} | ${padLeft(formatCurrency(m.c), 16)} | ${padLeft(formatCurrency(-m.cd), 16)} | ${padLeft(formatCurrency(lb), 16)}\n`;
        }
        txt += `======================================================================================================\n\n`;

        // TOTAIS TRIMESTRAIS NEXOMED
        txt += `[ TOTAIS TRIMESTRAIS - NEXOMED ]\n`;
        txt += `------------------------------------------------------------------------------------------------------\n`;
        txt += `${padRight('TRIM', 4)} | ${padLeft('VENDAS', 16)} | ${padLeft('DEVOLUCOES', 16)} | ${padLeft('CUSTOS', 16)} | ${padLeft('CUSTOS DEV', 16)} | ${padLeft('LUCRO', 16)}\n`;
        txt += `------------------------------------------------------------------------------------------------------\n`;
        for (let i=0; i<4; i++) {
            const t = trimestrais.nexo[i];
            const lb = (t.v - t.vd) - (t.c - t.cd);
            txt += `${padRight(String(i+1)+'T', 4)} | ${padLeft(formatCurrency(t.v), 16)} | ${padLeft(formatCurrency(-t.vd), 16)} | ${padLeft(formatCurrency(t.c), 16)} | ${padLeft(formatCurrency(-t.cd), 16)} | ${padLeft(formatCurrency(lb), 16)}\n`;
        }
        txt += `======================================================================================================\n\n`;

        // TOTAIS TRIMESTRAIS BML
        txt += `[ TOTAIS TRIMESTRAIS - BML ]\n`;
        txt += `------------------------------------------------------------------------------------------------------\n`;
        txt += `${padRight('TRIM', 4)} | ${padLeft('VENDAS', 16)} | ${padLeft('DEVOLUCOES', 16)} | ${padLeft('CUSTOS', 16)} | ${padLeft('CUSTOS DEV', 16)} | ${padLeft('LUCRO', 16)}\n`;
        txt += `------------------------------------------------------------------------------------------------------\n`;
        for (let i=0; i<4; i++) {
            const t = trimestrais.bml[i];
            const lb = (t.v - t.vd) - (t.c - t.cd);
            txt += `${padRight(String(i+1)+'T', 4)} | ${padLeft(formatCurrency(t.v), 16)} | ${padLeft(formatCurrency(-t.vd), 16)} | ${padLeft(formatCurrency(t.c), 16)} | ${padLeft(formatCurrency(-t.cd), 16)} | ${padLeft(formatCurrency(lb), 16)}\n`;
        }
        txt += `======================================================================================================\n\n`;

        txt += `FIM DO RELATORIO.\n`;

        // 4. Generate Excel Buffer (cleaning up internal data_raw before export)
        const dataParaExcel = data.map(r => {
            const { data_raw, ...resto } = r;
            const isDevolucao = r.tipo_nota === 'DEVOLUÇÃO RETORNO DE VENDA';
            
            const parseMoney = (val) => {
                let n = Math.abs(parseFloat(val) || 0);
                return isDevolucao ? -n : n;
            };

            resto.quantidade = Math.abs(parseFloat(resto.quantidade) || 0);
            if (isDevolucao) resto.quantidade = -resto.quantidade;

            resto.valor_unitario = parseMoney(resto.valor_unitario);
            resto.valor_total = parseMoney(resto.valor_total);
            resto.custo_unitario = parseMoney(resto.custo_unitario);
            resto.custo_total = parseMoney(resto.custo_total);

            return resto;
        });

        const ws = xlsx.utils.json_to_sheet(dataParaExcel);
        
        // Aplicar formatação contábil (negativos com parênteses) nas colunas de valores
        const range = xlsx.utils.decode_range(ws['!ref']);
        const moneyFormat = '#,##0.00;(#,##0.00)';
        
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const headerRef = xlsx.utils.encode_cell({c: C, r: 0});
            const headerName = ws[headerRef] ? ws[headerRef].v : '';
            const isMoney = ['valor_unitario', 'valor_total', 'custo_unitario', 'custo_total'].includes(headerName);
            
            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                const cellRef = xlsx.utils.encode_cell({c: C, r: R});
                if (ws[cellRef] && ws[cellRef].t === 'n' && isMoney) {
                    ws[cellRef].z = moneyFormat;
                }
            }
        }

        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, `Custos_${year}`);
        const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // 5. Send Email via Nodemailer
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'sh-pro76.hostgator.com.br',
            port: process.env.SMTP_PORT || 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER || 'hub@nexomed.com.br',
                pass: process.env.SMTP_PASSWORD
            },
            name: 'nexomed.com.br',
            tls: {
                rejectUnauthorized: false
            }
        });

        const emailHtml = `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px; margin: 0;">
                <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header with Logo -->
                    <div style="background-color: #111827; padding: 24px 32px; text-align: center; border-bottom: 4px solid #0097A7;">
                        <img src="https://hub.nexomed.com.br/assets/images/logo.png" alt="Nexomed" style="height: 32px; display: inline-block; outline: none; text-decoration: none;">
                    </div>

                    <!-- Content -->
                    <div style="padding: 40px 32px;">
                        <h1 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.3;">
                            Fechamento de Custos e Vendas
                        </h1>
                        <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                            Olá.<br><br>
                            Seguem em anexo os relatórios de fechamento de custos atualizados referentes ao ano de <strong>${year}</strong>.
                        </p>
                        
                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                            <h3 style="color: #334155; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">Arquivos Anexos:</h3>
                            <ul style="color: #475569; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.6;">
                                <li><strong>Resumo_Custos_${year}.txt</strong>: Relatório estruturado com os totais anuais, mensais e trimestrais.</li>
                                <li><strong>Base_Custos_${year}.xlsx</strong>: Planilha de dados brutos com todas as notas fiscais e custos unificados.</li>
                            </ul>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">
                            © ${new Date().getFullYear()} Nexomed. Todos os direitos reservados.<br>
                            Esta é uma mensagem automática. Por favor, não responda.
                        </p>
                    </div>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"HUB - Nexomed" <${process.env.SMTP_USER || 'hub@nexomed.com.br'}>`,
            to: to,
            cc: cc || '',
            subject: `Custos atualizados Nexomed/BML - Ano ${year}`,
            html: emailHtml,
            attachments: [
                {
                    filename: `Resumo_Custos_${year}.txt`,
                    content: txt,
                    contentType: 'text/plain'
                },
                {
                    filename: `Base_Custos_${year}.xlsx`,
                    content: excelBuffer,
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            ]
        };

        await transporter.sendMail(mailOptions);

        return res.json({ success: true, message: 'E-mail enviado com sucesso.' });

    } catch (err) {
        console.error('Erro ao enviar e-mail de contabilidade:', err);
        return res.status(500).json({ error: 'Erro interno ao disparar e-mail: ' + err.message });
    }
});

module.exports = router;
