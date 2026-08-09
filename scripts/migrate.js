const pool = require('../db/pgConnection');

async function runMigrations() {
    console.log('Iniciando migrações do banco de dados...');

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        console.log('Verificando colunas na tabela users (role, first_access, is_active, avatar_url)...');
        await client.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'CR1';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS first_access BOOLEAN DEFAULT false;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        `);

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

        console.log('Promovendo usuário Davi Almeida para ADMIN...');
        await client.query(`
            UPDATE users SET role = 'ADMIN' WHERE email = 'davi.almeida@iebtinnovation.com';
        `);

        console.log('Verificando/Criando tabela de Agenda de Contatos...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS agenda_contatos (
                id SERIAL PRIMARY KEY,
                codigo_cliente VARCHAR(50) NOT NULL,
                nome_contato VARCHAR(255) NOT NULL,
                cargo_contato VARCHAR(150),
                telefone_contato VARCHAR(50),
                email_contato VARCHAR(255),
                observacao TEXT,
                ativo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
