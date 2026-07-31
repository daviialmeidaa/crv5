require('dotenv').config();
const pgPool = require('../db/pgConnection');

async function triggerNotification() {
    try {
        await pgPool.query(
            `INSERT INTO notifications (module, action, message, created_by) VALUES ($1, $2, $3, NULL)`,
            ['SISTEMA', 'TESTE_SOM', '🔔 Teste de Notificação com Som!']
        );
        console.log('Notificação disparada com sucesso!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

triggerNotification();
