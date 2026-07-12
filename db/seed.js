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
                avatar_url  VARCHAR(255),
                created_at  TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('✅ Tabela users criada com sucesso!');

        console.log('📦 Criando tabela contratos...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS contratos (
                codigo_contrato VARCHAR(255) PRIMARY KEY,
                empresa VARCHAR(255),
                edital VARCHAR(255),
                tipo_contrato VARCHAR(255),
                classificacao VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabela contratos criada com sucesso!');

        console.log('📦 Criando tabela titulos...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS titulos (
                id SERIAL PRIMARY KEY,
                empresa VARCHAR(50) NOT NULL,
                nota VARCHAR(50),
                documento VARCHAR(50) NOT NULL,
                cod_cliente VARCHAR(50),
                cliente VARCHAR(255),
                esfera VARCHAR(50),
                uf VARCHAR(5),
                contrato VARCHAR(255),
                empenho VARCHAR(255),
                valor_nota NUMERIC(15, 2),
                boleto_emitido VARCHAR(10) DEFAULT 'Não',
                valor_deposito NUMERIC(15, 2),
                data_emissao DATE,
                data_vencimento DATE,
                data_pagamento DATE,
                status VARCHAR(50) DEFAULT 'Pendente',
                banco VARCHAR(255),
                retem_ir VARCHAR(5) DEFAULT 'Não',
                origem VARCHAR(20) DEFAULT 'supra',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(empresa, documento)
            );
        `);
        console.log('✅ Tabela titulos criada com sucesso!');

        console.log('📦 Criando tabela metas_recebimento...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS metas_recebimento (
                id SERIAL PRIMARY KEY,
                valor_meta NUMERIC(15, 2) NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO metas_recebimento (id, valor_meta) 
            VALUES (1, 1000000.00) 
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ Tabela metas_recebimento criada com sucesso!');

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
