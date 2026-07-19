const sql = require('mssql');
require('dotenv').config({ path: '/home/davi/projetos/Contas_a_Receber_v5/.env' });

const supraConfig = {
    user: process.env.SUPRA_DB_USER,
    password: process.env.SUPRA_DB_PASSWORD,
    server: process.env.SUPRA_DB_SERVER,
    database: process.env.SUPRA_DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    requestTimeout: 10000,
    connectionTimeout: 10000
};

async function getSupraView() {
    try {
        const pool = await sql.connect(supraConfig);
        
        const result = await pool.request().query("EXEC SGC.sys.sp_helptext 'bi_cadastro_clientes'");
        
        let viewDef = "";
        for (let row of result.recordset) {
            viewDef += row.Text;
        }
        console.log("=== BI_CADASTRO_CLIENTES VIEW ===");
        console.log(viewDef);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getSupraView();
