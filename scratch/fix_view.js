const { getPool } = require('../db/connection');

async function run() {
    try {
        const pool = await getPool();
        const alterQuery = `
ALTER VIEW [dbo].[bio_produtos] AS
WITH
PRODUTOS AS (
SELECT        
        produto.codigo AS Codigo_Produto
        ,produto.codigo_fabricante AS Codigo_Produto_Fabricante
        ,produto.nome AS Produto
        ,produto.unid_unidade AS Unidade
        ,classificacao_produto.nome AS Classificacao
        ,fabricante.nome AS Fabricante
        ,CASE WHEN produto.data_exclusao IS NULL THEN 'ATIVADO' ELSE 'DESATIVADO' END AS Situacao
        ,CAST(produto.classificacao_fiscal as INT) as NCM
FROM produto 
LEFT JOIN classificacao_produto 
ON produto.claspro_codigo_1 = classificacao_produto.codigo 
LEFT JOIN fabricante 
ON produto.fabr_codigo = fabricante.codigo
WHERE (produto.claspro_codigo_1 <> 48) AND (produto.claspro_codigo_1 <> 8)
)
SELECT  
        CASE WHEN PRODUTOS.Codigo_Produto NOT LIKE '%[^0-9]%' THEN CONVERT(INT, PRODUTOS.Codigo_Produto) ELSE NULL END AS Codigo_Produto
        ,Codigo_Produto_Fabricante
        ,Produto
        ,Unidade
        ,Classificacao
        ,Fabricante
        ,Situacao
        ,NCM
FROM PRODUTOS
        `;
        
        await pool.request().query(alterQuery);
        console.log('View bio_produtos atualizada com sucesso!');
        
        // Verify it works now by selecting top 5
        const verify = await pool.request().query(`
            SELECT TOP 5 * FROM [dbo].[bio_produtos] WHERE Codigo_Produto IS NOT NULL
        `);
        console.log('Dados da view funcionando:', verify.recordset.length > 0);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
