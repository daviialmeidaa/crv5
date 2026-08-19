const pgPool = require('../db/pgConnection');

async function run() {
    try {
        const res = await pgPool.query(`
            SELECT table_name FROM information_schema.tables WHERE table_schema = 'opme'
        `);
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
