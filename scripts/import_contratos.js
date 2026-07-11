const xlsx = require('xlsx');
const pgPool = require('../db/pgConnection');

async function importContratos() {
    console.log("🔄 Iniciando importação de contratos...");
    
    try {
        const workbook = xlsx.readFile('contrato_insert.xlsx');
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

        console.log(`📊 Encontrados ${data.length} registros na planilha.`);

        const query = `
            INSERT INTO contratos (codigo_contrato, empresa, edital, tipo_contrato, classificacao)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (codigo_contrato) DO UPDATE SET
                empresa = EXCLUDED.empresa,
                edital = EXCLUDED.edital,
                tipo_contrato = EXCLUDED.tipo_contrato,
                classificacao = EXCLUDED.classificacao,
                updated_at = CURRENT_TIMESTAMP;
        `;

        let successCount = 0;
        let errorCount = 0;

        for (const row of data) {
            const codigo = row.cod_contrato || row.COD_CONTRATO;
            if (!codigo) continue; // Pula linha vazia

            try {
                await pgPool.query(query, [
                    codigo,
                    row.empresa || 'Não informada',
                    row.edital || '',
                    row.tipo_contrato || '',
                    row.classificacao || ''
                ]);
                successCount++;
            } catch (err) {
                console.error(`Erro ao inserir contrato ${codigo}:`, err.message);
                errorCount++;
            }
        }

        console.log(`✅ Importação concluída! Sucesso: ${successCount} | Erros: ${errorCount}`);

    } catch (e) {
        console.error("❌ Erro fatal durante a importação:", e);
    } finally {
        process.exit();
    }
}

importContratos();
