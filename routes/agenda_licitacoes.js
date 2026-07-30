const express = require('express');
const router = express.Router();
const supaPool = require('../db/supabaseConnection');
const pgPool = require('../db/pgConnection'); // Para inserção de notificações
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
        
        // --- INÍCIO: Log de Notificação (Criação) ---
        if (req.user && req.user.id) {
            const dataStr = data_lances ? data_lances.split('T')[0].split('-').reverse().join('/') : 'N/A';
            const horaStr = hora_lances ? hora_lances.substring(0, 5) : 'N/A';
            const msg = `O(a) ${req.user.nome} acaba de inserir a agenda do pregão ${pregao || 'Sem Nº'} para o dia ${dataStr} às ${horaStr}.`;
            
            await pgPool.query(
                `INSERT INTO notifications (module, action, message, created_by) VALUES ($1, $2, $3, $4)`,
                ['AGENDA', 'INSERT', msg, req.user.id]
            ).catch(err => console.error('Erro ao registrar notificação (POST /agenda):', err));
        }
        // --- FIM: Log de Notificação ---

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

        // Buscar dados antigos para o Diff de Notificação
        let oldData = null;
        try {
            const oldResult = await supaPool.query(`SELECT data_lances, hora_lances FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE" = $1`, [chave]);
            if (oldResult.rows.length > 0) oldData = oldResult.rows[0];
        } catch (e) {
            console.error('Erro ao buscar dados antigos para diff:', e);
        }

        const result = await supaPool.query(query, values);
        
        // --- INÍCIO: Log de Notificação (Edição com Diff) ---
        if (req.user && req.user.id && oldData && result.rows.length > 0) {
            const newData = result.rows[0];
            
            // Formatando as datas em ISO para comparação fácil (apenas YYYY-MM-DD)
            const oldDateISO = oldData.data_lances ? new Date(oldData.data_lances).toISOString().split('T')[0] : null;
            const newDateISO = newData.data_lances ? new Date(newData.data_lances).toISOString().split('T')[0] : null;
            
            const oldHour = oldData.hora_lances ? oldData.hora_lances.substring(0, 8) : null;
            const newHour = newData.hora_lances ? newData.hora_lances.substring(0, 8) : null;

            if (oldDateISO !== newDateISO || oldHour !== newHour) {
                const dataStr = newDateISO ? newDateISO.split('-').reverse().join('/') : 'N/A';
                const horaStr = newHour ? newHour.substring(0, 5) : 'N/A';
                
                const msg = `O(a) ${req.user.nome} acaba de alterar a data do pregão ${newData.pregao || 'Sem Nº'} para o dia ${dataStr} às ${horaStr}.`;
                
                await pgPool.query(
                    `INSERT INTO notifications (module, action, message, created_by) VALUES ($1, $2, $3, $4)`,
                    ['AGENDA', 'UPDATE', msg, req.user.id]
                ).catch(err => console.error('Erro ao registrar notificação (PUT /agenda):', err));
            }
        }
        // --- FIM: Log de Notificação ---
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
