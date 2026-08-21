require('dotenv').config();
const { getPool } = require('./db/connection');
const { Pool } = require('pg');
const pgPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DB,
    password: process.env.PG_PASSWORD || process.env.PG_PASS,
    port: process.env.PG_PORT,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const contrato = 'BML885';
        const empresa = 'BML';
        const viewDbName = 'SGC2';
        const viewName = 'bml_pedidos_x_nf';
        const sgcDbName = 'SGC2';
        
        let cirurgiasResult = await pgPool.query(`
            SELECT id, cod_bio, pedido, nota_fiscal 
            FROM opme.cirurgias 
            WHERE contrato = $1 
              AND pedido IS NOT NULL 
        `, [contrato]);
        
        let pedidos = [...new Set(cirurgiasResult.rows.map(r => r.pedido))];
        console.log("pedidos:", pedidos);
        
        const mssqlPool = await getPool();
        const pedidosStr = pedidos.join(',');
        console.log("pedidosStr:", pedidosStr);
        
        const nfRes = await mssqlPool.request().query(`
            SELECT Numero_Pedido, Numero_Nota 
            FROM ${viewDbName}.dbo.${viewName} 
            WHERE Numero_Pedido IN (${pedidosStr})
        `);
        console.log("nfRes:", nfRes.recordset);
        
        const nfMap = {};
        const nfs = [];
        let codigosStr = '';

        if (nfRes.recordset.length > 0) {
            for (const row of nfRes.recordset) {
                nfMap[row.Numero_Nota] = row.Numero_Pedido;
                nfs.push(row.Numero_Nota);
            }
        }
        
        const notasTransmitidas = new Set();
        const codigoToNf = {};
        const codigos = [];

        if (nfs.length > 0) {
            const nfsStr = nfs.join(',');
            const cabRes = await mssqlPool.request().query(`
                SELECT codigo, numero_nota, id_situacao_nfe 
                FROM ${sgcDbName}.dbo.nota_fiscal_venda 
                WHERE numero_nota IN (${nfsStr})
            `);
            console.log("cabRes:", cabRes.recordset);
            for (const row of cabRes.recordset) {
                codigoToNf[row.codigo] = row.numero_nota;
                codigos.push(row.codigo);
                if (row.id_situacao_nfe === 2) {
                    notasTransmitidas.add(row.numero_nota.toString());
                }
            }
        }
        
        const supraNotesMap = {};

        if (codigos.length > 0) {
            codigosStr = codigos.join(',');
            const itemRes = await mssqlPool.request().query(`
                SELECT nf_numero, prod_codigo 
                FROM ${sgcDbName}.dbo.nota_fiscal_venda_item 
                WHERE nf_numero IN (${codigosStr})
            `);
            
            for (const item of itemRes.recordset) {
                const numeroNota = codigoToNf[item.nf_numero];
                const numeroPedido = nfMap[numeroNota];
                const prodCodigoStr = item.prod_codigo ? item.prod_codigo.toString().trim() : '';
                
                if (notasTransmitidas.has(numeroNota.toString()) && numeroNota.toString() !== '0') {
                    const key = `${numeroPedido}_${prodCodigoStr}`;
                    supraNotesMap[key] = numeroNota.toString();
                }
            }
        }
        console.log("supraNotesMap:", supraNotesMap);
        
    } catch(err) {
        console.error("ERROR:", err);
    }
    process.exit(0);
}
run();
