/**
 * services/cost_engine.js
 * 
 * Implementa o motor de precificação em 5 níveis de cascata para encontrar
 * o custo de um produto vendido ou devolvido.
 */

const { getPool, sql } = require('../db/connection'); // Supra DB
const pgPool = require('../db/pgConnection'); // Postgres DB local

/**
 * Encontra o custo unitário usando a regra de 5 níveis.
 * 
 * Níveis:
 * 1. Supra (Lote/Produto): compra_item_lote + compra_item exatos
 * 2. Supra (Produto): compra_item apenas pelo produto (última compra)
 * 3. Postgres (Lote/Produto): histórico financeiro.vendas_custos exatos
 * 4. Postgres (Produto): histórico financeiro.vendas_custos apenas produto
 * 5. Fallback: 0.00
 * 
 * @param {string} empresa 'Nexomed' ou 'BML'
 * @param {string} codProduto Código do produto
 * @param {string} lote Lote do produto
 * @returns {number} Custo encontrado ou 0
 */
async function findCusto(empresa, codProduto, lote) {
    if (!codProduto) return 0;
    
    // As empresas no Supra SGC e SGC2 são a mesma base, com empr_codigo diferentes
    // Mas a tabela de compra_item é global ou separada? Geralmente é global, mas
    // na dúvida, buscamos sem filtrar empresa ou filtramos se for necessário.
    const supraPool = await getPool();
    if (!supraPool) {
        console.error('Sem conexão com Supra DB.');
        return 0;
    }

    try {
        // NÍVEL 1: Supra (Lote/Produto)
        if (lote) {
            const resultN1 = await supraPool.request()
                .input('codProduto', sql.NVarChar, codProduto)
                .input('lote', sql.NVarChar, lote)
                .query(`
                    SELECT TOP 1 ci.valor_custo
                    FROM compra_item_lote cil
                    JOIN compra_item ci ON cil.comit_comp_codigo = ci.comp_codigo AND cil.comit_codigo = ci.codigo
                    WHERE cil.prod_codigo = @codProduto AND cil.lote_numero = @lote
                    ORDER BY ci.comp_codigo DESC
                `);
            
            if (resultN1.recordset.length > 0 && resultN1.recordset[0].valor_custo > 0) {
                return parseFloat(resultN1.recordset[0].valor_custo);
            }
        }

        // NÍVEL 2: Supra (Produto genérico)
        const resultN2 = await supraPool.request()
            .input('codProduto', sql.NVarChar, codProduto)
            .query(`
                SELECT TOP 1 valor_custo
                FROM compra_item
                WHERE prod_codigo = @codProduto
                ORDER BY comp_codigo DESC
            `);
        
        if (resultN2.recordset.length > 0 && resultN2.recordset[0].valor_custo > 0) {
            return parseFloat(resultN2.recordset[0].valor_custo);
        }

        // NÍVEL 3: Postgres (Lote/Produto)
        if (lote) {
            const resN3 = await pgPool.query(`
                SELECT custo_unitario 
                FROM financeiro.vendas_custos
                WHERE cod_produto = $1 AND lote = $2 AND custo_unitario > 0
                ORDER BY data_emissao DESC, id DESC
                LIMIT 1
            `, [codProduto, lote]);

            if (resN3.rows.length > 0) {
                return parseFloat(resN3.rows[0].custo_unitario);
            }
        }

        // NÍVEL 4: Postgres (Produto genérico)
        const resN4 = await pgPool.query(`
            SELECT custo_unitario 
            FROM financeiro.vendas_custos
            WHERE cod_produto = $1 AND custo_unitario > 0
            ORDER BY data_emissao DESC, id DESC
            LIMIT 1
        `, [codProduto]);

        if (resN4.rows.length > 0) {
            return parseFloat(resN4.rows[0].custo_unitario);
        }

        // NÍVEL 5: Fallback
        return 0.00;
    } catch (err) {
        console.error('Erro no cost_engine:', err);
        return 0;
    }
}

module.exports = {
    findCusto
};
