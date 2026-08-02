require('dotenv').config();
const { runAgendaCronLogic } = require('../services/cron_agenda');

console.log('[Heroku Scheduler] Iniciando disparo de emails da agenda...');

// Heroku Scheduler roda todos os dias. Precisamos abortar se não for de Segunda a Quinta.
const now = new Date();
const brtDateString = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
const spTime = new Date(brtDateString);
const dayOfWeek = spTime.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    runAgendaCronLogic({ daysToAdd: 1, isFridayRoutine: false })
      .then(() => {
        console.log('[Heroku Scheduler] Tarefa concluída com sucesso.');
        process.exit(0);
      })
      .catch(err => {
        console.error('[Heroku Scheduler] Erro ao executar tarefa:', err);
        process.exit(1);
      });
} else {
    console.log(`[Heroku Scheduler] Hoje é dia ${dayOfWeek} (fora do range Seg-Qui). Execução abortada.`);
    process.exit(0);
}
