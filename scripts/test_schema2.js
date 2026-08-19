const pgPool = require('../db/pgConnection');

async function run() {
    try {
        const res = await pgPool.query(`
            SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cirurgias' AND table_schema = 'opme'
        `);
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
