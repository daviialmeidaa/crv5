const express = require('express');
const router = express.Router();
const pgPool = require('../db/pgConnection');
const { runSync } = require('../services/syncService');
const { authMiddleware } = require('../middleware/authMiddleware');

// Rota para buscar os títulos salvos localmente
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await pgPool.query(`
            SELECT 
                t.*, 
                c.edital, 
                c.tipo_contrato, 
                c.classificacao 
            FROM titulos t
            LEFT JOIN contratos c ON t.contrato = c.codigo_contrato
            ORDER BY t.data_vencimento ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar títulos:', err);
        res.status(500).json({ error: 'Erro ao buscar dados locais.' });
    }
});

// Rota para forçar a sincronização com o Supra
router.post('/sync', authMiddleware, async (req, res) => {
    try {
        const syncResult = await runSync();
        res.json(syncResult);
    } catch (err) {
        console.error('Erro na rota de sync:', err);
        // Agora retornamos a mensagem real do erro para o front-end ajudar no debug
        res.status(500).json({ 
            error: err.message || 'Erro ao sincronizar com o Supra.',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

module.exports = router;
