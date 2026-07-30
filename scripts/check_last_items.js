const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query(`
    SELECT "CHAVE", pregao, empresa, data_cadastro 
    FROM agenda_licitacoes."AGENDA_LICITACOES" 
    ORDER BY "CHAVE" DESC LIMIT 5
  `);
  console.table(res.rows);
  pool.end();
}
run();
