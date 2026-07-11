const pgPool = require('../db/pgConnection');

async function createTable() {
    try {
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS contratos (
                codigo_contrato VARCHAR(50) PRIMARY KEY,
                empresa VARCHAR(50) NOT NULL,
                edital VARCHAR(255),
                tipo_contrato VARCHAR(255),
                classificacao VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Tabela 'contratos' criada ou já existente com sucesso no PostgreSQL.");
    } catch (err) {
        console.error("❌ Erro ao criar a tabela 'contratos':", err);
    } finally {
        process.exit();
    }
}

createTable();
