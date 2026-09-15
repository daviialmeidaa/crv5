const { getPool } = require('../db/connection');

async function run() {
    try {
        const pool = await getPool();
        const res1 = await pool.request().query(`
            SELECT TOP 5 codigo FROM produto WHERE codigo = '101.00901' OR codigo LIKE '%101.00901%'
        `);
        console.log('Codigo:', res1.recordset);
        
        const res2 = await pool.request().query(`
            SELECT TOP 5 classificacao_fiscal FROM produto WHERE classificacao_fiscal = '101.00901' OR classificacao_fiscal LIKE '%101.00901%'
        `);
        console.log('NCM:', res2.recordset);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
