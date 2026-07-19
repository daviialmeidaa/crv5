const { getPool, sql } = require('./db/connection');

async function run() {
    try {
        const pool = await getPool();
        const header = await pool.request().query("SELECT TOP 5 * FROM SGC.dbo.nota_fiscal_venda WHERE numero_nota LIKE '%40387%'");
        console.log("Headers:");
        console.dir(header.recordset, { depth: null });
        
        if (header.recordset.length > 0) {
            const firstNf = header.recordset[0].numero_nota;
            const items = await pool.request().query(`SELECT TOP 5 * FROM SGC.dbo.nota_fiscal_venda_item WHERE nf_numero = '${firstNf}'`);
            console.log("\nItems:");
            console.dir(items.recordset, { depth: null });
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
