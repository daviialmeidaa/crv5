const pgPool = require('../db/pgConnection');
const { getPool, getPoolSGC2 } = require('../db/connection');

async function run() {
    const pgClient = await pgPool.connect();
    let sgcPool = null;
    let sgc2Pool = null;
    try {
        console.log('Obtendo fabricantes para preencher a base histórica...');
        sgcPool = await getPool();
        sgc2Pool = await getPoolSGC2();

        // 1. Get all unique cod_produto from Postgres
        const pgRes = await pgClient.query('SELECT DISTINCT cod_produto, empresa FROM financeiro.vendas_custos');
        const prodsBML = pgRes.rows.filter(r => r.empresa === 'BML').map(r => r.cod_produto);
        const prodsNexo = pgRes.rows.filter(r => r.empresa === 'Nexomed').map(r => r.cod_produto);

        console.log(`Atualizando ${prodsBML.length} produtos BML e ${prodsNexo.length} produtos Nexomed...`);

        // Função auxiliar para atualizar por empresa
        async function updateEmpresa(pool, empresa, codigos) {
            if (codigos.length === 0) return;
            
            // Fatiar em chunks de 500 para não estourar o IN do SQL Server
            const chunks = [];
            for (let i = 0; i < codigos.length; i += 500) chunks.push(codigos.slice(i, i + 500));
            
            for (const chunk of chunks) {
                const list = chunk.map(c => `'${c}'`).join(',');
                const query = `
                    SELECT p.codigo, f.nome as fabricante
                    FROM produto p
                    LEFT JOIN fabricante f ON p.fabr_codigo = f.codigo
                    WHERE p.codigo IN (${list})
                `;
                const msRes = await pool.request().query(query);
                
                // Update in Postgres
                await pgClient.query('BEGIN');
                for (const row of msRes.recordset) {
                    if (row.fabricante) {
                        await pgClient.query(`
                            UPDATE financeiro.vendas_custos 
                            SET fabricante = $1 
                            WHERE empresa = $2 AND cod_produto = $3
                        `, [row.fabricante, empresa, row.codigo]);
                    }
                }
                await pgClient.query('COMMIT');
            }
        }

        if (sgc2Pool && prodsBML.length > 0) await updateEmpresa(sgc2Pool, 'BML', prodsBML);
        if (sgcPool && prodsNexo.length > 0) await updateEmpresa(sgcPool, 'Nexomed', prodsNexo);

        console.log('Preenchimento retroativo (backfill) de fabricante concluído com sucesso!');

    } catch (e) {
        await pgClient.query('ROLLBACK');
        console.error('Erro:', e);
    } finally {
        pgClient.release();
        pgPool.end();
        process.exit(0);
    }
}
run();
