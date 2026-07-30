const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query(`
    SELECT *
    FROM agenda_licitacoes."AGENDA_LICITACOES" 
    WHERE pregao = 'teste'
  `);
  console.log(res.rows);
  pool.end();
}
run();
