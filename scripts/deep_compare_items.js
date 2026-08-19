const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    // Comparing a known working SGC order (maybe we don't have one right now, let's just dump 39662 items)
    const rows = await pool.request().query("SELECT TOP 1 * FROM SGC.dbo.pedido_item WHERE ped_codigo = 39662");
    console.log("pedido_item 39662:");
    for (const key in rows.recordset[0]) {
        console.log(`  ${key}: ${rows.recordset[0][key]}`);
    }
    process.exit(0);
}
run();
