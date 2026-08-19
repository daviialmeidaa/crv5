const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    await pool.request().query(`
        UPDATE SGC2.dbo.pedido
        SET id_estoque = 1,
            id_nota_fiscal = 1
        WHERE codigo = 32125
    `);
    console.log("Pedido 32125 updated.");
    process.exit(0);
}
run();
