const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const rows = await pool.request().query("SELECT codigo, data_hora_registro, observacao_nota_fiscal FROM SGC2.dbo.pedido WHERE codigo = 32125");
    console.table(rows.recordset);
    process.exit(0);
}
run();
