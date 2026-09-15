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

module.exports = router;
