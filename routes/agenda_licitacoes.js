const express = require('express');
const router = express.Router();
const supaPool = require('../db/supabaseConnection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbac');

// Middleware global da rota: Exige autenticação e permissão para visualizar Licitações (canViewLC)
router.use(authMiddleware);
router.use(requirePermission('canViewLC'));

// ==========================================
// GET /api/agenda_licitacoes
// Lista as agendas, filtrando pela empresa participante
// ==========================================
router.get('/', async (req, res) => {
    try {
        const { empresa } = req.query; // 'NEXOMED' ou 'BML'
        
        let query = `
            SELECT 
                "CHAVE",
                data_limite,
                hora_limite,
                data_lances,
                hora_lances,
                modalidade,
                pregao,
                orgao,
                uf,
                categoria,
                objeto,
                portal,
                empresa,
                data_cadastro,
                observacoes_status,
                antecedencia
            FROM agenda_licitacoes."AGENDA_LICITACOES"
        `;
        const values = [];

        if (empresa && (empresa.toUpperCase() === 'NEXOMED' || empresa.toUpperCase() === 'BML')) {
            query += ` WHERE UPPER(empresa) = $1`;
            values.push(empresa.toUpperCase());
        }

        query += ` ORDER BY "CHAVE" DESC`;

        const result = await supaPool.query(query, values);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro na API Agenda Licitações (GET /):', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ==========================================
// GET /api/agenda_licitacoes/:chave
// Busca uma agenda específica por CHAVE
// ==========================================
router.get('/:chave', async (req, res) => {
    try {
        const { chave } = req.params;

        const result = await supaPool.query(
            `SELECT * FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE" = $1`,
            [chave]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro na API Agenda Licitações (GET /:chave):', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ==========================================
// POST /api/agenda_licitacoes
// Cria um novo item na agenda
// ==========================================
router.post('/', async (req, res) => {
    try {
        const { 
            empresa, pregao, modalidade, orgao, uf, 
            categoria, objeto, portal, observacoes_status, 
            data_cadastro, data_limite, hora_limite, 
            data_lances, hora_lances, antecedencia 
        } = req.body;

        const query = `
            INSERT INTO agenda_licitacoes."AGENDA_LICITACOES" (
                empresa, pregao, modalidade, orgao, uf, 
                categoria, objeto, portal, observacoes_status, 
                data_cadastro, data_limite, hora_limite, 
                data_lances, hora_lances, antecedencia
            ) VALUES (
                $1, $2, $3, $4, $5, 
                $6, $7, $8, $9, 
                $10, $11, $12, 
                $13, $14, $15
            ) RETURNING *
        `;

        const values = [
            empresa, pregao, modalidade, orgao, uf,
            categoria, objeto, portal, observacoes_status,
            data_cadastro || null, data_limite || null, hora_limite || null,
            data_lances || null, hora_lances || null, antecedencia !== undefined ? antecedencia : null
        ];

        const result = await supaPool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro na API Agenda Licitações (POST /):', error);
        res.status(500).json({ error: 'Erro interno do servidor ao criar item' });
    }
});

// ==========================================
// PUT /api/agenda_licitacoes/:chave
// Atualiza um item da agenda
// ==========================================
router.put('/:chave', async (req, res) => {
    try {
        const { chave } = req.params;
        const { 
            empresa, pregao, modalidade, orgao, uf, 
            categoria, objeto, portal, observacoes_status, 
            data_cadastro, data_limite, hora_limite, 
            data_lances, hora_lances, antecedencia 
        } = req.body;

        const query = `
            UPDATE agenda_licitacoes."AGENDA_LICITACOES" SET
                empresa = $1, pregao = $2, modalidade = $3, orgao = $4, uf = $5,
                categoria = $6, objeto = $7, portal = $8, observacoes_status = $9,
                data_cadastro = $10, data_limite = $11, hora_limite = $12,
                data_lances = $13, hora_lances = $14, antecedencia = $15
            WHERE "CHAVE" = $16 RETURNING *
        `;

        const values = [
            empresa, pregao, modalidade, orgao, uf,
            categoria, objeto, portal, observacoes_status,
            data_cadastro || null, data_limite || null, hora_limite || null,
            data_lances || null, hora_lances || null, antecedencia !== undefined ? antecedencia : null,
            chave
        ];

        const result = await supaPool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item não encontrado para atualização' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro na API Agenda Licitações (PUT /:chave):', error);
        res.status(500).json({ error: 'Erro interno do servidor ao atualizar item' });
    }
});

// ==========================================
// DELETE /api/agenda_licitacoes/:chave
// Remove um item da agenda
// ==========================================
router.delete('/:chave', async (req, res) => {
    try {
        const { chave } = req.params;
        const result = await supaPool.query(
            `DELETE FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE" = $1 RETURNING *`,
            [chave]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item não encontrado para exclusão' });
        }
        
        res.json({ message: 'Item deletado com sucesso' });
    } catch (error) {
        console.error('Erro na API Agenda Licitações (DELETE /:chave):', error);
        res.status(500).json({ error: 'Erro interno do servidor ao deletar item' });
    }
});

module.exports = router;
