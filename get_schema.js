const { getPool } = require('./db/connection');

async function run() {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT COLUMN_NAME 
            FROM SGC.INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'nota_fiscal_venda_item'
        `);
        console.log("=== COLUNAS DA TABELA nota_fiscal_venda_item ===");
        result.recordset.forEach(row => {
            console.log(row.COLUMN_NAME);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
