const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.SUPRA_USER ? process.env.SUPRA_USER.trim() : '',
    password: process.env.SUPRA_PASSWORD ? process.env.SUPRA_PASSWORD.trim() : '',
    server: '10.0.0.2', 
    database: 'SGC', 
    options: {
        instanceName: 'SUPRASOFT',
        encrypt: true, 
        trustServerCertificate: true 
    },
    connectionTimeout: 15000,
    requestTimeout: 300000, // 5 minutos para queries pesadas
};

let poolPromise;

async function getPool() {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(dbConfig)
            .connect()
            .then(pool => {
                console.log('✅ Conectado ao banco de dados SQL Server (SGC)!');
                return pool;
            })
            .catch(err => {
                console.error('⚠️  Falha ao conectar no banco de dados:', err.message);
                console.error('   O servidor continuará rodando. A conexão será tentada novamente nas próximas requisições.');
                poolPromise = null; // Resetar para tentar novamente depois
                return null;
            });
    }
    return poolPromise;
}

// Iniciar a conexão de forma não-bloqueante (não crasha o servidor)
getPool();

module.exports = {
    sql,
    getPool
};
