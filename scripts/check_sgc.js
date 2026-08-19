const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const rows = await pool.request().query(`
        SELECT TOP 5 codigo, data_hora_registro FROM SGC.dbo.pedido ORDER BY codigo DESC
    `);
    console.table(rows.recordset);
    process.exit(0);
}
run();
