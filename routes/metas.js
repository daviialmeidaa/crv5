const express = require('express');
const router = express.Router();
const pgPool = require('../db/pgConnection');
const { authMiddleware } = require('../middleware/authMiddleware');

// GET /api/metas - Buscar a meta atual
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await pgPool.query('SELECT valor_meta FROM metas_recebimento WHERE id = 1');
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.json({ valor_meta: 0 });
        }
    } catch (err) {
        console.error('Erro ao buscar metas:', err);
        res.status(500).json({ error: 'Erro ao buscar metas.' });
    }
});

// PUT /api/metas - Atualizar a meta (única)
router.put('/', authMiddleware, async (req, res) => {
    try {
        const { valor_meta } = req.body;

        if (valor_meta === undefined || valor_meta === null) {
            return res.status(400).json({ error: 'O campo valor_meta é obrigatório.' });
        }

        const result = await pgPool.query(
            `UPDATE metas_recebimento SET valor_meta = $1, updated_at = NOW() WHERE id = 1 RETURNING *`,
            [parseFloat(valor_meta)]
        );

        res.json(result.rows[0] || { valor_meta: parseFloat(valor_meta) });
    } catch (err) {
        console.error('Erro ao salvar meta:', err);
        res.status(500).json({ error: 'Erro ao salvar meta.' });
    }
});

module.exports = router;
