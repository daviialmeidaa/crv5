const { getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    if (pool) {
        const result = await pool.request().query(`
            SELECT TOP 1 * FROM compra ORDER BY codigo DESC
        `);
        console.log(Object.keys(result.recordset[0]));
    }
    process.exit(0);
}
run();
