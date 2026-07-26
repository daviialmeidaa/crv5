const rolePermissions = {
    'ADMIN': { canViewCR: true, canViewLC: true, canViewUsers: true, canManageUsers: true },
    'CR1':   { canViewCR: true, canViewLC: false, canViewUsers: true, canManageUsers: true },
    'CR2':   { canViewCR: true, canViewLC: false, canViewUsers: true, canManageUsers: true },
    'CR3':   { canViewCR: true, canViewLC: true,  canViewUsers: true, canManageUsers: true },
    'CR4':   { canViewCR: true, canViewLC: true,  canViewUsers: true, canManageUsers: true },
    'LC1':   { canViewCR: false, canViewLC: true, canViewUsers: true, canManageUsers: true },
    'LC2':   { canViewCR: false, canViewLC: true, canViewUsers: true, canManageUsers: true },
    'LC3':   { canViewCR: true,  canViewLC: true, canViewUsers: true, canManageUsers: true },
    'LC4':   { canViewCR: true,  canViewLC: true, canViewUsers: true, canManageUsers: true }
};

const getRoleLevel = (role) => {
    if (!role) return 0;
    const upper = role.trim().toUpperCase();
    if (upper === 'ADMIN') return 5;
    if (upper.startsWith('CR') || upper.startsWith('LC')) {
        const num = parseInt(upper.replace(/\D/g, ''));
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

const canInteractWithRole = (myRole, targetRole) => {
    if (!myRole || !targetRole) return false;
    const myLevel = getRoleLevel(myRole);
    const targetLevel = getRoleLevel(targetRole);
    
    // Rule 1: Cannot manage higher levels
    if (targetLevel > myLevel) return false;
    
    // Rule 2: If my level < 4 (and not ADMIN), I can only manage my own department (CR or LC)
    if (myLevel < 4 && myRole.trim().toUpperCase() !== 'ADMIN') {
        const myPrefix = myRole.trim().toUpperCase().substring(0, 2);
        const targetPrefix = targetRole.trim().toUpperCase().substring(0, 2);
        if (myPrefix !== targetPrefix) return false;
    }
    
    return true;
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
    getRoleLevel,
    canInteractWithRole,
    getPermissionsForRole,
    requirePermission
};
