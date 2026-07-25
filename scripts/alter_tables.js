require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function alterTables() {
  try {
    const client = await pool.connect();
    
    for (const table of ['IA_BML', 'IA_NEXOMED']) {
        console.log(`Alterando tabela ${table}...`);
        await client.query(`ALTER TABLE itens_arrematados."${table}" ALTER COLUMN "QTDE" TYPE integer;`);
        await client.query(`ALTER TABLE itens_arrematados."${table}" ALTER COLUMN "COD_CONTRATO" TYPE integer;`);
    }
    
    console.log('✅ Alterações concluídas.');
    client.release();
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    pool.end();
  }
}

alterTables();
