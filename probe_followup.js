const { getPool, sql } = require('./db/connection');
async function run() {
    try {
        const pool = await getPool();
        const f_cols = await pool.request().query("SELECT TOP 1 * FROM SGC.dbo.nota_fiscal_venda_follow_up");
        console.log("Follow-Up Cols:");
        console.dir(f_cols.recordset[0]);
        
        const u_cols = await pool.request().query("SELECT TOP 1 * FROM SGC.dbo.t_usuario");
        console.log("Usuario Cols:");
        console.dir(u_cols.recordset[0]);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
