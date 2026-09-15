const pgPool = require('../db/pgConnection');

async function run() {
    try {
        console.log('Iniciando padronização de tipo_nota...');
        const client = await pgPool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Padroniza vendas
            const resVenda = await client.query(`
                UPDATE financeiro.vendas_custos 
                SET tipo_nota = 'VENDA'
                WHERE tipo_nota ILIKE 'venda' AND tipo_nota != 'VENDA'
            `);
            console.log(`Linhas de venda atualizadas: ${resVenda.rowCount}`);
            
            // Padroniza devoluções
            const resDev = await client.query(`
                UPDATE financeiro.vendas_custos 
                SET tipo_nota = 'DEVOLUÇÃO RETORNO DE VENDA'
                WHERE tipo_nota ILIKE 'devolu%' AND tipo_nota != 'DEVOLUÇÃO RETORNO DE VENDA'
            `);
            console.log(`Linhas de devolução atualizadas: ${resDev.rowCount}`);
            
            await client.query('COMMIT');
            console.log('Atualização concluída com sucesso.');
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
    }
}

run();
