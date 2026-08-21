require('dotenv').config();
const { redisClient, clearCache } = require('./db/redis.js');

async function run() {
    try {
        console.log('Esperando Redis conectar...');
        await new Promise(r => setTimeout(r, 2000));
        console.log('Conectado?', redisClient.isReady);
        
        const keys = await redisClient.keys('opme:cirurgias:*');
        console.log('Chaves encontradas:', keys.length);
        
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log('Cache removido com sucesso!');
        } else {
            console.log('Nenhum cache precisava ser limpo.');
        }
        process.exit(0);
    } catch (e) {
        console.error('ERRO:', e);
        process.exit(1);
    }
}

run();
