// Invoked only by the isolated E2E suite with external-services.cjs preloaded.
if (process.env.HUB_E2E !== '1' || process.env.PG_DATABASE !== 'nexomed_qa') throw Error('Job limitado a QA');
const pool = require('../../../app/db/pgConnection');
(async () => {
    if (process.argv[2] === 'agenda') await require('../../../app/services/cron_agenda').runAgendaCronLogic();
    else if (process.argv[2] === 'cobranca')
        await require('../../../app/services/cron_cobranca').runCobrancaCronLogic();
    else throw Error('Job desconhecido');
})()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
