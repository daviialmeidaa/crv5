// Mantém as URLs públicas utilizadas pela planilha; a lógica reside na FastAPI.
const { createFastapiProxy } = require('../services/fastapiProxy');

module.exports = createFastapiProxy();
