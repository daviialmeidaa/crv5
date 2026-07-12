const { getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    const result = await pool.request().query("SELECT TOP 5 * FROM SGC.dbo.bio_contas_a_receber WHERE Núm_documento LIKE '%031278%' OR Núm_NF LIKE '%031278%'");
    console.log(result.recordset);
    process.exit();
}
run();
