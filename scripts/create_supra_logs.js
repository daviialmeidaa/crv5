const pgPool = require('../db/pgConnection');

async function createLogsTable() {
    try {
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS opme.supra_logs (
                id SERIAL PRIMARY KEY,
                banco VARCHAR(50) NOT NULL,
                metodo VARCHAR(50) NOT NULL,
                tabela VARCHAR(100) NOT NULL,
                log TEXT NOT NULL,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Tabela opme.supra_logs criada ou já existe.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

createLogsTable();
