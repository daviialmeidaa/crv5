const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const rows = await pool.request().query(`
        SELECT codigo, descricao, preco_venda, preco_custo, codigo_cst, unid_unidade
        FROM SGC2.dbo.produto 
        WHERE codigo = 12111054
    `);
    console.table(rows.recordset);
    process.exit(0);
}
run();
