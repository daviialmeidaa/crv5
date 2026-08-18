require('dotenv').config();
const { getPool } = require('../db/connection');

async function analyze() {
    try {
        const pool = await getPool();
        if(!pool) throw new Error("Pool nulo");
        
        console.log("Consultando colunas da tabela cliente_fornecedor...");
        const cols = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, IS_NULLABLE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'cliente_fornecedor' AND COLUMN_NAME IN ('codigo', 'id')
        `);
        console.dir(cols.recordset);
        
        console.log("\nConsultando cliente 8...");
        const data = await pool.request().query(`
            SELECT codigo, nome, fantasia 
            FROM cliente_fornecedor 
            WHERE codigo = 8 OR nome LIKE '%FHEMIG%'
        `);
        console.dir(data.recordset);
        
    } catch (err) {
        console.error("Erro:", err);
    } finally {
        process.exit(0);
    }
}
analyze();
