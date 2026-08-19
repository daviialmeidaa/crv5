const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    // The items for ped_codigo=32125 have codigo starting from 428
    const rows = await pool.request().query("SELECT codigo FROM SGC2.dbo.pedido_item WHERE ped_codigo = 32125 ORDER BY codigo ASC");
    let seq = 1;
    for (const row of rows.recordset) {
        await pool.request().query(`UPDATE SGC2.dbo.pedido_item SET codigo = ${seq} WHERE ped_codigo = 32125 AND codigo = ${row.codigo}`);
        seq++;
    }
    console.log("Item codigos fixed.");
    process.exit(0);
}
run();
