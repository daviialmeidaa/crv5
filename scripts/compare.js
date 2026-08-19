const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const rows = await pool.request().query(`
        SELECT *
        FROM SGC2.dbo.pedido
        WHERE codigo IN (32124, 32125)
    `);
    const p1 = rows.recordset.find(r => r.codigo === 32124);
    const p2 = rows.recordset.find(r => r.codigo === 32125);
    for (const key in p1) {
        if (p1[key] !== p2[key]) {
            console.log(key, '-> 32124:', p1[key], ' | 32125:', p2[key]);
        }
    }
    process.exit(0);
}
run();
