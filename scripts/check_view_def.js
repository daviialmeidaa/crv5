const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const rows = await pool.request().query("SELECT definition FROM sys.sql_modules WHERE object_id = OBJECT_ID('v_nota_fiscal_venda_item_serial')");
    console.log(rows.recordset[0]?.definition.substring(0, 500));
    process.exit(0);
}
run();
