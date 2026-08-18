require('dotenv').config();
const { getPool } = require('../db/connection');
const fs = require('fs');

async function analyze() {
    try {
        const pool = await getPool();
        if(!pool) throw new Error("Pool nulo");
        
        const result = await pool.request().query(`sp_helptext 'bio_pedidos'`);
        const text = result.recordset.map(r => r.Text).join('');
        fs.writeFileSync('scratch/bio_pedidos.sql', text);
        console.log("Definição salva em scratch/bio_pedidos.sql");
        
    } catch (err) {
        console.error("Erro:", err);
    } finally {
        process.exit(0);
    }
}
analyze();
