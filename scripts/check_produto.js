const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const rows = await pool.request().query("SELECT TOP 1 codigo, codigo_cst, preco_custo_produto, valor_unitario FROM SGC2.dbo.produto WHERE codigo = 13501039");
    console.table(rows.recordset);
    process.exit(0);
}
run();
