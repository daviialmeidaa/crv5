const { getPool } = require('./db/connection');

async function testQuery() {
    try {
        const pool = await getPool();
        const nexomedResult = await pool.request().query("SELECT TOP 1 numero_nota, nome_natureza_operacao, data, valor_total, nome_contato, informacao_complementar FROM SGC.dbo.nota_fiscal_venda");
        console.log("Nexomed nota:", nexomedResult.recordset);

        const bmlResult = await pool.request().query("SELECT TOP 1 numero_nota, nome_natureza_operacao, data, valor_total, nome_contato, informacao_complementar FROM SGC2.dbo.nota_fiscal_venda");
        console.log("BML nota:", bmlResult.recordset);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
testQuery();
