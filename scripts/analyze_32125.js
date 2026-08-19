const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const rows = await pool.request().query("SELECT * FROM SGC2.dbo.pedido_item WHERE ped_codigo = 32125 ORDER BY codigo ASC");
    if (rows.recordset.length === 0) {
        console.log("No items for 32125");
        process.exit(0);
    }
    console.log("pedido_item 32125 (First item):");
    for (const key in rows.recordset[0]) {
        console.log(`  ${key}: ${rows.recordset[0][key]}`);
    }
    process.exit(0);
}
run();
