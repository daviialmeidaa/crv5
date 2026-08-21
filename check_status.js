require('dotenv').config();
const { getPool } = require('./db/connection');

async function run() {
    try {
        const pool = await getPool();
        console.log("=== SGC Transmitidas ===");
        let r1 = await pool.request().query("SELECT numero_nota, id_situacao_nfe FROM SGC.dbo.nota_fiscal_venda WHERE numero_nota IN (40446, 40256, 23931)");
        console.table(r1.recordset);

        console.log("=== SGC Canceladas ===");
        let r2 = await pool.request().query("SELECT numero_nota, id_situacao_nfe FROM SGC.dbo.nota_fiscal_venda WHERE numero_nota IN (12956, 32932, 35006)");
        console.table(r2.recordset);

        console.log("=== SGC2 Transmitidas ===");
        let r3 = await pool.request().query("SELECT numero_nota, id_situacao_nfe FROM SGC2.dbo.nota_fiscal_venda WHERE numero_nota IN (32141, 18628, 11327)");
        console.table(r3.recordset);

        console.log("=== SGC2 Canceladas ===");
        let r4 = await pool.request().query("SELECT numero_nota, id_situacao_nfe FROM SGC2.dbo.nota_fiscal_venda WHERE numero_nota IN (6386, 10789, 20336)");
        console.table(r4.recordset);
        
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
}
run();
