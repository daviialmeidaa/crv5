const pool = require('../db/pgConnection');

async function runMigrations() {
    console.log('Iniciando migrações do banco de dados...');

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        console.log('Verificando/Criando tabela de notificações...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                module VARCHAR(50) NOT NULL,
                action VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
            );
        `);

        console.log('Verificando/Criando tabela de leitura de notificações...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS notification_reads (
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
                read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, notification_id)
            );
        `);

        await client.query('COMMIT');
        console.log('✅ Migrações concluídas com sucesso!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro durante as migrações:', error);
    } finally {
        client.release();
        // Encerra o processo do Node (útil se for rodado via CLI)
        process.exit(0);
    }
}

runMigrations();
