const { sql, getPool } = require('../db/connection');
async function run() {
    const pool = await getPool();
    await pool.request().query(`
        UPDATE SGC.dbo.pedido_item
        SET codigo_cst = '040',
            id_desconto_acrescimo = 1,
            id_base_calculo_st = 1,
            valor_frete = 0,
            aliquota_icms = 0,
            margem_lucro = 0,
            valor_ipi = 0,
            valor_outra_despesa = 0,
            aliquota_reducao_icms = 0,
            percentual_desconto_acrescimo = 0,
            valor_desc_acresc_item = 0,
            valor_desc_acresc_rateio = 0,
            valor_base_calculo_icms_substituicao = 0,
            valor_substituicao_tributaria = 0,
            valor_despesa_acessoria_rateio = 0,
            margem_valor_agregado = 0,
            valor_unitario_sugerido = preco_custo_produto
        WHERE ped_codigo = 39662
    `);
    console.log("39662 flags fixed.");
    process.exit(0);
}
run();
