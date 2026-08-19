const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const rows = await pool.request().query(`
        SELECT top 1 id_estoque, id_frete, id_faturamento, id_nota_fiscal, id_emissao_nota_fiscal
        FROM SGC.dbo.pedido
        WHERE codigo = 32125
    `);
    console.table(rows.recordset);
    process.exit(0);
}
run();
