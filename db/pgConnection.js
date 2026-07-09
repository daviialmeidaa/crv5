const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT) || 5432,
    user: process.env.PG_USER || 'nexomed',
    password: process.env.PG_PASSWORD || 'nexomed123',
    database: process.env.PG_DATABASE || 'nexomed_auth',
});

pool.on('connect', () => {
    console.log('✅ Conectado ao PostgreSQL (nexomed_auth)!');
});

pool.on('error', (err) => {
    console.error('⚠️  Erro no pool PostgreSQL:', err.message);
});

module.exports = pool;
