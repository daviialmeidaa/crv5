const express = require('express');
const router = express.Router();
const pgPool = require('../db/pgConnection');

// POST: /api/contratos/nexomed-insere-contrato
router.post('/nexomed-insere-contrato', async (req, res) => {
    try {
        const { codigo_contrato, edital, tipo_contrato, classificacao } = req.body;
        if (!codigo_contrato) return res.status(400).json({ error: 'codigo_contrato obrigatório' });

        await pgPool.query(`
            INSERT INTO contratos (codigo_contrato, empresa, edital, tipo_contrato, classificacao)
            VALUES ($1, 'Nexomed', $2, $3, $4)
            ON CONFLICT (codigo_contrato) DO NOTHING;
        `, [codigo_contrato, edital || '', tipo_contrato || '', classificacao || '']);

        res.status(200).json({ message: 'Inserido Nexomed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST: /api/contratos/bml-insere-contrato
router.post('/bml-insere-contrato', async (req, res) => {
    try {
        const { codigo_contrato, edital, tipo_contrato, classificacao } = req.body;
        if (!codigo_contrato) return res.status(400).json({ error: 'codigo_contrato obrigatório' });

        await pgPool.query(`
            INSERT INTO contratos (codigo_contrato, empresa, edital, tipo_contrato, classificacao)
            VALUES ($1, 'BML', $2, $3, $4)
            ON CONFLICT (codigo_contrato) DO NOTHING;
        `, [codigo_contrato, edital || '', tipo_contrato || '', classificacao || '']);

        res.status(200).json({ message: 'Inserido BML' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT: /api/contratos/nexomed-atualiza-contrato
router.put('/nexomed-atualiza-contrato', async (req, res) => {
    try {
        const { codigo_contrato, edital, tipo_contrato, classificacao } = req.body;
        if (!codigo_contrato) return res.status(400).json({ error: 'codigo_contrato obrigatório' });

        await pgPool.query(`
            UPDATE contratos 
            SET edital = $1, tipo_contrato = $2, classificacao = $3, updated_at = CURRENT_TIMESTAMP
            WHERE codigo_contrato = $4 AND empresa = 'Nexomed'
        `, [edital || '', tipo_contrato || '', classificacao || '', codigo_contrato]);

        res.status(200).json({ message: 'Atualizado Nexomed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT: /api/contratos/bml-atualiza-contrato
router.put('/bml-atualiza-contrato', async (req, res) => {
    try {
        const { codigo_contrato, edital, tipo_contrato, classificacao } = req.body;
        if (!codigo_contrato) return res.status(400).json({ error: 'codigo_contrato obrigatório' });

        await pgPool.query(`
            UPDATE contratos 
            SET edital = $1, tipo_contrato = $2, classificacao = $3, updated_at = CURRENT_TIMESTAMP
            WHERE codigo_contrato = $4 AND empresa = 'BML'
        `, [edital || '', tipo_contrato || '', classificacao || '', codigo_contrato]);

        res.status(200).json({ message: 'Atualizado BML' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
