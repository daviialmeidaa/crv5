const pgPool = require('../db/pgConnection');

async function run() {
    try {
        const res = await pgPool.query(`
            SELECT 
                ci.id, ci.quantidade_utilizada, ci.valor_unitario, ci.valor_total,
                sa.cod_bio, sa.valor_unitario as sa_vlr
            FROM opme.cirurgias_itens ci
            LEFT JOIN opme.saldoata sa ON ci.contrato = sa.contrato AND ci.item_pregao = sa.item_ata
            WHERE ci.id_cirurgia = (SELECT id FROM opme.cirurgias WHERE paciente ILIKE '%CECILIA EFIGENIA%' LIMIT 1)
        `);
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
