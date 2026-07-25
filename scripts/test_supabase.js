require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    console.log('✅ Connection to Supabase successful! Current time:', res.rows[0].now);
    
    // Check if schema itens_arrematados exists
    const schemaRes = await client.query(`
      SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'itens_arrematados';
    `);
    if (schemaRes.rows.length > 0) {
      console.log('Schema "itens_arrematados" EXISTS.');
    } else {
      console.log('Schema "itens_arrematados" DOES NOT EXIST.');
    }
    
    client.release();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    pool.end();
  }
}

testConnection();
