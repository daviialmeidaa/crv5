// Mantém as URLs públicas utilizadas pela planilha; a lógica reside na FastAPI.
const { createFastapiProxy } = require('../services/fastapiProxy');
const { clearCache } = require('../db/redis');

module.exports = createFastapiProxy({
    onSuccess: async req => {
        if (req.originalUrl.startsWith('/api/vba/itens_arrematados/') && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
            await clearCache('cr:titulos');
        }
    }
});
