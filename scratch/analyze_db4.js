const { getPool } = require("../db/connection");

async function run() {
    try {
        const mssqlPool = await getPool();
        const mssqlRes = await mssqlPool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM SGC.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'nota_fiscal_venda_item'
        `);
        console.log("== SGC.nota_fiscal_venda_item ==");
        console.log(mssqlRes.recordset);

        const mssqlRes2 = await mssqlPool.request().query(`
            SELECT TOP 2 * FROM SGC.dbo.nota_fiscal_venda_item ORDER BY nf_numero DESC
        `);
        console.log("== data ==");
        console.log(mssqlRes2.recordset);
    } catch(e) {
        console.error(e.message);
    } finally {
        process.exit(0);
    }
}
run();
