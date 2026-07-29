const sql = require('mssql');

const dbConfig = {
    user: 'sup',
    password: 'RwCNLD8QfsMM81P95OV0qg==',
    server: 'nexomed.defenseti.com.br',
    port: 9074,
    database: 'SGC', 
    options: {
        encrypt: true, 
        trustServerCertificate: true 
    },
    connectionTimeout: 15000,
};

async function testConnection() {
    try {
        console.log("Testando conexão com " + dbConfig.server + ":" + dbConfig.port + "...");
        let pool = await sql.connect(dbConfig);
        console.log("✅ Conexão bem-sucedida!");
        
        let result = await pool.request().query("SELECT 1 AS TestResult");
        console.log("✅ Query de teste executada. Resultado:", result.recordset);
        
        pool.close();
    } catch (err) {
        console.error("❌ Erro na conexão:");
        console.error(err);
    }
}

testConnection();
