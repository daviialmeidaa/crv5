require('dotenv').config();
const { runAgendaCronLogic } = require('../services/cron_agenda');

console.log('[Heroku Scheduler] Iniciando disparo de emails da agenda...');

runAgendaCronLogic()
  .then(() => {
    console.log('[Heroku Scheduler] Tarefa concluída com sucesso.');
    process.exit(0);
  })
  .catch(err => {
    console.error('[Heroku Scheduler] Erro ao executar tarefa:', err);
    process.exit(1);
  });
