const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'opme' 
    AND table_name IN ('cirurgias', 'cirurgia_produtos')
  `);
  console.log(res.rows);
  pool.end();
}
run();
