require('dotenv').config();
const pgPool = require('../db/pgConnection');
async function run() {
    const res = await pgPool.query("SELECT cod_bio, quantidade_utilizada, valor_unitario, paciente FROM opme.cirurgias WHERE paciente LIKE '%CECILIA%'");
    console.table(res.rows);
    process.exit(0);
}
run();
