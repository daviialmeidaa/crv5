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

// Outros métodos CRUD podem ser adicionados aqui (POST, PUT, DELETE) para o modal de 'Novo Item'

module.exports = router;
