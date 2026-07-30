const xlsx = require('xlsx');
const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

function excelFractionToTimeString(fraction) {
  if (fraction == null || fraction === '') return null;
  if (typeof fraction === 'string') {
    if (fraction.includes(':')) return fraction;
    fraction = parseFloat(fraction);
  }
  if (isNaN(fraction)) return null;
  const totalSeconds = Math.round(fraction * 24 * 3600);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

async function migrate() {
  try {
    console.log("Removendo tabela duplicada...");
    await pool.query(`DROP TABLE IF EXISTS agenda_licitacoes.agenda_licitacoes CASCADE;`);
    
    // Check their table
    console.log("Lendo arquivo Excel...");
    const workbook = xlsx.readFile(__dirname + '/../AGENDA_LICITACAO.xlsx', {cellDates: false});
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, {raw: false});

    console.log(`Encontradas ${data.length} linhas. Inserindo na tabela 'AGENDA_LICITACOES'...`);
    
    let count = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row.CHAVE) continue;
      
      const query = `
        INSERT INTO agenda_licitacoes."AGENDA_LICITACOES" (
          "CHAVE", data_limite, hora_limite, data_lances, hora_lances,
          modalidade, pregao, orgao, uf, categoria,
          objeto, portal, empresa, data_cadastro, observacoes, antecedencia
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) ON CONFLICT ("CHAVE") DO NOTHING;
      `;
      
      // Convert Excel time to string since the user table expects "time without time zone" 
      // but if the data is a string fraction because of raw: false, it will be a float string "0.375"
      // Wait, with raw: false, time might be parsed as formatted time if the cell has time format in Excel.
      // Let's use raw:true to ensure we parse fractions safely.
      
      let horaLimiteStr = row.hora_limite;
      let horaLancesStr = row.hora_lances;
      
      // I'll re-read with raw: true just to be safe for times
      // Wait, I will just do it inside the loop by checking if it's a number string
      
      const values = [
        parseInt(row.CHAVE),
        row.data_limite,
        excelFractionToTimeString(row.hora_limite),
        row.data_lances,
        excelFractionToTimeString(row.hora_lances),
        row.modalidade,
        row.pregao,
        row.orgao,
        row.uf,
        row.categoria,
        row.objeto,
        row.portal,
        row.empresa,
        row.data_cadastro,
        row.observacoes,
        row.antecedencia ? parseInt(row.antecedencia) : null
      ];
      
      const res = await pool.query(query, values);
      if (res.rowCount > 0) count++;
      
      if (i % 200 === 0 && i > 0) {
        console.log(`Progresso: ${i} / ${data.length}`);
      }
    }
    
    console.log(`Sucesso! ${count} registros novos inseridos na tabela AGENDA_LICITACOES.`);
  } catch (err) {
    console.error("Erro durante a migração:", err);
  } finally {
    pool.end();
  }
}

migrate();
