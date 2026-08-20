const pgPool = require("../db/pgConnection");

async function run() {
    try {
        const res = await pgPool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'opme' AND table_name = 'bancocodigos'
        `);
        console.table(res.rows);
    } catch(e) {
        console.error(e.message);
    } finally {
        process.exit(0);
    }
}
run();
