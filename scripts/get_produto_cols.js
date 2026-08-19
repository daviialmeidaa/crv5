const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const rows = await pool.request().query("SELECT TOP 1 * FROM SGC2.dbo.produto");
    console.log(Object.keys(rows.recordset[0]).join(', '));
    process.exit(0);
}
run();
