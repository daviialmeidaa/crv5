const { getPool } = require("../db/connection");

async function run() {
    try {
        const mssqlPool = await getPool();
        const mssqlRes = await mssqlPool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM SGC.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'bio_pedidos_x_nf'
        `);
        console.log("== bio_pedidos_x_nf ==");
        console.log(mssqlRes.recordset);

        const mssqlRes2 = await mssqlPool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM SGC2.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'bml_pedidos_x_nf'
        `);
        console.log("== bml_pedidos_x_nf ==");
        console.log(mssqlRes2.recordset);

    } catch(e) {
        console.error(e.message);
    } finally {
        process.exit(0);
    }
}
run();
