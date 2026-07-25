const express = require('express');
const router = express.Router();
const supaPool = require('../db/supabaseConnection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbac');

// Middleware global da rota: Exige autenticação e permissão para visualizar itens arrematados
router.use(authMiddleware);
router.use(requirePermission('canViewLC'));

// ==========================================
// GET /api/itens_arrematados
// Lista todos os itens (IA_BML + IA_NEXOMED)
// ==========================================
router.get('/', async (req, res) => {
    try {
        const { participante } = req.query;
        
        let table = 'itens_arrematados."IA_NEXOMED"';
        if (participante === 'BML') {
            table = 'itens_arrematados."IA_BML"';
        }
        
        const result = await supaPool.query(`
            SELECT 
                "CHAVE",
                "COD_CONTRATO_CONCAT",
                "COD_CONTRATO",
                "ORGAO",
                "MUNICIPIO",
                "UF",
                "PARTICIPANTE",
                "EDITAL",
                "DATA_PREGAO",
                "TIPO_CONTRATO",
                "CLASSIFICACAO",
                "LOTE_ITEM",
                "MATERIAL",
                "QTDE",
                "UNIDADE",
                "FORNECEDOR",
                "DESCRICAO_DATABASE",
                "COD_SUPRA",
                "NOME_SUPRA",
                "VALOR_UNITARIO",
                "VALOR_TOTAL",
                "TOTAL_NORMALIZADO",
                "DATA_PROPOSTA",
                "COD_STATUS",
                "SITUACAO_STATUS",
                "DATA_ADJUDICACAO",
                "DATA_INICIO",
                "DATA_TERMINO",
                "VIGENCIA",
                "DATA_EMPENHO",
                "INSTRUMENTAL",
                "INSTRUMENTADOR",
                "LOCAL_ENTREGA",
                "PRAZO_ENTREGA",
                "DETALHAMENTO"
            FROM ${table}
            ORDER BY "CHAVE" DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro na API Itens Arrematados (GET /):', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ==========================================
// GET /api/itens_arrematados/:chave
// Busca um item específico por CHAVE
// ==========================================
router.get('/:chave', async (req, res) => {
    try {
        const { chave } = req.params;
        const { participante } = req.query;
        
        let table = 'itens_arrematados."IA_NEXOMED"';
        if (participante === 'BML') {
            table = 'itens_arrematados."IA_BML"';
        }

        const result = await supaPool.query(
            `SELECT * FROM ${table} WHERE "CHAVE" = $1`,
            [chave]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro na API Itens Arrematados (GET /:chave):', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ==========================================
// POST /api/itens_arrematados
// Cria um novo item
// ==========================================
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const participante = data.PARTICIPANTE || '';
        
        let table = 'itens_arrematados."IA_NEXOMED"';
        if (participante.toUpperCase().includes('BML')) {
            table = 'itens_arrematados."IA_BML"';
        }

        const columns = [
            'COD_CONTRATO_CONCAT', 'COD_CONTRATO', 'ORGAO', 'MUNICIPIO', 'UF',
            'PARTICIPANTE', 'EDITAL', 'DATA_PREGAO', 'TIPO_CONTRATO', 'CLASSIFICACAO',
            'LOTE_ITEM', 'MATERIAL', 'QTDE', 'UNIDADE', 'FORNECEDOR',
            'DESCRICAO_DATABASE', 'COD_SUPRA', 'NOME_SUPRA', 'VALOR_UNITARIO', 'VALOR_TOTAL',
            'TOTAL_NORMALIZADO', 'DATA_PROPOSTA', 'COD_STATUS', 'SITUACAO_STATUS',
            'DATA_ADJUDICACAO', 'DATA_INICIO', 'DATA_TERMINO', 'VIGENCIA',
            'DATA_EMPENHO', 'INSTRUMENTAL', 'INSTRUMENTADOR', 'LOCAL_ENTREGA',
            'PRAZO_ENTREGA', 'DETALHAMENTO'
        ];

        const values = columns.map(col => data[col] !== undefined && data[col] !== '' ? data[col] : null);
        const placeholders = columns.map((_, i) => `$${i + 1}`);
        const colsString = columns.map(c => `"${c}"`).join(', ');

        const result = await supaPool.query(
            `INSERT INTO ${table} (${colsString}) VALUES (${placeholders.join(', ')}) RETURNING *`,
            values
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro na API Itens Arrematados (POST /):', error);
        res.status(500).json({ error: 'Erro ao criar item: ' + error.message });
    }
});

// ==========================================
// PUT /api/itens_arrematados/:chave
// Atualiza um item existente
// ==========================================
router.put('/:chave', async (req, res) => {
    try {
        const { chave } = req.params;
        const data = req.body;
        const participante = data.PARTICIPANTE || req.query.participante || '';

        let table = 'itens_arrematados."IA_NEXOMED"';
        if (participante.toUpperCase().includes('BML')) {
            table = 'itens_arrematados."IA_BML"';
        }

        const columns = [
            'COD_CONTRATO_CONCAT', 'COD_CONTRATO', 'ORGAO', 'MUNICIPIO', 'UF',
            'PARTICIPANTE', 'EDITAL', 'DATA_PREGAO', 'TIPO_CONTRATO', 'CLASSIFICACAO',
            'LOTE_ITEM', 'MATERIAL', 'QTDE', 'UNIDADE', 'FORNECEDOR',
            'DESCRICAO_DATABASE', 'COD_SUPRA', 'NOME_SUPRA', 'VALOR_UNITARIO', 'VALOR_TOTAL',
            'TOTAL_NORMALIZADO', 'DATA_PROPOSTA', 'COD_STATUS', 'SITUACAO_STATUS',
            'DATA_ADJUDICACAO', 'DATA_INICIO', 'DATA_TERMINO', 'VIGENCIA',
            'DATA_EMPENHO', 'INSTRUMENTAL', 'INSTRUMENTADOR', 'LOCAL_ENTREGA',
            'PRAZO_ENTREGA', 'DETALHAMENTO'
        ];

        const setClauses = columns.map((col, i) => `"${col}" = $${i + 1}`);
        const values = columns.map(col => data[col] !== undefined && data[col] !== '' ? data[col] : null);
        values.push(chave); // for WHERE clause

        const result = await supaPool.query(
            `UPDATE ${table} SET ${setClauses.join(', ')} WHERE "CHAVE" = $${values.length} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro na API Itens Arrematados (PUT /:chave):', error);
        res.status(500).json({ error: 'Erro ao atualizar item: ' + error.message });
    }
});

// ==========================================
// DELETE /api/itens_arrematados/:chave
// Remove um item
// ==========================================
router.delete('/:chave', async (req, res) => {
    try {
        const { chave } = req.params;
        const { participante } = req.query;

        let table = 'itens_arrematados."IA_NEXOMED"';
        if (participante === 'BML') {
            table = 'itens_arrematados."IA_BML"';
        }

        const result = await supaPool.query(
            `DELETE FROM ${table} WHERE "CHAVE" = $1 RETURNING "CHAVE"`,
            [chave]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }

        res.json({ message: 'Item excluído com sucesso', chave: result.rows[0].CHAVE });
    } catch (error) {
        console.error('Erro na API Itens Arrematados (DELETE /:chave):', error);
        res.status(500).json({ error: 'Erro ao excluir item: ' + error.message });
    }
});

module.exports = router;
