const { getPool } = require("../db/connection");
async function run() {
    try {
        const mssqlPool = await getPool();
        const mssqlRes = await mssqlPool.request().query(`
            SELECT * FROM SGC2.dbo.pedido_item WHERE ped_codigo = 32138
        `);
        console.log(mssqlRes.recordset);
    } catch(e) {
        console.error(e.message);
    } finally {
        process.exit(0);
    }
}
run();
