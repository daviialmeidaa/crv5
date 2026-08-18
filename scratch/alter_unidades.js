const pool = require('../db/pgConnection');

async function alter() {
    try {
        console.log("Adicionando colunas na tabela opme.Unidades...");
        await pool.query(`
            ALTER TABLE opme.Unidades 
            ADD COLUMN IF NOT EXISTS ir BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS observacoes TEXT;
        `);
        console.log("Colunas adicionadas!");
    } catch (err) {
        console.error("Erro:", err);
    } finally {
        await pool.end();
    }
}
alter();
