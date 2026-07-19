const fs = require('fs');
const path = require('path');

function generateSql() {
    try {
        const files = [
            path.join(__dirname, '../lote_atualizacao.sql'), 
            path.join(__dirname, '../lote_atualizacao_parte2.sql')
        ];
        
        let outputSql = "-- SCRIPT PARA ATUALIZAR OS CONTRATOS DIRETAMENTE NO POSTGRESQL DE PRODUÇÃO\n\n";

        for (const file of files) {
            if (!fs.existsSync(file)) continue;
            
            const content = fs.readFileSync(file, 'utf-8');
            const regex = /UPDATE SGC\.dbo\.nota_fiscal_venda\s+SET nome_contato = '([^']+)'[\s\S]*?WHERE numero_nota IN \(([^)]+)\);/gi;
            
            let match;
            while ((match = regex.exec(content)) !== null) {
                const contrato = match[1];
                const notasStr = match[2];
                const notasArr = notasStr.split(',').map(n => n.trim()).filter(n => n);
                
                if (notasArr.length > 0) {
                    const inClause = notasArr.map(n => `'${n}'`).join(', ');
                    outputSql += `UPDATE titulos SET contrato = '${contrato}' WHERE nota IN (${inClause});\n`;
                }
            }
        }
        
        const outputPath = path.join(__dirname, '../update_titulos_postgres.sql');
        fs.writeFileSync(outputPath, outputSql);
        console.log(`✅ Arquivo gerado em: ${outputPath}`);
    } catch (e) {
        console.error(e);
    }
}

generateSql();
