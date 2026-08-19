const pgPool = require('../db/pgConnection');
const { getPool } = require("../db/connection");

async function syncNotasFiscais(contratoId) {
    // This is just a draft of the logic to make sure I get it right before writing it to opme.js
    let cirurgiasResult = await pgPool.query(`
        SELECT id, cod_bio, pedido 
        FROM opme.cirurgias 
        WHERE contrato = $1 
          AND pedido IS NOT NULL 
          AND (nota_fiscal IS NULL OR nota_fiscal = '' OR nota_fiscal = '0')
    `, [contratoId]);

    if (cirurgiasResult.rows.length === 0) return 0;

    let pedidos = [...new Set(cirurgiasResult.rows.map(r => r.pedido))];
    if (pedidos.length === 0) return 0;

    const contratoRes = await pgPool.query('SELECT empresa FROM opme.contratos WHERE id_contrato = $1', [contratoId]);
    if (contratoRes.rows.length === 0) return 0;
    
    const empresa = contratoRes.rows[0].empresa; // 'Nexomed' ou 'Bml'
    const viewDbName = empresa.toLowerCase() === 'bml' ? 'SGC2' : 'SGC';
    const viewName = empresa.toLowerCase() === 'bml' ? 'bml_pedidos_x_nf' : 'bio_pedidos_x_nf';
    const sgcDbName = empresa.toLowerCase() === 'bml' ? 'SGC2' : 'SGC'; // Assuming items are also in SGC2 for Bml? Wait, BML is SGC2.

    const mssqlPool = await getPool();
    // find NFs for these pedidos
    const pedidosStr = pedidos.join(',');
    const nfRes = await mssqlPool.request().query(`
        SELECT Numero_Pedido, Numero_Nota 
        FROM ${viewDbName}.dbo.${viewName} 
        WHERE Numero_Pedido IN (${pedidosStr})
    `);

    if (nfRes.recordset.length === 0) return 0;

    const nfMap = {}; // nfNumero -> pedido
    const nfs = [];
    for (const row of nfRes.recordset) {
        nfMap[row.Numero_Nota] = row.Numero_Pedido;
        nfs.push(row.Numero_Nota);
    }
    
    // Now get the items for these NFs
    const nfsStr = nfs.join(',');
    const cabRes = await mssqlPool.request().query(`
        SELECT codigo, numero_nota 
        FROM ${sgcDbName}.dbo.nota_fiscal_venda 
        WHERE numero_nota IN (${nfsStr})
    `);

    const codigoToNf = {};
    const codigos = [];
    for (const row of cabRes.recordset) {
        codigoToNf[row.codigo] = row.numero_nota;
        codigos.push(row.codigo);
    }

    if (codigos.length === 0) return 0;

    const codigosStr = codigos.join(',');
    const itemRes = await mssqlPool.request().query(`
        SELECT nf_numero, prod_codigo 
        FROM ${sgcDbName}.dbo.nota_fiscal_venda_item 
        WHERE nf_numero IN (${codigosStr})
    `);

    // Match and update
    let updatedCount = 0;
    for (const item of itemRes.recordset) {
        const numeroNota = codigoToNf[item.nf_numero];
        const numeroPedido = nfMap[numeroNota];
        const prodCodigoStr = item.prod_codigo;
        
        // Find in our local rows
        const matches = cirurgiasResult.rows.filter(r => 
            r.pedido == numeroPedido && 
            r.cod_bio && 
            r.cod_bio.toString() === prodCodigoStr
        );
        
        for (const match of matches) {
            await pgPool.query(`
                UPDATE opme.cirurgias 
                SET nota_fiscal = $1, status_expedicao = 'Ok' 
                WHERE id = $2
            `, [numeroNota.toString(), match.id]);
            updatedCount++;
            
            // Remove from cirurgiasResult so we don't update twice if multiple same items?
            // Actually, if a surgery has multiple of the same cod_bio, they both should get updated.
        }
    }
    return updatedCount;
}
