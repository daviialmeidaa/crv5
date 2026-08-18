require('dotenv').config();
const { getPool } = require('../db/connection');
const fs = require('fs');

async function analyze() {
    try {
        const pool = await getPool();
        if(!pool) throw new Error("Pool nulo");
        
        console.log("Consultando colunas da tabela dbo.pedido...");
        
        const result = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'pedido'
            ORDER BY ORDINAL_POSITION
        `);
        
        const text = JSON.stringify(result.recordset, null, 2);
        fs.writeFileSync('scratch/dbo_pedido_columns.json', text);
        console.log("Colunas salvas em scratch/dbo_pedido_columns.json");
        
    } catch (err) {
        console.error("Erro:", err);
    } finally {
        process.exit(0);
    }
}
analyze();
