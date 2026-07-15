const pgPool = require('./db/pgConnection');

async function cleanup() {
    try {
        console.log('📦 PASSO 1: CRIANDO BACKUP DE SEGURANÇA...');
        // Cria uma cópia idêntica da tabela atual
        await pgPool.query('DROP TABLE IF EXISTS titulos_bkp_seguranca');
        await pgPool.query('CREATE TABLE titulos_bkp_seguranca AS SELECT * FROM titulos');
        
        const bkpRes = await pgPool.query('SELECT COUNT(*) as count FROM titulos_bkp_seguranca');
        console.log(`✅ Cópia de segurança criada (titulos_bkp_seguranca com ${bkpRes.rows[0].count} registros). Nada será perdido!\n`);
        
        console.log('🧹 PASSO 2: REMOVENDO NOTAS DUPLICADAS DO ÚLTIMO SYNC...');
        const res = await pgPool.query("DELETE FROM titulos WHERE empresa = 'Nexomed'");
        console.log(`✅ ${res.rowCount} notas corrompidas sem formatação (que o Sync inseriu errado) foram removidas.\n`);
        
        console.log('🔄 PASSO 3: MUDANDO NOME "BioImplantes" -> "Nexomed"...');
        const res2 = await pgPool.query("UPDATE titulos SET empresa = 'Nexomed' WHERE empresa = 'BioImplantes'");
        console.log(`✅ ${res2.rowCount} registros antigos (do Excel original) migrados oficialmente para Nexomed.\n`);
        
        console.log('🚀 PRONTO! BANCO DE DADOS LIMPO E ALINHADO.');
        console.log('⚠️ Caso qualquer coisa não saia como esperado, você tem o backup exato de como estava antes!\n');
        
        process.exit(0);
    } catch (e) {
        console.error('❌ Erro:', e.message);
        process.exit(1);
    }
}

cleanup();
