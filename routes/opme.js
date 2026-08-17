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
// PUT /api/opme/contratos/:id/status
// ==========================================
router.put('/contratos/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { inativo } = req.body;
        
        await pgPool.query(
            'UPDATE opme.contratos SET inativo = $1 WHERE id = $2',
            [inativo, id]
        );
        
        res.json({ success: true, message: 'Status do contrato atualizado com sucesso' });
    } catch (err) {
        console.error('[OPME] Erro ao atualizar status do contrato:', err.message);
        res.status(500).json({ error: 'Erro ao atualizar status do contrato' });
    }
});

// ==========================================
// GET /api/opme/kpis
// ==========================================
router.get('/kpis', async (req, res) => {
    try {
        const result = await pgPool.query(`
            SELECT 
                COUNT(DISTINCT c.paciente || c.data_cirurgia) FILTER (WHERE c.acao = 'CIRURGIA') AS cirurgias_realizadas,
                COUNT(DISTINCT c.paciente || c.data_cirurgia) FILTER (WHERE c.acao = 'CIRURGIA' AND (c.nota_fiscal IS NULL OR c.nota_fiscal = '' OR c.nota_fiscal = '0')) AS cirurgias_em_aberto,
                SUM(c.valor_total) FILTER (WHERE c.acao = 'CIRURGIA') AS total_cirurgias_realizadas,
                SUM(c.valor_total) FILTER (WHERE c.acao = 'CIRURGIA' AND (c.nota_fiscal IS NULL OR c.nota_fiscal = '' OR c.nota_fiscal = '0')) AS total_cirurgias_a_faturar
            FROM opme.cirurgias c
            JOIN opme.contratos ct ON c.contrato = ct.id_contrato
            WHERE ct.inativo = false;
        `);
        
        res.json(result.rows[0] || {
            cirurgias_realizadas: 0,
            cirurgias_em_aberto: 0,
            total_cirurgias_realizadas: 0,
            total_cirurgias_a_faturar: 0
        });
    } catch (err) {
        console.error('[OPME] Erro ao buscar KPIs:', err.message);
        res.status(500).json({ error: 'Erro ao buscar KPIs' });
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
