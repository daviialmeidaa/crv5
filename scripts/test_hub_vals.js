const pgPool = require('../db/pgConnection');

async function run() {
    try {
        const res = await pgPool.query(`
            SELECT id, produto, quantidade_utilizada, valor_unitario, valor_total 
            FROM opme.cirurgias 
            WHERE paciente ILIKE '%CECILIA EFIGENIA%'
        `);
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
