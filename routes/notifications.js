const express = require('express');
const router = express.Router();
const pgPool = require('../db/pgConnection');
const { authMiddleware } = require('../middleware/authMiddleware');

// Middleware global para todas as rotas de notificação
router.use(authMiddleware);

// Helpers
const allowedRoles = ['ADMIN', 'LC1', 'LC2', 'LC3', 'LC4'];

function canAccessNotifications(role) {
    return allowedRoles.includes(role);
}

// GET /api/notifications
// Retorna as notificações mais recentes para os perfis permitidos
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        if (!canAccessNotifications(userRole)) {
            return res.json([]); // Retorna vazio se não tiver acesso
        }

        const query = `
            SELECT 
                n.id, 
                n.module, 
                n.action, 
                n.message, 
                n.created_at,
                u.nome as created_by_name,
                u.avatar_url,
                CASE WHEN nr.notification_id IS NULL THEN false ELSE true END as is_read
            FROM notifications n
            LEFT JOIN users u ON n.created_by = u.id
            LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = $1
            ORDER BY n.created_at DESC
            LIMIT 50
        `;

        const result = await pgPool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar notificações:', err);
        res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
});

// POST /api/notifications/read
// Marca uma ou todas as notificações como lidas
router.post('/read', async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { notificationId, markAll } = req.body;

        if (!canAccessNotifications(userRole)) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        if (markAll) {
            // Pega todas as notificações que não foram lidas
            const unreadQuery = `
                SELECT id FROM notifications
                WHERE id NOT IN (SELECT notification_id FROM notification_reads WHERE user_id = $1)
            `;
            const unreadResult = await pgPool.query(unreadQuery, [userId]);
            
            if (unreadResult.rows.length > 0) {
                // Prepara os valores para um batch insert
                const values = unreadResult.rows.map((_, i) => `($1, $${i + 2})`).join(', ');
                const params = [userId, ...unreadResult.rows.map(row => row.id)];
                
                await pgPool.query(`
                    INSERT INTO notification_reads (user_id, notification_id)
                    VALUES ${values}
                    ON CONFLICT (user_id, notification_id) DO NOTHING
                `, params);
            }
            return res.json({ success: true, message: 'Todas marcadas como lidas' });
        }

        if (notificationId) {
            await pgPool.query(`
                INSERT INTO notification_reads (user_id, notification_id)
                VALUES ($1, $2)
                ON CONFLICT (user_id, notification_id) DO NOTHING
            `, [userId, notificationId]);
            return res.json({ success: true });
        }

        res.status(400).json({ error: 'Parâmetros inválidos' });
    } catch (err) {
        console.error('Erro ao marcar como lida:', err);
        res.status(500).json({ error: 'Erro ao processar' });
    }
});

module.exports = router;
