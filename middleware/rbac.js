const rolePermissions = {
    'ADMIN': { canViewCR: true, canViewLC: true, canViewUsers: true, canManageUsers: true },
    'CR1':   { canViewCR: true, canViewLC: false, canViewUsers: false, canManageUsers: false },
    'CR2':   { canViewCR: true, canViewLC: false, canViewUsers: true,  canManageUsers: false },
    'CR3':   { canViewCR: true, canViewLC: true,  canViewUsers: true,  canManageUsers: false },
    'CR4':   { canViewCR: true, canViewLC: true,  canViewUsers: true,  canManageUsers: true },
    'LC1':   { canViewCR: false, canViewLC: true, canViewUsers: false, canManageUsers: false },
    'LC2':   { canViewCR: false, canViewLC: true, canViewUsers: true,  canManageUsers: false },
    'LC3':   { canViewCR: true,  canViewLC: true, canViewUsers: true,  canManageUsers: false },
    'LC4':   { canViewCR: true,  canViewLC: true, canViewUsers: true,  canManageUsers: true }
};

const getPermissionsForRole = (role) => {
    return rolePermissions[role] || rolePermissions['CR1']; // Default fallback
};

const requirePermission = (permissionKey) => {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions) {
            return res.status(403).json({ error: 'Acesso negado. Usuário não autenticado corretamente.' });
        }
        
        if (req.user.permissions[permissionKey]) {
            next();
        } else {
            return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para esta ação.' });
        }
    };
};

module.exports = {
    rolePermissions,
    getPermissionsForRole,
    requirePermission
};
