const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    await pool.request().query(`
        UPDATE SGC2.dbo.pedido_item
        SET codigo_cst = '040',
            id_desconto_acrescimo = 1,
            id_base_calculo_st = 1
        WHERE ped_codigo = 32125
    `);
    console.log("Items updated.");
    process.exit(0);
}
run();
