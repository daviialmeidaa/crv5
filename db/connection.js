const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.SUPRA_USER ? process.env.SUPRA_USER.trim() : '',
    password: process.env.SUPRA_PASSWORD ? process.env.SUPRA_PASSWORD.trim() : '',
    server: 'nexomed.defenseti.com.br',
    port: 9074,
    database: 'SGC',
    options: {
        encrypt: true,
        trustServerCertificate: true
    },
    connectionTimeout: 15000,
    requestTimeout: 300000, // 5 minutos para queries pesadas
};

const dbConfigSGC2 = {
    ...dbConfig,
    database: 'SGC2'
};


let poolPromise;
let poolPromiseSGC2;

async function getPool() {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(dbConfig)
            .connect()
            .then(pool => {
                console.log('✅ Conectado ao banco de dados SQL Server (SGC)!');
                return pool;
            })
            .catch(err => {
                console.error('⚠️  Falha ao conectar no banco de dados SGC:', err.message);
                poolPromise = null;
                return null;
            });
    }
    return poolPromise;
}

async function getPoolSGC2() {
    if (!poolPromiseSGC2) {
        poolPromiseSGC2 = new sql.ConnectionPool(dbConfigSGC2)
            .connect()
            .then(pool => {
                console.log('✅ Conectado ao banco de dados SQL Server (SGC2)!');
                return pool;
            })
            .catch(err => {
                console.error('⚠️  Falha ao conectar no banco de dados SGC2:', err.message);
                poolPromiseSGC2 = null;
                return null;
            });
    }
    return poolPromiseSGC2;
}

// Iniciar as conexões de forma não-bloqueante
getPool();
getPoolSGC2();

module.exports = {
    sql,
    getPool,
    getPoolSGC2
};
