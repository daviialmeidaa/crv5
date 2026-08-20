const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'nexomed',
    password: process.env.DB_PASSWORD || '123456',
    port: process.env.DB_PORT || 5432,
});

async function run() {
    try {
        const resContratos = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'opme' AND table_name = 'contratos'
        `);
        console.log('--- opme.contratos ---');
        console.table(resContratos.rows);

        const resBancoCodigos = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'opme' AND table_name = 'banco_codigos'
        `);
        console.log('--- opme.banco_codigos ---');
        console.table(resBancoCodigos.rows);

    } catch(e) {
        console.error(e.message);
    } finally {
        pool.end();
    }
}
run();
