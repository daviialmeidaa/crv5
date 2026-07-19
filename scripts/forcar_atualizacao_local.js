const fs = require('fs');
const path = require('path');
const pgPool = require('../db/pgConnection');

async function forceUpdateLocal() {
    try {
        console.log('🚀 Iniciando atualização forçada de Contratos no banco PostgreSQL local...');
        
        // Os arquivos que contêm os lotes de atualização que você rodou no Supra
        const files = [
            path.join(__dirname, '../lote_atualizacao.sql'), 
            path.join(__dirname, '../lote_atualizacao_parte2.sql')
        ];
        
        let totalGeral = 0;

        for (const file of files) {
            if (!fs.existsSync(file)) {
                console.log(`⚠️ Arquivo não encontrado: ${file}`);
                continue;
            }
            
            console.log(`\n📄 Lendo arquivo: ${path.basename(file)}`);
            const content = fs.readFileSync(file, 'utf-8');
            
            // Regex para capturar o Contrato (nome_contato) e a lista de Notas Fiscais
            const regex = /UPDATE SGC\.dbo\.nota_fiscal_venda\s+SET nome_contato = '([^']+)'[\s\S]*?WHERE numero_nota IN \(([^)]+)\);/gi;
            
            let match;
            while ((match = regex.exec(content)) !== null) {
                const contrato = match[1];
                const notasStr = match[2];
                // Separa as notas, remove espaços e filtra vazios
                const notasArr = notasStr.split(',').map(n => n.trim()).filter(n => n);
                
                if (notasArr.length > 0) {
                    // Monta a query para o PostgreSQL: UPDATE titulos SET contrato = $1 WHERE nota IN ($2, $3...)
                    const placeholders = notasArr.map((_, i) => `$${i + 2}`).join(',');
                    const query = `UPDATE titulos SET contrato = $1 WHERE nota IN (${placeholders})`;
                    const values = [contrato, ...notasArr];
                    
                    const result = await pgPool.query(query, values);
                    console.log(` -> Contrato ${contrato}: ${result.rowCount} registros atualizados localmente (de ${notasArr.length} solicitados).`);
                    totalGeral += result.rowCount;
                }
            }
        }
        
        console.log(`\n✅ Atualização local finalizada com sucesso! Total de registros atualizados no Postgres: ${totalGeral}`);
    } catch (e) {
        console.error('❌ Erro durante a atualização:', e);
    } finally {
        process.exit(0);
    }
}

forceUpdateLocal();
