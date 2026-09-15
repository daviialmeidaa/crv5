const { getPool } = require('../db/connection');

async function run() {
    try {
        const pool = await getPool();
        if (!pool) {
            console.error('Falha ao conectar no SGC.');
            process.exit(1);
        }
        
        const result = await pool.request().query(`
            SELECT OBJECT_DEFINITION(OBJECT_ID('bio_produtos')) AS def
        `);
        
        if (result.recordset.length > 0 && result.recordset[0].def) {
            console.log(result.recordset[0].def);
        } else {
            console.log('View bio_produtos não encontrada no banco SGC.');
        }
    } catch (e) {
        console.error('Erro:', e);
    } finally {
        process.exit(0);
    }
}
run();
