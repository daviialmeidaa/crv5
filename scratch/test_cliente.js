const { getPool } = require('../db/connection.js');
async function run() {
    const pool = await getPool();
    const res = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'cliente_fornecedor'
    `);
    console.log(res.recordset.map(r => r.COLUMN_NAME).join(', '));
    process.exit(0);
}
run();
