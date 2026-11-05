/**
 * services/cost_engine.js
 * 
 * Implementa o motor de precificação para encontrar
 * o custo de um produto vendido ou devolvido buscando em ambos os bancos (SGC e SGC2)
 * e escolhendo sempre o mais recente.
 */

const { getPool, getPoolSGC2, sql } = require('../db/connection'); // Supra DB
const pgPool = require('../db/pgConnection'); // Postgres DB local

async function getMostRecentCostFromPool(pool, codProduto, lote) {
    if (!pool) return null;

    // Nível 1: Lote exato
    if (lote) {
        const resN1 = await pool.request()
            .input('codProduto', sql.NVarChar, codProduto)
            .input('lote', sql.NVarChar, lote)
            .query(`
                SELECT TOP 1 c.data_entrada, COALESCE(ci.valor_custo, ci.custo_real_unitario, ci.valor_unitario) as valor_custo
                FROM compra_item_lote cil
                JOIN compra_item ci ON cil.comit_comp_codigo = ci.comp_codigo AND cil.comit_codigo = ci.codigo
                JOIN compra c ON ci.comp_codigo = c.codigo
                WHERE cil.prod_codigo = @codProduto AND cil.lote_numero = @lote
                ORDER BY c.data_entrada DESC, ci.comp_codigo DESC
            `);
        
        if (resN1.recordset.length > 0 && resN1.recordset[0].valor_custo > 0) {
            return { date: resN1.recordset[0].data_entrada, cost: parseFloat(resN1.recordset[0].valor_custo), level: 1 };
        }
    }

    // Nível 2: Produto genérico
    const resN2 = await pool.request()
        .input('codProduto', sql.NVarChar, codProduto)
        .query(`
            SELECT TOP 1 c.data_entrada, COALESCE(ci.valor_custo, ci.custo_real_unitario, ci.valor_unitario) as valor_custo
            FROM compra_item ci
            JOIN compra c ON ci.comp_codigo = c.codigo
            WHERE ci.prod_codigo = @codProduto
            ORDER BY c.data_entrada DESC, ci.comp_codigo DESC
        `);
    
    if (resN2.recordset.length > 0 && resN2.recordset[0].valor_custo > 0) {
        return { date: resN2.recordset[0].data_entrada, cost: parseFloat(resN2.recordset[0].valor_custo), level: 2 };
    }

    return null;
}

/**
 * Encontra o custo unitário usando a regra de 5 níveis.
 * 
 * Níveis:
 * 1. Supra SGC + SGC2 (Lote/Produto): compra_item_lote + compra_item exatos
 * 2. Supra SGC + SGC2 (Produto): compra_item apenas pelo produto (última compra)
 * 3. Postgres (Lote/Produto): histórico financeiro.vendas_custos exatos
 * 4. Postgres (Produto): histórico financeiro.vendas_custos apenas produto
 * 5. Fallback: 0.00
 * 
 * @param {string} empresa 'Nexomed' ou 'BML'
 * @param {string} codProduto Código do produto
 * @param {string} lote Lote do produto
 * @param {string} classificacao Classificação do produto
 * @returns {number} Custo encontrado ou 0
 */
async function findCusto(empresa, codProduto, lote, classificacao) {
    if (!codProduto) {
        return { cost: 0, level: 5 };
    }
    
    try {
        let bestResult = null;
        let sourceDb = '';

        // Regra de Negócio Especial: Fixadores Externos devem pular a busca no Supra (Nível 1 e 2)
        const isFixadorExterno = classificacao && classificacao.toUpperCase() === 'FIXADORES EXTERNOS';

        if (!isFixadorExterno) {
            const poolSGC = await getPool();
            const poolSGC2 = await getPoolSGC2();

            const [sgcResult, sgc2Result] = await Promise.all([
                getMostRecentCostFromPool(poolSGC, codProduto, lote),
                getMostRecentCostFromPool(poolSGC2, codProduto, lote)
            ]);


        // Compara SGC e SGC2 e pega o mais recente (ou o melhor nivel)
        if (sgcResult && sgc2Result) {
            if (sgcResult.level < sgc2Result.level) {
                bestResult = sgcResult;
                sourceDb = 'SGC';
            } else if (sgc2Result.level < sgcResult.level) {
                bestResult = sgc2Result;
                sourceDb = 'SGC2';
            } else {
                if (new Date(sgcResult.date) >= new Date(sgc2Result.date)) {
                    bestResult = sgcResult;
                    sourceDb = 'SGC';
                } else {
                    bestResult = sgc2Result;
                    sourceDb = 'SGC2';
                }
            }
        } else if (sgcResult) {
            bestResult = sgcResult;
            sourceDb = 'SGC';
        } else if (sgc2Result) {
            bestResult = sgc2Result;
            sourceDb = 'SGC2';
        }
        } // Fim if (!isFixadorExterno)

        if (bestResult) {
            return { cost: bestResult.cost, level: bestResult.level }; // level 1 or 2
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
                const c = parseFloat(resN3.rows[0].custo_unitario);
                return { cost: c, level: 3 };
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
            const c = parseFloat(resN4.rows[0].custo_unitario);
            return { cost: c, level: 4 };
        }

        // NÍVEL 5: Fallback
        return { cost: 0.00, level: 5 };
    } catch (err) {
        console.error('Erro no cost_engine:', err);
        return { cost: 0, level: 5 };
    }
}

module.exports = {
    findCusto
};
