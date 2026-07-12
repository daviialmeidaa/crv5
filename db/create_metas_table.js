const pool = require('./pgConnection');

async function createMetasTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS metas_recebimento (
            id INT PRIMARY KEY,
            valor_meta NUMERIC(15, 2) NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO metas_recebimento (id, valor_meta) VALUES (1, 0) ON CONFLICT DO NOTHING;
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
