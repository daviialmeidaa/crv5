const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query(`
    SELECT column_name, data_type, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'AGENDA_LICITACOES' AND table_schema = 'agenda_licitacoes'
  `);
  console.log(res.rows);
  pool.end();
}
run();
