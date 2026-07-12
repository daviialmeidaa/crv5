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

// Rota para forçar a sincronização com o Supra (Stream Chunked)
router.post('/sync', authMiddleware, async (req, res) => {
    // Configura os headers para manter a conexão aberta e enviar os dados aos pedaços
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    try {
        const syncResult = await runSync((progressData) => {
            // Envia cada atualização de progresso como uma linha JSON
            res.write(JSON.stringify({ type: 'progress', data: progressData }) + '\n');
        });
        
        // Envia o resultado final
        res.write(JSON.stringify({ type: 'complete', data: syncResult }) + '\n');
        res.end();
    } catch (err) {
        console.error('Erro na rota de sync:', err);
        res.write(JSON.stringify({ 
            type: 'error', 
            error: err.message || 'Erro ao sincronizar com o Supra.',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }) + '\n');
        res.end();
    }
});

module.exports = router;
