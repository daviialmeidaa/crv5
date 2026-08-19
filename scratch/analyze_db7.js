const pgPool = require('../db/pgConnection');
async function run() {
    const res = await pgPool.query('SELECT id, cod_bio, produto FROM opme.cirurgias WHERE cod_bio IS NOT NULL LIMIT 5');
    console.log(res.rows);
    process.exit(0);
}
run();
