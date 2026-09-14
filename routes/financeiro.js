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
                SUM(CASE WHEN tipo_nota NOT ILIKE '%DEVOLU%' THEN valor_total ELSE 0 END) as vendas,
                SUM(CASE WHEN tipo_nota ILIKE '%DEVOLU%' THEN valor_total ELSE 0 END) as devolvidas,
                SUM(CASE WHEN tipo_nota NOT ILIKE '%DEVOLU%' THEN custo_total ELSE 0 END) as custos,
                SUM(CASE WHEN tipo_nota ILIKE '%DEVOLU%' THEN custo_total ELSE 0 END) as custos_dev
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
                SUM(CASE WHEN tipo_nota NOT ILIKE '%DEVOLU%' THEN valor_total ELSE 0 END) as vendas,
                SUM(CASE WHEN tipo_nota ILIKE '%DEVOLU%' THEN valor_total ELSE 0 END) as devolvidas,
                SUM(CASE WHEN tipo_nota NOT ILIKE '%DEVOLU%' THEN custo_total ELSE 0 END) as custos,
                SUM(CASE WHEN tipo_nota ILIKE '%DEVOLU%' THEN custo_total ELSE 0 END) as custos_dev
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
                SUM(CASE WHEN tipo_nota NOT ILIKE '%DEVOLU%' THEN valor_total ELSE 0 END) as vendas,
                SUM(CASE WHEN tipo_nota ILIKE '%DEVOLU%' THEN valor_total ELSE 0 END) as devolvidas,
                SUM(CASE WHEN tipo_nota NOT ILIKE '%DEVOLU%' THEN custo_total ELSE 0 END) as custos,
                SUM(CASE WHEN tipo_nota ILIKE '%DEVOLU%' THEN custo_total ELSE 0 END) as custos_dev
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
            SELECT id, empresa, nota_fiscal, cliente, cod_produto, produto, lote, classificacao, fabricante, quantidade, valor_unitario, valor_total, custo_unitario
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
    const ano = parseInt(req.query.ano) || new Date().getFullYear();
    const cacheKey = `financeiro:historico:${ano}`;

    try {
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const result = await pool.query(`
            SELECT id, empresa, nota_fiscal, tipo_nota, cliente, cidade, uf, cod_produto, produto, lote, classificacao, fabricante, unidade, quantidade, valor_unitario, valor_total, custo_unitario, custo_total, data_emissao
            FROM financeiro.vendas_custos
            WHERE EXTRACT(YEAR FROM data_emissao) = $1
            ORDER BY data_emissao DESC, nota_fiscal DESC
        `, [ano]);

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
router.put('/custos/:id', async (req, res) => {
    const { id } = req.params;
    const { custo_unitario } = req.body;

    if (custo_unitario === undefined || custo_unitario === null) {
        return res.status(400).json({ error: 'custo_unitario é obrigatório.' });
    }

    const custoNum = parseFloat(custo_unitario);
    if (isNaN(custoNum)) {
        return res.status(400).json({ error: 'custo_unitario deve ser um número válido.' });
    }

    try {
        const result = await pool.query(`
            UPDATE financeiro.vendas_custos
            SET custo_unitario = $1,
                custo_total = quantidade * $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING id, custo_unitario, custo_total
        `, [custoNum, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Registro não encontrado.' });
        }

        // Limpar caches para todos os anos possíveis
        const currentYear = new Date().getFullYear();
        for (let y = 2023; y <= currentYear; y++) {
            await clearCache(`financeiro:resumo:${y}`);
            await clearCache(`financeiro:historico:${y}`);
        }

        res.json({ success: true, data: result.rows[0] });

    } catch (err) {
        console.error('Erro ao atualizar custo:', err.message);
        res.status(500).json({ error: 'Erro interno ao atualizar custo.' });
    }
});

module.exports = router;
