const pgPool = require('../db/pgConnection');
const { sql, getPool } = require("../db/connection");

async function run() {
    try {
        console.log("== Supra (SGC) bio_pedidos_x_nf ==");
        const mssqlPool = await getPool();
        const mssqlRes = await mssqlPool.request().query(`
            SELECT TOP 5 * FROM SGC.dbo.bio_pedidos_x_nf ORDER BY PEDIDO DESC
        `);
        console.log(mssqlRes.recordset);

        console.log("== Supra (SGC2) bml_pedidos_x_nf ==");
        const mssqlRes2 = await mssqlPool.request().query(`
            SELECT TOP 5 * FROM SGC2.dbo.bml_pedidos_x_nf ORDER BY PEDIDO DESC
        `);
        console.log(mssqlRes2.recordset);
    } catch(e) {
        console.error(e.message);
    } finally {
        process.exit(0);
    }
}
run();
