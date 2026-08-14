const pgPool = require('../db/pgConnection');
const rolePermissions = {
    'ADMIN': { canViewCR: true, canViewLC: true, canViewUsers: true, canManageUsers: true, canViewClientes: true, canCreateUsers: true, canManageRoles: true, canResetHeroku: true, canReceiveEmailsLC: true, canReceiveEmailsCR: true },
    'CR1': { canViewCR: true, canViewLC: false, canViewUsers: false, canManageUsers: false, canViewClientes: false, canCreateUsers: false, canManageRoles: false, canResetHeroku: false, canReceiveEmailsLC: false, canReceiveEmailsCR: true },
    'CR2': { canViewCR: true, canViewLC: false, canViewUsers: true, canManageUsers: false, canViewClientes: true, canCreateUsers: false, canManageRoles: false, canResetHeroku: false, canReceiveEmailsLC: false, canReceiveEmailsCR: true },
    'CR3': { canViewCR: true, canViewLC: false, canViewUsers: true, canManageUsers: false, canViewClientes: true, canCreateUsers: false, canManageRoles: false, canResetHeroku: false, canReceiveEmailsLC: false, canReceiveEmailsCR: true },
    'CR4': { canViewCR: true, canViewLC: false, canViewUsers: true, canManageUsers: false, canViewClientes: true, canCreateUsers: false, canManageRoles: false, canResetHeroku: false, canReceiveEmailsLC: false, canReceiveEmailsCR: true },
    'LC1': { canViewCR: false, canViewLC: true, canViewUsers: false, canManageUsers: false, canViewClientes: false, canCreateUsers: false, canManageRoles: false, canResetHeroku: false, canReceiveEmailsLC: true, canReceiveEmailsCR: false },
    'LC2': { canViewCR: false, canViewLC: true, canViewUsers: true, canManageUsers: false, canViewClientes: false, canCreateUsers: false, canManageRoles: false, canResetHeroku: false, canReceiveEmailsLC: true, canReceiveEmailsCR: false },
    'LC3': { canViewCR: false, canViewLC: true, canViewUsers: true, canManageUsers: false, canViewClientes: true, canCreateUsers: false, canManageRoles: false, canResetHeroku: false, canReceiveEmailsLC: true, canReceiveEmailsCR: false },
    'LC4': { canViewCR: false, canViewLC: true, canViewUsers: true, canManageUsers: false, canViewClientes: true, canCreateUsers: false, canManageRoles: false, canResetHeroku: false, canReceiveEmailsLC: true, canReceiveEmailsCR: false }
};

async function migrateRoles() {
    try {
        console.log('Creating roles table...');
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS roles (
                name VARCHAR(50) PRIMARY KEY,
                permissions JSONB NOT NULL,
                is_system BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Seeding existing roles...');
        for (const [roleName, perms] of Object.entries(rolePermissions)) {
            // ADMIN will have is_system = true, but maybe all classical roles are system roles to avoid deletion?
            // User requested to be able to edit them, so they just shouldn't be deleted.
            const isSystem = true; 
            await pgPool.query(`
                INSERT INTO roles (name, permissions, is_system) 
                VALUES ($1, $2, $3)
                ON CONFLICT (name) DO UPDATE 
                SET permissions = EXCLUDED.permissions, is_system = EXCLUDED.is_system;
            `, [roleName, JSON.stringify(perms), isSystem]);
        }
        
        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrateRoles();
