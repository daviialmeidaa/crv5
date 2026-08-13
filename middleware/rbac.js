let rolePermissionsCache = {
    'ADMIN': { canViewCR: true, canViewLC: true, canViewUsers: true, canManageUsers: true, canViewClientes: true }
};

const loadCustomRoles = async (pgPool) => {
    try {
        const result = await pgPool.query('SELECT name, permissions FROM roles');
        const newCache = {};
        result.rows.forEach(row => {
            newCache[row.name] = row.permissions;
        });
        rolePermissionsCache = newCache;
        console.log('[RBAC] Perfis de usuário (Roles) carregados na memória com sucesso.');
    } catch (err) {
        console.error('[RBAC] Erro ao carregar perfis na memória:', err);
    }
};

const getRoleLevel = (role) => {
    if (!role) return 0;
    const upper = role.trim().toUpperCase();
    if (upper === 'ADMIN') return 5;
    if (upper.startsWith('CR') || upper.startsWith('LC')) {
        const num = parseInt(upper.replace(/\D/g, ''));
        return isNaN(num) ? 0 : num;
    }
    // Para roles customizadas (ex: ESTAGIARIO_LC), o nível hierárquico padrão é 0 (menor privilégio para gerir outros)
    return 0; 
};

const canInteractWithRole = (myRole, targetRole) => {
    if (!myRole || !targetRole) return false;
    
    // ADMIN é Deus
    if (myRole.trim().toUpperCase() === 'ADMIN') return true;
    
    const myLevel = getRoleLevel(myRole);
    const targetLevel = getRoleLevel(targetRole);
    
    // Rule 1: Cannot manage higher levels
    if (targetLevel > myLevel) return false;
    
    // Rule 2: If my level < 4 (and not ADMIN), I can only manage my own department (CR or LC)
    // Para custom roles, o prefix não será igual, barrando interações perigosas
    if (myLevel < 4) {
        const myPrefix = myRole.trim().toUpperCase().substring(0, 2);
        const targetPrefix = targetRole.trim().toUpperCase().substring(0, 2);
        if (myPrefix !== targetPrefix) return false;
    }
    
    return true;
};

const getPermissionsForRole = (role) => {
    return rolePermissionsCache[role] || { canViewCR: false, canViewLC: false, canViewUsers: false, canManageUsers: false, canViewClientes: false };
};

const requirePermission = (permissionKey) => {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions) {
            return res.status(403).json({ error: 'Acesso negado. Usuário não autenticado corretamente.' });
        }
        
        if (req.user.role === 'ADMIN' || req.user.permissions[permissionKey]) {
            next();
        } else {
            return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para esta ação.' });
        }
    };
};

const requireAnyPermission = (permissionKeys) => {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions) {
            return res.status(403).json({ error: 'Acesso negado. Usuário não autenticado corretamente.' });
        }
        
        const hasAny = permissionKeys.some(key => req.user.permissions[key]);
        if (req.user.role === 'ADMIN' || hasAny) {
            next();
        } else {
            return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para esta ação.' });
        }
    };
};

module.exports = {
    loadCustomRoles,
    getRoleLevel,
    canInteractWithRole,
    getPermissionsForRole,
    requirePermission,
    requireAnyPermission
};
