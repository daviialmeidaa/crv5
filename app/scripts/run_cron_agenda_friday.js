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
// Heroku Scheduler roda todos os dias. Precisamos abortar se não for Sexta-feira.
const now = new Date();
const brtDateString = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
const spTime = new Date(brtDateString);
const dayOfWeek = spTime.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado, 5 = Sexta

if (dayOfWeek === 5) {
    runAgendaCronLogic({ daysToAdd: 3, isFridayRoutine: true })
      .then(() => {
        console.log('[Heroku Scheduler] Tarefa concluída com sucesso (Rotina de Sexta-feira).');
        process.exit(0);
      })
      .catch(err => {
        console.error('[Heroku Scheduler] Erro ao executar tarefa:', err);
        process.exit(1);
      });
} else {
    console.log(`[Heroku Scheduler] Hoje é dia ${dayOfWeek} (não é Sexta-feira). Execução abortada.`);
    process.exit(0);
}
