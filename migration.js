require('dotenv').config();
const pgPool = require('./db/pgConnection');
(async () => {
    try {
        await pgPool.query(`ALTER TABLE opme.cirurgias ADD COLUMN modalidade VARCHAR(50) DEFAULT 'Venda'`);
        console.log('Column modalidade added successfully.');
    } catch (e) {
        console.error('Error adding column:', e);
    } finally {
        process.exit(0);
    }
})();
