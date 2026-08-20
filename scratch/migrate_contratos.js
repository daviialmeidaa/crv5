const pgPool = require("../db/pgConnection");

async function run() {
    try {
        await pgPool.query(`
            ALTER TABLE opme.contratos 
            ADD COLUMN descricao_detalhada BOOLEAN DEFAULT false
        `);
        console.log('Migration successful: opme.contratos.descricao_detalhada added.');
    } catch(e) {
        if (e.message.includes('already exists')) {
            console.log('Column already exists, ignoring.');
        } else {
            console.error(e.message);
        }
    } finally {
        process.exit(0);
    }
}
run();
