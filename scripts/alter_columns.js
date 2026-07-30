const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function alter() {
  try {
    const query = `
      ALTER TABLE agenda_licitacoes."AGENDA_LICITACOES"
        ALTER COLUMN data_limite TYPE DATE USING TO_DATE(NULLIF(TRIM(data_limite), ''), 'DD/MM/YYYY'),
        ALTER COLUMN data_lances TYPE DATE USING TO_DATE(NULLIF(TRIM(data_lances), ''), 'DD/MM/YYYY'),
        ALTER COLUMN data_cadastro TYPE DATE USING TO_DATE(NULLIF(TRIM(data_cadastro), ''), 'DD/MM/YYYY');
    `;
    await pool.query(query);
    console.log('Columns altered successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

alter();
