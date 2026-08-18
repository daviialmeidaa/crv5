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
        let whereClause = 'WHERE inativo = false';
        if (req.query.inativos_only === 'true') {
            whereClause = 'WHERE inativo = true';
        } else if (req.query.inativo === 'true') {
            whereClause = '';
        }
        
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
// ==========================================
// GET /api/opme/produto-info
// Busca informações no bancocodigos e saldoata
// ==========================================
router.get('/produto-info', async (req, res) => {
    try {
        const { cod_bio, contrato } = req.query;
        
        if (!cod_bio || !contrato) {
            return res.status(400).json({ error: 'Parâmetros cod_bio e contrato são obrigatórios.' });
        }

        const query = `
            SELECT 
                bc.classificacao,
                bc.produto,
                bc.descricao_personalizada,
                bc.item_ata,
                sa.valor_unitario
            FROM opme.bancocodigos bc
            LEFT JOIN opme.saldoata sa 
                ON bc.contrato = sa.contrato AND bc.item_ata = sa.item_ata
            WHERE bc.cod_bio = $1 AND bc.contrato = $2
            LIMIT 1
        `;

        const result = await pgPool.query(query, [cod_bio, contrato]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Código não encontrado no banco de códigos do contrato.' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[OPME] Erro ao buscar produto-info:', err.message);
        res.status(500).json({ error: 'Erro interno ao buscar informações do produto.' });
    }
});
// ==========================================
// POST /api/opme/cirurgias
// ==========================================
router.post('/cirurgias', async (req, res) => {
    const client = await pgPool.connect();
    try {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Payload inválido. Esperado array "items".' });
        }

        await client.query('BEGIN');

        for (const item of items) {
            const fields = [];
            const values = [];
            const placeholders = [];
            let i = 1;

            const insertColumns = [
                'contrato', 'acao', 'local_cirurgia', 'paciente', 'data_cirurgia', 
                'prontuario', 'medico', 'crm', 'cod_cliente', 'empenho', 'autorizacao', 
                'pedido', 'nota_fiscal', 'retorno_consignacao', 'status_expedicao', 
                'autorizacao_opme', 'cod_bio', 'classificacao', 'produto', 
                'descricao_personalizada', 'quantidade_utilizada', 'lote', 
                'valor_unitario', 'valor_total', 'item_pregao'
            ];

            for (const key of insertColumns) {
                if (item[key] !== undefined) {
                    fields.push(key);
                    placeholders.push(`$${i}`);
                    values.push(item[key] === '' ? null : item[key]);
                    i++;
                }
            }

            if (fields.length === 0) continue;

            const query = `INSERT INTO opme.cirurgias (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
            await client.query(query, values);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Cirurgia(s) criada(s) com sucesso' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[OPME] Erro ao criar cirurgias (POST):', err.message);
        res.status(500).json({ error: 'Erro ao criar cirurgias' });
    } finally {
        client.release();
    }
});
// ==========================================
// PUT /api/opme/cirurgias
// ==========================================
router.put('/cirurgias', async (req, res) => {
    const client = await pgPool.connect();
    try {
        const { items } = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Payload inválido. Esperado array "items".' });
        }

        await client.query('BEGIN');

        for (const item of items) {
            if (!item.id) continue; // Por ora, não inserimos novos, apenas damos update

            // Mapeando chaves do objeto para update
            const fields = [];
            const values = [];
            let i = 1;

            const updateableColumns = [
                'contrato', 'acao', 'local_cirurgia', 'paciente', 'data_cirurgia', 
                'prontuario', 'medico', 'crm', 'cod_cliente', 'empenho', 'autorizacao', 
                'pedido', 'nota_fiscal', 'retorno_consignacao', 'status_expedicao', 
                'autorizacao_opme', 'cod_bio', 'classificacao', 'produto', 
                'descricao_personalizada', 'quantidade_utilizada', 'lote', 
                'valor_unitario', 'valor_total'
            ];

            for (const key of updateableColumns) {
                if (item[key] !== undefined) {
                    fields.push(`${key} = $${i}`);
                    values.push(item[key] === '' ? null : item[key]);
                    i++;
                }
            }

            if (fields.length === 0) continue;

            const query = `UPDATE opme.cirurgias SET ${fields.join(', ')} WHERE id = $${i}`;
            values.push(item.id);

            await client.query(query, values);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Cirurgia(s) atualizada(s) com sucesso' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[OPME] Erro ao atualizar cirurgias (PUT):', err.message);
        res.status(500).json({ error: 'Erro ao atualizar cirurgias' });
    } finally {
        client.release();
    }
});

// ==========================================
// POST /api/opme/cirurgias/batch-delete
// ==========================================
router.post('/cirurgias/batch-delete', async (req, res) => {
    const client = await pgPool.connect();
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Array de IDs inválido ou vazio.' });
        }

        await client.query('BEGIN');

        // Proteção extra: a exclusão poderia exigir um role mais alto se controlássemos via middleware
        // Como o JS de frontend já bloqueia, vamos garantir a deleção via query segura
        const params = ids.map((_, idx) => `$${idx + 1}`).join(',');
        await client.query(`DELETE FROM opme.cirurgias WHERE id IN (${params})`, ids);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Itens da cirurgia excluídos com sucesso' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[OPME] Erro ao excluir cirurgias (DELETE):', err.message);
        res.status(500).json({ error: 'Erro ao excluir cirurgias' });
    } finally {
        client.release();
    }
});

module.exports = router;
