const pool = require('./db/pgConnection');
const bcrypt = require('bcryptjs');

async function testUser() {
    try {
        const res = await pool.query('SELECT * FROM users WHERE email = $1', ['davi.almeida@iebtinnovation.com']);
        if (res.rows.length > 0) {
            console.log("User found:", res.rows[0]);
            
            // Update password
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('Shot5565*', salt);
            await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, 'davi.almeida@iebtinnovation.com']);
            console.log("Password updated successfully.");
        } else {
            console.log("User not found! Creating...");
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('Shot5565*', salt);
            await pool.query(
                'INSERT INTO users (nome, email, password_hash, role, status, first_access) VALUES ($1, $2, $3, $4, $5, $6)',
                ['Davi Almeida', 'davi.almeida@iebtinnovation.com', passwordHash, 'ADMIN', 'ATIVO', false]
            );
            console.log("User created successfully.");
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

testUser();
