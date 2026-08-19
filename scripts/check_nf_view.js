const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const rows = await pool.request().query(`
        SELECT name, definition
        FROM sys.objects o
        JOIN sys.sql_modules m ON m.object_id = o.object_id
        WHERE o.type = 'V' AND (name LIKE '%nota_fiscal%' OR name LIKE '%gera_nota%')
    `);
    for (const r of rows.recordset) {
        console.log("---- VIEW:", r.name);
    }
    process.exit(0);
}
run();
