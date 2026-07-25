const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '/home/davi/projetos/Contas_a_Receber_v5/.env' });

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

async function createUser() {
  const email = 'davifreitasdealmeida@gmail.com';
  const plainPassword = '123456';
  const role = 'CR1';

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    // Using first_access = false so the user isn't stuck on the first access screen
    const result = await pool.query(
      `INSERT INTO users (nome, email, password_hash, role, first_access) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE 
       SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, first_access = false
       RETURNING id, nome, email, role`,
      ['Davi Almeida', email, hashedPassword, role, false]
    );

    console.log('User created successfully:', result.rows[0]);
  } catch (err) {
    console.error('Error creating user:', err.message);
  } finally {
    pool.end();
  }
}

createUser();
