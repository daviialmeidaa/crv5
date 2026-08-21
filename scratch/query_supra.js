require('dotenv').config({ path: __dirname + '/../.env' });
const { sql, getPool } = require('../db/connection');

async function run() {
    try {
        const pool = await getPool();

        console.log("== bml_pedidos_x_nf ==");
        let resPNF = await pool.request().query(`
            SELECT * FROM SGC2.dbo.bml_pedidos_x_nf
            WHERE Numero_Pedido = '32156'
        `);
        console.table(resPNF.recordset);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
run();
