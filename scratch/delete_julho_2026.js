const pgPool = require('../db/pgConnection');
const { clearCache } = require('../db/redis');

async function run() {
    try {
        console.log('Deletando notas de Julho/2026...');
        const client = await pgPool.connect();
        
        try {
            await client.query('BEGIN');
            
            const result = await client.query(`
                DELETE FROM financeiro.vendas_custos 
                WHERE EXTRACT(YEAR FROM data_emissao) = 2026 
                  AND EXTRACT(MONTH FROM data_emissao) = 7
            `);
            
            console.log(`Linhas deletadas: ${result.rowCount}`);
            
            await client.query('COMMIT');
            console.log('Deleção concluída com sucesso.');

            // Limpar cache de 2026 para refletir as mudanças
            await clearCache('financeiro:resumo:2026');
            await clearCache('financeiro:historico:2026');
            console.log('Cache de 2026 limpado.');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erro na transação, rollback efetuado:', error);
        } finally {
            client.release();
        }
    } catch (e) {
        console.error('Erro ao conectar:', e);
    } finally {
        pgPool.end();
        process.exit(0);
    }
}

run();
