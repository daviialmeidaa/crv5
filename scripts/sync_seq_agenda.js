const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT setval(pg_get_serial_sequence('agenda_licitacoes."AGENDA_LICITACOES"', 'CHAVE'), (SELECT COALESCE(MAX("CHAVE"), 0) + 1 FROM agenda_licitacoes."AGENDA_LICITACOES"), false);
    `);
    console.log("Database sequence synced!", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
