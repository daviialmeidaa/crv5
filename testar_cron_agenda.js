require('dotenv').config();
const { runAgendaCronLogic } = require('./services/cron_agenda');

console.log("Iniciando teste manual do robô da agenda...");

runAgendaCronLogic().then(() => {
    console.log("Teste finalizado. Verifique seu painel de notificações!");
    setTimeout(() => process.exit(0), 1000);
}).catch(err => {
    console.error("Erro no teste:", err);
    process.exit(1);
});
