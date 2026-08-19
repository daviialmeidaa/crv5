const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const rows = await pool.request().query(`
        SELECT ped_codigo, codigo FROM SGC2.dbo.pedido_item WHERE ped_codigo IN (32119, 32124)
    `);
    console.table(rows.recordset);
    process.exit(0);
}
run();
