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

        console.log('Verificando/Criando tabela de Histórico de Cobrança...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS historico_cobranca (
                id SERIAL PRIMARY KEY,
                codigo_cliente VARCHAR(50) NOT NULL,
                agenda_contato_id INTEGER REFERENCES agenda_contatos(id) ON DELETE SET NULL,
                tipo_contato VARCHAR(50),
                resultado_contato VARCHAR(50),
                descritivo_contato TEXT,
                agendamento_data_contato DATE,
                agendamento_hora_contato TIME,
                agendamento_tipo_retorno_contato VARCHAR(50),
                agendamento_nota_contato TEXT,
                has_agendamento BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
            );
        `);

        console.log('Verificando/Criando schema e tabelas OPME...');
        await client.query(`
            CREATE SCHEMA IF NOT EXISTS opme;

            CREATE TABLE IF NOT EXISTS opme.Contratos (
                id SERIAL PRIMARY KEY,
                id_contrato VARCHAR(255) NOT NULL,
                empresa VARCHAR(255),
                material VARCHAR(255),
                cod_cliente INTEGER,
                cliente VARCHAR(255),
                uf VARCHAR(2),
                pregao VARCHAR(255),
                total_ata DOUBLE PRECISION,
                inicio_ata TIMESTAMP,
                termino_ata TIMESTAMP,
                inativo BOOLEAN DEFAULT FALSE
            );

            CREATE TABLE IF NOT EXISTS opme.Unidades (
                id SERIAL PRIMARY KEY,
                contrato VARCHAR(255),
                cod_cliente INTEGER,
                hospital VARCHAR(255),
                sigla VARCHAR(50),
                ir BOOLEAN DEFAULT FALSE,
                observacoes TEXT
            );

            CREATE TABLE IF NOT EXISTS opme.BancoCodigos (
                id SERIAL PRIMARY KEY,
                contrato VARCHAR(255),
                cod_bio INTEGER,
                cod_fab VARCHAR(255),
                produto VARCHAR(255),
                descricao_personalizada TEXT,
                classificacao VARCHAR(255),
                item_ata VARCHAR(255)
            );

            CREATE TABLE IF NOT EXISTS opme.SaldoAta (
                id SERIAL PRIMARY KEY,
                contrato VARCHAR(255),
                item_ata VARCHAR(255),
                descricao_item TEXT,
                quantidade_ata INTEGER,
                valor_unitario DOUBLE PRECISION,
                valor_total DOUBLE PRECISION,
                quantidade_utilizada INTEGER,
                saldo INTEGER
            );

            CREATE TABLE IF NOT EXISTS opme.SaldoAtaHospital (
                id SERIAL PRIMARY KEY,
                contrato VARCHAR(255),
                unidade VARCHAR(255),
                item_ata VARCHAR(255),
                descricao_item TEXT,
                quantidade_ata INTEGER,
                valor_unitario DOUBLE PRECISION,
                valor_total DOUBLE PRECISION,
                quantidade_utilizada INTEGER,
                saldo INTEGER
            );

            CREATE TABLE IF NOT EXISTS opme.Cirurgias (
                id SERIAL PRIMARY KEY,
                contrato VARCHAR(255),
                acao VARCHAR(255),
                paciente VARCHAR(255),
                local_cirurgia VARCHAR(255),
                cod_cliente INTEGER,
                data_cirurgia TIMESTAMP,
                cod_bio INTEGER,
                classificacao VARCHAR(255),
                produto VARCHAR(255),
                descricao_personalizada TEXT,
                quantidade_utilizada INTEGER,
                lote VARCHAR(255),
                prontuario VARCHAR(255),
                medico VARCHAR(255),
                crm VARCHAR(50),
                valor_unitario DOUBLE PRECISION,
                valor_total DOUBLE PRECISION,
                item_pregao VARCHAR(255),
                empenho VARCHAR(255),
                autorizacao VARCHAR(255),
                pedido INTEGER,
                retorno_consignacao VARCHAR(255),
                status_expedicao VARCHAR(255),
                autorizacao_opme VARCHAR(255),
                nota_fiscal VARCHAR(255)
            );
        `);

        console.log('Verificando colunas extras na tabela opme.Contratos e opme.Unidades...');
        await client.query(`
            ALTER TABLE opme.Contratos ADD COLUMN IF NOT EXISTS empresa VARCHAR(255);
            ALTER TABLE opme.Contratos ADD COLUMN IF NOT EXISTS casas_decimais_qtde BOOLEAN DEFAULT FALSE;
            ALTER TABLE opme.Contratos ADD COLUMN IF NOT EXISTS decimais BOOLEAN DEFAULT FALSE;
            ALTER TABLE opme.Contratos ADD COLUMN IF NOT EXISTS casas INTEGER DEFAULT 2;
            ALTER TABLE opme.Unidades ADD COLUMN IF NOT EXISTS ir BOOLEAN DEFAULT FALSE;
            ALTER TABLE opme.Unidades ADD COLUMN IF NOT EXISTS aliquota DOUBLE PRECISION DEFAULT 0;
            ALTER TABLE opme.Unidades ADD COLUMN IF NOT EXISTS observacoes TEXT;
        `);

        console.log('Verificando/Criando tabela de Observações (Cirurgias)...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS opme.Observacoes (
                id SERIAL PRIMARY KEY,
                contrato VARCHAR(255),
                cirurgia VARCHAR(255) UNIQUE,
                observacao TEXT
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
