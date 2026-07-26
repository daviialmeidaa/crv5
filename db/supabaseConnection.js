const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
    console.error('⚠️  Erro no pool Supabase:', err.message);
});

module.exports = pool;
