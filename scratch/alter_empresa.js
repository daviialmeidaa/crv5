require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
pool.query('ALTER TABLE opme.Contratos ADD COLUMN IF NOT EXISTS empresa VARCHAR(255);')
  .then(() => { console.log('coluna adicionada'); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
