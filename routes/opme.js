const express = require('express');
const router = express.Router();
const pgPool = require('../db/pgConnection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbac');

// Middleware global: autenticação + permissão OPME
router.use(authMiddleware);
router.use(requirePermission('canViewOPME'));

// ==========================================
// GET /api/opme/contratos
// ==========================================
router.get('/contratos', async (req, res) => {
    try {
        const includeInactive = req.query.inativo === 'true';
        const whereClause = includeInactive ? '' : 'WHERE inativo = false';
        
        const result = await pgPool.query(`
            SELECT id, id_contrato, material, cod_cliente, cliente, uf, pregao, 
                   total_ata, inicio_ata, termino_ata, inativo
            FROM opme.contratos
            ${whereClause}
            ORDER BY id_contrato
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('[OPME] Erro ao buscar contratos:', err.message);
        res.status(500).json({ error: 'Erro ao buscar contratos' });
    }
});

// ==========================================
// GET /api/opme/cirurgias?contrato=BIO687
// ==========================================
router.get('/cirurgias', async (req, res) => {
    try {
        const { contrato } = req.query;
        let query = 'SELECT * FROM opme.cirurgias';
        const params = [];
        
        if (contrato) {
            query += ' WHERE contrato = $1';
            params.push(contrato);
        }
        query += ' ORDER BY id DESC';
        
        const result = await pgPool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('[OPME] Erro ao buscar cirurgias:', err.message);
        res.status(500).json({ error: 'Erro ao buscar cirurgias' });
    }
});

// ==========================================
// GET /api/opme/unidades?contrato=BIO687
// ==========================================
router.get('/unidades', async (req, res) => {
    try {
        const { contrato } = req.query;
        let query = 'SELECT * FROM opme.unidades';
        const params = [];
        
        if (contrato) {
            query += ' WHERE contrato = $1';
            params.push(contrato);
        }
        query += ' ORDER BY id';
        
        const result = await pgPool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('[OPME] Erro ao buscar unidades:', err.message);
        res.status(500).json({ error: 'Erro ao buscar unidades' });
    }
});

// ==========================================
// GET /api/opme/saldo-ata?contrato=BIO687
// ==========================================
router.get('/saldo-ata', async (req, res) => {
    try {
        const { contrato } = req.query;
        let query = 'SELECT * FROM opme.saldoata';
        const params = [];
        
        if (contrato) {
            query += ' WHERE contrato = $1';
            params.push(contrato);
        }
        query += ' ORDER BY id';
        
        const result = await pgPool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('[OPME] Erro ao buscar saldo ata:', err.message);
        res.status(500).json({ error: 'Erro ao buscar saldo ata' });
    }
});

// ==========================================
// GET /api/opme/saldo-ata-hospital?contrato=BIO687
// ==========================================
router.get('/saldo-ata-hospital', async (req, res) => {
    try {
        const { contrato } = req.query;
        let query = 'SELECT * FROM opme.saldoatahospital';
        const params = [];
        
        if (contrato) {
            query += ' WHERE contrato = $1';
            params.push(contrato);
        }
        query += ' ORDER BY id';
        
        const result = await pgPool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('[OPME] Erro ao buscar saldo ata hospital:', err.message);
        res.status(500).json({ error: 'Erro ao buscar saldo ata hospital' });
    }
});

// ==========================================
// GET /api/opme/banco-codigos?contrato=BIO687
// ==========================================
router.get('/banco-codigos', async (req, res) => {
    try {
        const { contrato } = req.query;
        let query = 'SELECT * FROM opme.bancocodigos';
        const params = [];
        
        if (contrato) {
            query += ' WHERE contrato = $1';
            params.push(contrato);
        }
        query += ' ORDER BY id';
        
        const result = await pgPool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('[OPME] Erro ao buscar banco de códigos:', err.message);
        res.status(500).json({ error: 'Erro ao buscar banco de códigos' });
    }
});

module.exports = router;
