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
    }
};

async function getSupraView() {
    try {
        const pool = await sql.connect(supraConfig);
        
        const result = await pool.request().query("EXEC SGC2.sys.sp_helptext 'bml_contas_a_receber'");
        
        let viewDef = "";
        for (let row of result.recordset) {
            viewDef += row.Text;
        }
        console.log("=== BML VIEW ===");
        console.log(viewDef);

        const result2 = await pool.request().query("EXEC SGC.sys.sp_helptext 'bio_contas_a_receber'");
        let viewDef2 = "";
        for (let row of result2.recordset) {
            viewDef2 += row.Text;
        }
        console.log("=== NEXOMED VIEW ===");
        console.log(viewDef2);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getSupraView();
