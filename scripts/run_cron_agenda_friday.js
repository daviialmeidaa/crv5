require('dotenv').config();
const { runAgendaCronLogic } = require('../services/cron_agenda');

const today = new Date();
// getDay() retorna 0 para Domingo, 1 para Segunda, ..., 5 para Sexta, 6 para Sábado
if (today.getDay() !== 5) {
    console.log('[Heroku Scheduler - Friday] Hoje não é sexta-feira. O script de lembrete da próxima segunda foi ignorado.');
    process.exit(0);
}

console.log('[Heroku Scheduler - Friday] Iniciando disparo de emails da agenda para a próxima segunda-feira...');

// Sexta-feira + 3 dias = Segunda-feira
runAgendaCronLogic({ daysToAdd: 3, isFridayRoutine: true })
  .then(() => {
    console.log('[Heroku Scheduler - Friday] Tarefa de sexta-feira concluída com sucesso.');
    process.exit(0);
  })
  .catch(err => {
    console.error('[Heroku Scheduler - Friday] Erro ao executar tarefa de sexta-feira:', err);
    process.exit(1);
  });
