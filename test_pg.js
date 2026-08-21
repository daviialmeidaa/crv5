require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DB,
    password: process.env.PG_PASSWORD || process.env.PG_PASS,
    port: process.env.PG_PORT
});
async function run() {
    try {
        const res = await pool.query('SELECT id, paciente, pedido, nota_fiscal FROM opme.cirurgias WHERE pedido = 32163');
        console.table(res.rows);
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
}
run();
