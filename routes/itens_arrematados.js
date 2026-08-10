const express = require('express');
const router = express.Router();
const supaPool = require('../db/supabaseConnection');
const pgPool = require('../db/pgConnection');
const { getPool, sql } = require('../db/connection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbac');
const eventBus = require('../services/eventBus');

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
            'TOTAL_NORMALIZADO', 'DATA_PROPOSTA', 'CODIGO_STATUS', 'SITUACAO_STATUS',
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

        const saved = result.rows[0];

        // Disparar Notificação e Alimentar Contratos
        try {
            const userName = req.user && req.user.nome ? req.user.nome : 'Usuário';
            const userId = req.user ? req.user.id : null;
            const empresa = participante ? (participante.toUpperCase().includes('BML') ? 'BML' : 'Nexomed') : 'Nexomed';
            
            const msg = `${userName} acaba de inserir um novo contrato na ${empresa}, Codigo ${saved.COD_CONTRATO_CONCAT || '-'}, Orgão ${saved.ORGAO || '-'}, UF ${saved.UF || '-'}, Edital ${saved.EDITAL || '-'}, Tipo de Contrato ${saved.TIPO_CONTRATO || '-'} e Classificação ${saved.CLASSIFICACAO || '-'}.`;
            await pgPool.query('INSERT INTO notifications (module, action, message, created_by) VALUES ($1, $2, $3, $4)', ['ITENS_ARREMATADOS', 'INSERT', msg, userId]);
            eventBus.emit('refresh');

            // Alimentar banco local na tabela 'contratos' do Contas a Receber
            if (saved.COD_CONTRATO_CONCAT) {
                await pgPool.query(`
                    INSERT INTO contratos (codigo_contrato, empresa, edital, tipo_contrato, classificacao)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (codigo_contrato) DO NOTHING;
                `, [saved.COD_CONTRATO_CONCAT, empresa, saved.EDITAL || '', saved.TIPO_CONTRATO || '', saved.CLASSIFICACAO || '']);
            }
        } catch (e) {
            console.error('Erro ao gerar notificação ou inserir no contratos:', e);
        }

        res.status(201).json(saved);
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

        // Buscar dados antigos para comparar (diff)
        const oldResult = await supaPool.query(`SELECT * FROM ${table} WHERE "CHAVE" = $1`, [chave]);
        const oldData = oldResult.rows[0];

        const columns = [
            'COD_CONTRATO_CONCAT', 'COD_CONTRATO', 'ORGAO', 'MUNICIPIO', 'UF',
            'PARTICIPANTE', 'EDITAL', 'DATA_PREGAO', 'TIPO_CONTRATO', 'CLASSIFICACAO',
            'LOTE_ITEM', 'MATERIAL', 'QTDE', 'UNIDADE', 'FORNECEDOR',
            'DESCRICAO_DATABASE', 'COD_SUPRA', 'NOME_SUPRA', 'VALOR_UNITARIO', 'VALOR_TOTAL',
            'TOTAL_NORMALIZADO', 'DATA_PROPOSTA', 'CODIGO_STATUS', 'SITUACAO_STATUS',
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

        const saved = result.rows[0];

        // Disparar Notificação
        try {
            if (oldData) {
                const columnNamesMap = {
                    'COD_CONTRATO_CONCAT': 'Cód. Contrato', 'COD_CONTRATO': 'Cód. Interno',
                    'ORGAO': 'Órgão', 'MUNICIPIO': 'Município', 'UF': 'UF',
                    'PARTICIPANTE': 'Participante', 'EDITAL': 'Edital', 'DATA_PREGAO': 'Data Pregão',
                    'TIPO_CONTRATO': 'Tipo de Contrato', 'CLASSIFICACAO': 'Classificação',
                    'LOTE_ITEM': 'Lote/Item', 'MATERIAL': 'Material', 'QTDE': 'Quantidade',
                    'UNIDADE': 'Unidade', 'FORNECEDOR': 'Fornecedor',
                    'DESCRICAO_DATABASE': 'Descrição Sistema Legado', 'COD_SUPRA': 'Cód. Supra',
                    'NOME_SUPRA': 'Nome Supra', 'VALOR_UNITARIO': 'Valor Unitário',
                    'VALOR_TOTAL': 'Valor Total', 'TOTAL_NORMALIZADO': 'Total Normalizado',
                    'DATA_PROPOSTA': 'Data Proposta', 'CODIGO_STATUS': 'Código Status',
                    'SITUACAO_STATUS': 'Situação / Status', 'DATA_ADJUDICACAO': 'Data Adjudicação',
                    'DATA_INICIO': 'Data Início', 'DATA_TERMINO': 'Data Término',
                    'VIGENCIA': 'Vigência', 'DATA_EMPENHO': 'Data Empenho',
                    'INSTRUMENTAL': 'Instrumental', 'INSTRUMENTADOR': 'Instrumentador',
                    'LOCAL_ENTREGA': 'Local Entrega', 'PRAZO_ENTREGA': 'Prazo Entrega',
                    'DETALHAMENTO': 'Detalhamento'
                };

                const changes = [];
                columns.forEach(col => {
                    let oldVal = oldData[col] === null ? '' : String(oldData[col]);
                    let newVal = saved[col] === null ? '' : String(saved[col]);
                    
                    // Normalizar datas para evitar diffs falsos
                    if (col.startsWith('DATA_') || col === 'VIGENCIA') {
                        if (oldVal.includes('T')) oldVal = oldVal.split('T')[0];
                        if (newVal.includes('T')) newVal = newVal.split('T')[0];
                    }

                    if (oldVal !== newVal) {
                        const colName = columnNamesMap[col] || col;
                        changes.push(`${colName} de '${oldVal || '-'}' para '${newVal || '-'}'`);
                    }
                });

                if (changes.length > 0) {
                    const userName = req.user && req.user.nome ? req.user.nome : 'Usuário';
                    const userId = req.user ? req.user.id : null;
                    const msg = `O ${userName} acaba de alterar ${changes.join(', ')} no contrato ${saved.COD_CONTRATO_CONCAT || '-'}.`;
                    await pgPool.query('INSERT INTO notifications (module, action, message, created_by) VALUES ($1, $2, $3, $4)', ['ITENS_ARREMATADOS', 'UPDATE', msg, userId]);
                    eventBus.emit('refresh');
                }

                // Alimentar banco local na tabela 'contratos' do Contas a Receber
                // O usuário pediu para atualizar quando TIPO_CONTRATO e CLASSIFICACAO forem atualizados,
                // verificaremos se essas colunas (ou edital) sofreram alteração.
                const changedContratoInfo = changes.some(c => c.includes('Tipo de Contrato') || c.includes('Classificação') || c.includes('Edital') || c.includes('Cód. Contrato'));
                
                if (changedContratoInfo && saved.COD_CONTRATO_CONCAT) {
                    const empresa = saved.PARTICIPANTE ? (saved.PARTICIPANTE.toUpperCase().includes('BML') ? 'BML' : 'Nexomed') : 'Nexomed';
                    await pgPool.query(`
                        UPDATE contratos 
                        SET edital = $1, tipo_contrato = $2, classificacao = $3, updated_at = CURRENT_TIMESTAMP
                        WHERE codigo_contrato = $4 AND empresa = $5
                    `, [saved.EDITAL || '', saved.TIPO_CONTRATO || '', saved.CLASSIFICACAO || '', saved.COD_CONTRATO_CONCAT, empresa]);
                }

            }
        } catch (e) {
            console.error('Erro ao gerar notificação ou atualizar no contratos:', e);
        }

        res.json(saved);
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

        // Buscar os dados do contrato antes de excluir para notificar corretamente
        const oldResult = await supaPool.query(`SELECT * FROM ${table} WHERE "CHAVE" = $1`, [chave]);
        const oldData = oldResult.rows[0];

        const result = await supaPool.query(
            `DELETE FROM ${table} WHERE "CHAVE" = $1 RETURNING "CHAVE"`,
            [chave]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }

        // Disparar Notificação
        try {
            if (oldData) {
                const userName = req.user && req.user.nome ? req.user.nome : 'Usuário';
                const userId = req.user ? req.user.id : null;
                const msg = `${userName} deletou o contrato ${oldData.COD_CONTRATO_CONCAT || '-'} do Órgão ${oldData.ORGAO || '-'}.`;
                await pgPool.query('INSERT INTO notifications (module, action, message, created_by) VALUES ($1, $2, $3, $4)', ['ITENS_ARREMATADOS', 'DELETE', msg, userId]);
                eventBus.emit('refresh');
            }
        } catch (e) {
            console.error('Erro ao gerar notificação de DELETE:', e);
        }

        res.json({ message: 'Item excluído com sucesso', chave: result.rows[0].CHAVE });
    } catch (error) {
        console.error('Erro na API Itens Arrematados (DELETE /:chave):', error);
        res.status(500).json({ error: 'Erro ao excluir item: ' + error.message });
    }
});

// ==========================================
// GET /api/itens_arrematados/produto_supra/:codigo
// Busca o nome do produto no banco Supra SGC a partir do código
// ==========================================
router.get('/produto_supra/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const pool = await getPool();
        
        if (!pool) {
            return res.status(500).json({ error: 'Falha na conexão com o banco de dados Supra' });
        }

        const result = await pool.request()
            .input('codigo', sql.VarChar, codigo)
            .query('SELECT nome FROM produto WHERE codigo = @codigo');

        if (result.recordset.length > 0) {
            res.json({ nome: result.recordset[0].nome });
        } else {
            res.json({ nome: null });
        }
    } catch (error) {
        console.error('Erro ao buscar produto Supra:', error);
        res.status(500).json({ error: 'Erro interno ao buscar produto no Supra' });
    }
});

module.exports = router;
