const pgPool = require('../db/pgConnection');
async function run() {
    const res = await pgPool.query('SELECT empresa, COUNT(*) as qtd FROM opme.contratos GROUP BY empresa');
    console.log(res.rows);
    process.exit(0);
}
run();
