const express = require('express');
const router = express.Router();
const pgPool = require('../db/pgConnection');
const eventBus = require('../services/eventBus');

// ==========================================
// Middleware de Autenticação via API Key
// ==========================================
const vbaAuthMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({ error: 'Acesso negado. Header x-api-key não fornecido.' });
    }
    
    if (apiKey !== process.env.VBA_API_KEY) {
        return res.status(403).json({ error: 'Acesso negado. API Key inválida.' });
    }
    
    // Anexa um "usuário fantasma" para a lógica de notificação não quebrar caso precise de req.user
    req.user = { id: null, nome: 'Integração VBA (Sistema Legado)' };
    next();
};

// ==========================================
// Helpers de Formatação VBA -> PostgreSQL
// ==========================================
const parseVBADate = (val) => {
    if (!val || val.toString().trim() === '') return null;
    let str = val.toString().trim();
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length >= 3) {
            let d = parts[0].padStart(2, '0');
            let m = parts[1].padStart(2, '0');
            let y = parts[2].substring(0, 4);
            return `${y}-${m}-${d}`;
        }
    }
    return str;
};

const parseVBATime = (val) => {
    if (!val || val.toString().trim() === '') return null;
    let str = val.toString().trim().replace(',', '.');
    if (str.includes(':')) return str;
    if (!isNaN(parseFloat(str)) && parseFloat(str) < 1) {
        const totalSeconds = Math.round(parseFloat(str) * 86400);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return str;
};

router.use(vbaAuthMiddleware);

// ==========================================
// POST /api/vba/agenda_licitacoes
// ==========================================
router.post('/agenda_licitacoes', async (req, res) => {
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
            parseVBADate(data_cadastro), parseVBADate(data_limite), parseVBATime(hora_limite),
            parseVBADate(data_lances), parseVBATime(hora_lances), antecedencia !== undefined && antecedencia !== '' ? antecedencia : null
        ];

        const result = await pgPool.query(query, values);
        
        // --- INÍCIO: Log de Notificação (Criação) ---
        const parsedData = parseVBADate(data_lances);
        const parsedHora = parseVBATime(hora_lances);
        const dataStr = parsedData ? parsedData.split('-').reverse().join('/') : 'N/A';
        const horaStr = parsedHora ? parsedHora.substring(0, 5) : 'N/A';
        const msg = `O ${req.user.nome} acaba de inserir a agenda do pregão ${pregao || 'Sem Nº'} da empresa ${empresa || 'N/A'} para o dia ${dataStr} às ${horaStr}.`;
        
        // created_by vai como nulo (ou o ID do admin se preferir)
        await pgPool.query(
            `INSERT INTO notifications (module, action, message, created_by) VALUES ($1, $2, $3, $4)`,
            ['AGENDA', 'INSERT', msg, null]
        ).catch(err => console.error('Erro ao registrar notificação (VBA POST):', err));
        eventBus.emit('refresh');
        // --- FIM: Log de Notificação ---

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro na API VBA Agenda Licitações (POST /):', error);
        res.status(500).json({ error: 'Erro interno do servidor ao criar item via VBA' });
    }
});

// ==========================================
// PUT /api/vba/agenda_licitacoes/:chave
// ==========================================
router.put('/agenda_licitacoes/:chave', async (req, res) => {
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
            parseVBADate(data_cadastro), parseVBADate(data_limite), parseVBATime(hora_limite),
            parseVBADate(data_lances), parseVBATime(hora_lances), antecedencia !== undefined && antecedencia !== '' ? antecedencia : null,
            chave
        ];

        // Buscar dados antigos para o Diff de Notificação
        let oldData = null;
        try {
            const oldResult = await pgPool.query(`SELECT data_lances, hora_lances FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE" = $1`, [chave]);
            if (oldResult.rows.length > 0) oldData = oldResult.rows[0];
        } catch (e) {
            console.error('Erro ao buscar dados antigos para diff VBA:', e);
        }

        const result = await pgPool.query(query, values);
        
        // --- INÍCIO: Log de Notificação (Edição com Diff) ---
        if (oldData && result.rows.length > 0) {
            const newData = result.rows[0];
            
            // Formatando as datas em ISO para comparação fácil (apenas YYYY-MM-DD)
            const oldDateISO = oldData.data_lances ? new Date(oldData.data_lances).toISOString().split('T')[0] : null;
            const newDateISO = newData.data_lances ? new Date(newData.data_lances).toISOString().split('T')[0] : null;
            
            const oldHour = oldData.hora_lances ? oldData.hora_lances.substring(0, 8) : null;
            const newHour = newData.hora_lances ? newData.hora_lances.substring(0, 8) : null;

            if (oldDateISO !== newDateISO || oldHour !== newHour) {
                const dataStr = newDateISO ? newDateISO.split('-').reverse().join('/') : 'N/A';
                const horaStr = newHour ? newHour.substring(0, 5) : 'N/A';
                
                const msg = `O ${req.user.nome} acaba de alterar a data do pregão ${newData.pregao || 'Sem Nº'} da empresa ${newData.empresa || 'N/A'} para o dia ${dataStr} às ${horaStr}.`;
                
                await pgPool.query(
                    `INSERT INTO notifications (module, action, message, created_by) VALUES ($1, $2, $3, $4)`,
                    ['AGENDA', 'UPDATE', msg, null]
                ).catch(err => console.error('Erro ao registrar notificação (VBA PUT):', err));
                eventBus.emit('refresh');
            }
        }
        // --- FIM: Log de Notificação ---
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item não encontrado para atualização' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro na API VBA Agenda Licitações (PUT /:chave):', error);
        res.status(500).json({ error: 'Erro interno do servidor ao atualizar item via VBA' });
    }
});

// ==========================================
// DELETE /api/vba/agenda_licitacoes/:chave
// ==========================================
router.delete('/agenda_licitacoes/:chave', async (req, res) => {
    try {
        const { chave } = req.params;
        const result = await pgPool.query(
            `DELETE FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE" = $1 RETURNING *`,
            [chave]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item não encontrado para exclusão' });
        }
        
        res.json({ message: 'Item deletado com sucesso via VBA' });
    } catch (error) {
        console.error('Erro na API VBA Agenda Licitações (DELETE /:chave):', error);
        res.status(500).json({ error: 'Erro interno do servidor ao deletar item via VBA' });
    }
});

module.exports = router;
