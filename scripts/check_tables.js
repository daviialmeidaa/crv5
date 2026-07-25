require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  try {
    const client = await pool.connect();
    
    // Check tables in the schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'itens_arrematados';
    `);
    
    console.log('Tables in schema "itens_arrematados":', tablesRes.rows.map(r => r.table_name));
    
    for (const row of tablesRes.rows) {
        const columnsRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'itens_arrematados' AND table_name = $1;
        `, [row.table_name]);
        console.log(`\nTable: ${row.table_name}`);
        console.log(columnsRes.rows);
    }
    
    client.release();
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    pool.end();
  }
}

checkTables();
