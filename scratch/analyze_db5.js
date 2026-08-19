const { getPool } = require("../db/connection");

async function run() {
    try {
        const mssqlPool = await getPool();
        const mssqlRes = await mssqlPool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM SGC.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'nota_fiscal_venda_item'
            AND COLUMN_NAME LIKE '%pedido%'
        `);
        console.log("== nota_fiscal_venda_item (pedido columns) ==");
        console.log(mssqlRes.recordset);

        const mssqlRes2 = await mssqlPool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM SGC.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'nota_fiscal_venda'
            AND COLUMN_NAME LIKE '%pedido%'
        `);
        console.log("== nota_fiscal_venda (pedido columns) ==");
        console.log(mssqlRes2.recordset);

    } catch(e) {
        console.error(e.message);
    } finally {
        process.exit(0);
    }
}
run();
