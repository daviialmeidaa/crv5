/**
 * Script de Seed - Cria a tabela de usuários e insere o admin.
 * Rodar com: node db/seed.js
 */
require('dotenv').config();
const pool = require('./pgConnection');
const bcrypt = require('bcryptjs');

async function seed() {
    const client = await pool.connect();

    try {
        console.log('📦 Criando tabela users...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id          SERIAL PRIMARY KEY,
                nome        VARCHAR(255) NOT NULL,
                email       VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                is_admin    BOOLEAN DEFAULT FALSE,
                first_access BOOLEAN DEFAULT TRUE,
                is_active   BOOLEAN DEFAULT TRUE,
                created_at  TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('✅ Tabela users criada com sucesso!');

        // Verificar se o admin já existe
        const existing = await client.query(
            'SELECT id FROM users WHERE email = $1',
            ['davi.almeida@iebtinnovation.com']
        );

        if (existing.rows.length > 0) {
            console.log('⚠️  Usuário admin já existe, pulando inserção.');
        } else {
            // Criar o hash bcrypt da senha
            const salt = await bcrypt.genSalt(12);
            const passwordHash = await bcrypt.hash('Shot5565*', salt);

            await client.query(
                `INSERT INTO users (nome, email, password_hash, is_admin, first_access, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                ['Davi Almeida', 'davi.almeida@iebtinnovation.com', passwordHash, true, false, true]
            );

            console.log('✅ Usuário admin criado com sucesso!');
            console.log('   📧 Email: davi.almeida@iebtinnovation.com');
            console.log('   🔑 Senha: Shot5565*');
        }

    } catch (err) {
        console.error('❌ Erro no seed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
