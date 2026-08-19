const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const rows = await pool.request().query(`
        SELECT codigo, descricao, valor_unitario, preco_custo_produto, codigo_cst 
        FROM SGC2.dbo.produto 
        WHERE codigo IN (12111054, 13501039)
    `);
    console.table(rows.recordset);
    process.exit(0);
}
run();
