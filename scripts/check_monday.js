require('dotenv').config();
const supaPool = require('../db/supabaseConnection');

async function checkMonday() {
  try {
    const res = await supaPool.query(`
      SELECT "CHAVE", pregao, orgao, empresa, data_lances 
      FROM agenda_licitacoes."AGENDA_LICITACOES" 
      WHERE data_lances IS NOT NULL AND data_lances::date = CURRENT_DATE + INTERVAL '3 DAY'
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkMonday();
