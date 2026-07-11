const pool = require('./pgConnection');

async function createMetasTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS metas_recebimento (
            id SERIAL PRIMARY KEY,
            ano INTEGER NOT NULL,
            mes INTEGER NOT NULL,
            valor_meta NUMERIC(15, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(ano, mes)
        );
    `;

    try {
        await pool.query(query);
        console.log('✅ Tabela "metas_recebimento" criada/verificada com sucesso.');
    } catch (err) {
        console.error('❌ Erro ao criar tabela metas_recebimento:', err);
    } finally {
        pool.end();
    }
}

createMetasTable();
