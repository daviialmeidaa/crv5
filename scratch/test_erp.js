const { getPool } = require('../db/mssql');

async function check() {
    const pool = await getPool();
    const nfRes = await pool.request().query(`
        SELECT TOP 10 Numero_Pedido, Numero_Nota 
        FROM SGC.dbo.bio_pedidos_x_nf 
        WHERE Numero_Pedido = '32159'
    `);
    console.log("SGC:", nfRes.recordset);
    
    const nfRes2 = await pool.request().query(`
        SELECT TOP 10 Numero_Pedido, Numero_Nota 
        FROM SGC2.dbo.bml_pedidos_x_nf 
        WHERE Numero_Pedido = '32159'
    `);
    console.log("SGC2:", nfRes2.recordset);
    process.exit(0);
}
check();
