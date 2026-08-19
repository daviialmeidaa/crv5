const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const cols = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM SGC2.INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'pedido_item'
    `);
    const names = cols.recordset.map(r => r.COLUMN_NAME);
    console.log(names.filter(n => n.includes('total') || n.includes('valor') || n.includes('preco') || n.includes('desc')));
    process.exit(0);
}
run();
