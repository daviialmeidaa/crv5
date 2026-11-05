const redis = require('redis');

// Usa a variável da Redis Cloud, ou fallback pra local caso esteja testando localmente sem o .env
const redisUrl = process.env.REDISCLOUD_URL || 'redis://localhost:6379';

const redisClient = redis.createClient({
    url: redisUrl
});

redisClient.on('error', (err) => console.error('[REDIS] Client Error', err));
redisClient.on('connect', () => console.log('[REDIS] Conectado ao Redis Cloud!'));

// Conectar imediatamente
(async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('[REDIS] Erro de inicialização:', error.message);
    }
})();

/**
 * Retorna o valor de cache ou null
 * @param {string} key 
 */
async function getCache(key) {
    if (!redisClient.isReady) return null;
    try {
        const data = await redisClient.get(key);
        if (data) return JSON.parse(data);
        return null;
    } catch (err) {
        console.error(`[REDIS] Erro ao buscar cache de ${key}:`, err.message);
        return null;
    }
}

/**
 * Salva no cache com tempo de expiração em segundos (Padrão: 1 hora)
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlSeconds 
 */
async function setCache(key, value, ttlSeconds = 3600) {
    if (!redisClient.isReady) return;
    try {
        await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
        console.error(`[REDIS] Erro ao salvar cache de ${key}:`, err.message);
    }
}

/**
 * Remove chave do cache (Invalidation)
 * @param {string} key 
 */
async function clearCache(key) {
    if (!redisClient.isReady) return;
    try {
        await redisClient.del(key);
        console.log(`[REDIS] Cache invalidado: ${key}`);
    } catch (err) {
        console.error(`[REDIS] Erro ao invalidar cache de ${key}:`, err.message);
    }
}

module.exports = {
    redisClient,
    getCache,
    setCache,
    clearCache
};
