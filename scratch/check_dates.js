const { getPool, sql } = require('../db/connection');

async function run() {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT empr_codigo, COUNT(*) as qtd
        FROM nota_fiscal_venda
        GROUP BY empr_codigo
    `);
    console.table(result.recordset);
    process.exit(0);
}
run();
