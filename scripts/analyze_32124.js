const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const rows = await pool.request().query("SELECT TOP 1 * FROM SGC2.dbo.pedido_item WHERE ped_codigo = 32124");
    console.log("pedido_item 32124:");
    for (const key in rows.recordset[0]) {
        console.log(`  ${key}: ${rows.recordset[0][key]}`);
    }
    const orderRows = await pool.request().query("SELECT * FROM SGC2.dbo.pedido WHERE codigo = 32124");
    console.log("pedido 32124:");
    for (const key in orderRows.recordset[0]) {
        console.log(`  ${key}: ${orderRows.recordset[0][key]}`);
    }
    process.exit(0);
}
run();
