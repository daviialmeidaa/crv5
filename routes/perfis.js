const express = require('express');
const router = express.Router();
const pgPool = require('../db/pgConnection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requirePermission, requireAnyPermission, loadCustomRoles } = require('../middleware/rbac');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// ==========================================
// API ROUTES
// ==========================================

// GET /api/perfis - Lista todos os perfis
router.get('/', requireAnyPermission(['canManageRoles', 'canManageUsers', 'canCreateUsers']), async (req, res) => {
    try {
        const result = await pgPool.query('SELECT name, permissions, is_system, created_at FROM roles ORDER BY is_system DESC, name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar perfis:', err);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// POST /api/perfis - Cria ou Atualiza um perfil
router.post('/', requirePermission('canManageRoles'), async (req, res) => {
    const { name, permissions } = req.body;

    if (!name || !permissions) {
        return res.status(400).json({ error: 'Nome e permissões são obrigatórios' });
    }

    const upperName = name.trim().toUpperCase();

    try {
        // Verifica se é uma role de sistema antes de atualizar
        const check = await pgPool.query('SELECT is_system FROM roles WHERE name = $1', [upperName]);
        let isSystem = false;
        
        if (check.rows.length > 0) {
            isSystem = check.rows[0].is_system;
        }

        // Se for ADMIN, não permite remover nenhuma permissão vital
        let finalPermissions = permissions;
        if (upperName === 'ADMIN') {
            finalPermissions = { canViewCR: true, canViewLC: true, canViewUsers: true, canManageUsers: true, canViewClientes: true, canCreateUsers: true, canManageRoles: true, canResetHeroku: true };
        }

        await pgPool.query(`
            INSERT INTO roles (name, permissions, is_system) 
            VALUES ($1, $2, $3)
            ON CONFLICT (name) DO UPDATE 
            SET permissions = EXCLUDED.permissions
        `, [upperName, JSON.stringify(finalPermissions), isSystem]);

        // Atualiza a memória cache do RBAC em tempo real
        await loadCustomRoles(pgPool);

        res.json({ success: true, message: 'Perfil salvo com sucesso!' });
    } catch (err) {
        console.error('Erro ao salvar perfil:', err);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// DELETE /api/perfis/:name - Exclui um perfil
router.delete('/:name', requirePermission('canManageRoles'), async (req, res) => {
    const name = req.params.name.trim().toUpperCase();

    try {
        // Bloqueia exclusão de perfil do sistema
        const check = await pgPool.query('SELECT is_system FROM roles WHERE name = $1', [name]);
        if (check.rows.length > 0 && check.rows[0].is_system) {
            return res.status(403).json({ error: 'Não é permitido excluir perfis nativos do sistema.' });
        }

        // Verifica se existem usuários usando este perfil
        const usersCheck = await pgPool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', [name]);
        if (usersCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Não é possível excluir: existem usuários vinculados a este perfil.' });
        }

        await pgPool.query('DELETE FROM roles WHERE name = $1', [name]);

        // Atualiza a memória cache do RBAC em tempo real
        await loadCustomRoles(pgPool);

        res.json({ success: true, message: 'Perfil excluído com sucesso!' });
    } catch (err) {
        console.error('Erro ao excluir perfil:', err);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

module.exports = router;
