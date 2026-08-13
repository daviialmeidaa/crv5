require('dotenv').config();
const { runCobrancaCronLogic } = require('../services/cron_cobranca');

console.log('[Heroku Scheduler] Iniciando verificação de agendamentos de cobrança...');

// Heroku Scheduler roda todos os dias. Precisamos abortar se for final de semana.
const now = new Date();
const brtDateString = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
const spTime = new Date(brtDateString);
const dayOfWeek = spTime.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

// Roda de Segunda (1) a Sexta (5)
if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    runCobrancaCronLogic()
      .then(() => {
        console.log('[Heroku Scheduler] Tarefa concluída com sucesso.');
        // Dá um pequeno tempo para o nodemailer e banco fecharem as conexões
        setTimeout(() => process.exit(0), 3000);
      })
      .catch(err => {
        console.error('[Heroku Scheduler] Erro ao executar tarefa:', err);
        process.exit(1);
      });
} else {
    console.log(`[Heroku Scheduler] Hoje é dia ${dayOfWeek} (final de semana). Execução abortada.`);
    process.exit(0);
}
