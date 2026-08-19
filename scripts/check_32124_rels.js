const { sql, getPool } = require('../db/connection');
const fs = require('fs');
async function run() {
    let out = "";
    try {
        const pool = await getPool();
        const rels = [
            'pedido_item_fator_preco',
            'comissao_venda',
            'entrada_saida_mercadoria',
            'pedido_item',
            'pedido_item_lote',
            'pedido_follow_up'
        ];
        
        for (const r of rels) {
            try {
                let col = 'ped_codigo';
                if (['pedido_item_fator_preco', 'entrada_saida_mercadoria', 'pedido_item_lote'].includes(r)) col = 'pedit_ped_codigo';
                
                const result = await pool.request().query(`SELECT COUNT(*) as cnt FROM SGC2.dbo.${r} WHERE ${col} = 32124`);
                out += `[+] ${r}: ${result.recordset[0].cnt}\n`;
            } catch(e) { out += `Error on ${r}: ${e.message}\n`; }
        }
    } catch(e) { out += e.toString(); }
    fs.writeFileSync('rels_32124.txt', out);
    process.exit(0);
}
run();
