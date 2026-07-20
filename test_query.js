const { getPool, sql } = require('./db/connection');
async function run() {
    try {
        const pool = await getPool();
        const codigoNota = 31415; // doesn't matter, just need schema to be valid or not fail on syntax
        const dbName = 'SGC2';
        console.log("Testing follow-up table columns...");
        
        try {
            const f_cols = await pool.request().query(`SELECT TOP 1 * FROM ${dbName}.dbo.nota_fiscal_venda_follow_up`);
            console.log("nota_fiscal_venda_follow_up Columns:");
            console.dir(f_cols.recordset[0]);
        } catch (e) {
            console.error("Error fetching nota_fiscal_venda_follow_up:", e.message);
        }

        try {
            const u_cols = await pool.request().query(`SELECT TOP 1 * FROM ${dbName}.dbo.t_usuario`);
            console.log("\nt_usuario Columns:");
            console.dir(u_cols.recordset[0]);
        } catch (e) {
            console.error("Error fetching t_usuario:", e.message);
        }
        
        process.exit(0);
    } catch (err) {
        console.error("Global Error:", err);
        process.exit(1);
    }
}
run();
