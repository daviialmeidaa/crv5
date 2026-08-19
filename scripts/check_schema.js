const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const rows = await pool.request().query(`
        SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT
        FROM SGC2.INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'pedido_item'
    `);
    const cols = rows.recordset.filter(r => r.COLUMN_DEFAULT !== null || r.IS_NULLABLE === 'NO');
    console.table(cols);
    process.exit(0);
}
run();
