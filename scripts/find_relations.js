const { sql, getPool } = require('../db/connection');
const fs = require('fs');

async function run() {
    let out = "";
    try {
        const pool = await getPool();
        out += "Connected\n";
        const rows = await pool.request().query(`
            SELECT t.name AS table_name, c.name AS column_name
            FROM SGC2.sys.tables t
            JOIN SGC2.sys.columns c ON t.object_id = c.object_id
            WHERE c.name LIKE '%ped_codigo%' OR c.name = 'numero_pedido' OR c.name = 'codigo_pedido'
        `);
        
        const relations = rows.recordset;
        out += `Found ${relations.length} tables to check\n`;
        for (const rel of relations) {
            try {
                const result = await pool.request().query(`SELECT COUNT(*) as cnt FROM SGC2.dbo.${rel.table_name} WHERE ${rel.column_name} = 32124`);
                if (result.recordset[0].cnt > 0) {
                    out += `[+] Found ${result.recordset[0].cnt} records in SGC2.dbo.${rel.table_name} (column: ${rel.column_name})\n`;
                }
            } catch(e) { out += `Error on ${rel.table_name}: ${e.message}\n`; }
        }
    } catch(e) { out += e.toString(); }
    fs.writeFileSync('relations_out.txt', out);
    process.exit(0);
}
run();
