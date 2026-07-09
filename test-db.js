require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.SUPRA_USER.trim(),
    password: process.env.SUPRA_PASSWORD.trim(),
    server: '10.0.0.2', 
    database: 'SGC', 
    options: {
        instanceName: 'SUPRASOFT',
        encrypt: true, 
        trustServerCertificate: true 
    }
};

async function testConnection() {
    try {
        console.log('Conectando ao banco de dados...');
        let pool = await sql.connect(config);
        console.log('✅ Conexão estabelecida com sucesso!');
        
        let result = await pool.request().query('SELECT @@VERSION AS version');
        console.dir(result.recordset);
        
        pool.close();
    } catch (err) {
        console.error('❌ Erro na conexão:', err.message);
    }
}

testConnection();
