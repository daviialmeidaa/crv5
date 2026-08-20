const pgPool = require("../db/pgConnection");

async function run() {
    try {
        const resContratos = await pgPool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'opme' AND table_name = 'contratos'
        `);
        console.log('--- opme.contratos ---');
        console.table(resContratos.rows);

        const resBancoCodigos = await pgPool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'opme' AND table_name = 'banco_codigos'
        `);
        console.log('--- opme.banco_codigos ---');
        console.table(resBancoCodigos.rows);

    } catch(e) {
        console.error(e.message);
    } finally {
        process.exit(0);
    }
}
run();
