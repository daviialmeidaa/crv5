require('dotenv').config();
const { getPool } = require('./db/connection');

async function run() {
    try {
        const pool = await getPool();
        let res = await pool.request().query("SELECT name FROM SGC2.sys.tables WHERE name LIKE '%situa%'");
        console.log("Tables with situa:", res.recordset);
        
        res = await pool.request().query("SELECT name FROM SGC.sys.tables WHERE name LIKE '%situa%'");
        console.log("Tables with situa in SGC:", res.recordset);
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
}
run();
