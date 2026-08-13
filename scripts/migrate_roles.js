const pgPool = require('../db/pgConnection');
const { rolePermissions } = require('../middleware/rbac');

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
