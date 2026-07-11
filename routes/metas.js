const express = require('express');
const router = express.Router();
const pgPool = require('../db/pgConnection');
const { authMiddleware } = require('../middleware/authMiddleware');

// GET /api/metas - Buscar todas as metas ou de um ano/mês específico
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { ano, mes } = req.query;
        let query = 'SELECT * FROM metas_recebimento';
        const params = [];

        if (ano && mes) {
            query += ' WHERE ano = $1 AND mes = $2';
            params.push(parseInt(ano), parseInt(mes));
        } else if (ano) {
            query += ' WHERE ano = $1';
            params.push(parseInt(ano));
        }

        query += ' ORDER BY ano DESC, mes DESC';

        const result = await pgPool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar metas:', err);
        res.status(500).json({ error: 'Erro ao buscar metas.' });
    }
});

// PUT /api/metas - Criar ou atualizar uma meta (UPSERT)
router.put('/', authMiddleware, async (req, res) => {
    try {
        const { ano, mes, valor_meta } = req.body;

        if (!ano || !mes || valor_meta === undefined || valor_meta === null) {
            return res.status(400).json({ error: 'Campos ano, mes e valor_meta são obrigatórios.' });
        }

        const result = await pgPool.query(
            `INSERT INTO metas_recebimento (ano, mes, valor_meta, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (ano, mes) DO UPDATE SET valor_meta = $3, updated_at = NOW()
             RETURNING *`,
            [parseInt(ano), parseInt(mes), parseFloat(valor_meta)]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao salvar meta:', err);
        res.status(500).json({ error: 'Erro ao salvar meta.' });
    }
});

module.exports = router;
