require('dotenv').config();
const { getPool } = require('../db/connection');

async function analyze() {
    try {
        const pool = await getPool();
        if(!pool) throw new Error("Pool nulo");
        console.log("Conectado ao Supra!");
        
        const result = await pool.request().query(`sp_helptext 'bio_pedidos'`);
        console.log("--- Definição da View 'bio_pedidos' ---");
        result.recordset.forEach(row => process.stdout.write(row.Text));
        
        console.log("\n\n--- 5 Primeiras Linhas da View 'bio_pedidos' ---");
        const top5 = await pool.request().query(`SELECT TOP 5 * FROM bio_pedidos`);
        console.log(top5.recordset);
        
    } catch (err) {
        console.error("Erro:", err);
    } finally {
        process.exit(0);
    }
}
analyze();
