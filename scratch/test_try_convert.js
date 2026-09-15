const { getPool } = require('../db/connection');

async function run() {
    try {
        const pool = await getPool();
        const res = await pool.request().query(`
            SELECT @@VERSION as version
        `);
        console.log(res.recordset[0].version);
        
        // Try TRY_CONVERT
        const res2 = await pool.request().query(`
            SELECT TRY_CONVERT(INT, '101.00901') as val
        `);
        console.log('TRY_CONVERT works:', res2.recordset[0].val);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
