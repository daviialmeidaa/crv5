const xlsx = require('xlsx');
const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function updateObservacoesStatus() {
  try {
    console.log("Lendo arquivo observacoes_status.xlsx...");
    const workbook = xlsx.readFile(__dirname + '/../observacoes_status.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    console.log(`Encontradas ${data.length} linhas. Atualizando tabela 'AGENDA_LICITACOES'...`);
    
    let updatedCount = 0;
    
    // Process sequentially to avoid connection pool overload warnings
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row.CHAVE) continue;
      
      const observacao = row['Observações/Status'] || row.observacoes_status || row.OBSERVACOES_STATUS || row.Observacoes_Status || row.observacoes;
      if (!observacao) continue;
      
      const query = `
        UPDATE agenda_licitacoes."AGENDA_LICITACOES"
        SET observacoes_status = $1
        WHERE "CHAVE" = $2;
      `;
      
      const values = [observacao, parseInt(row.CHAVE)];
      
      const res = await pool.query(query, values);
      if (res.rowCount > 0) updatedCount++;
      
      if (i > 0 && i % 200 === 0) {
        console.log(`Progresso: ${i} / ${data.length} linhas processadas...`);
      }
    }
    
    console.log(`Sucesso! ${updatedCount} registros atualizados com observacoes_status.`);
  } catch (err) {
    console.error("Erro durante a atualização:", err);
  } finally {
    pool.end();
  }
}

updateObservacoesStatus();
