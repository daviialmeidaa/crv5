const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../services/cost_engine.js');

const newContent = `/**
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
            .query(\`
                SELECT TOP 1 c.data_entrada, ci.valor_custo
                FROM compra_item_lote cil
                JOIN compra_item ci ON cil.comit_comp_codigo = ci.comp_codigo AND cil.comit_codigo = ci.codigo
                JOIN compra c ON ci.comp_codigo = c.codigo
                WHERE cil.prod_codigo = @codProduto AND cil.lote_numero = @lote
                ORDER BY c.data_entrada DESC, ci.comp_codigo DESC
            \`);
        
        if (resN1.recordset.length > 0 && resN1.recordset[0].valor_custo > 0) {
            return { date: resN1.recordset[0].data_entrada, cost: parseFloat(resN1.recordset[0].valor_custo), level: 1 };
        }
    }

    // Nível 2: Produto genérico
    const resN2 = await pool.request()
        .input('codProduto', sql.NVarChar, codProduto)
        .query(\`
            SELECT TOP 1 c.data_entrada, ci.valor_custo
            FROM compra_item ci
            JOIN compra c ON ci.comp_codigo = c.codigo
            WHERE ci.prod_codigo = @codProduto
            ORDER BY c.data_entrada DESC, ci.comp_codigo DESC
        \`);
    
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
 * @returns {number} Custo encontrado ou 0
 */
async function findCusto(empresa, codProduto, lote) {
    if (!codProduto) return 0;
    
    try {
        const poolSGC = await getPool();
        const poolSGC2 = await getPoolSGC2();

        const [sgcResult, sgc2Result] = await Promise.all([
            getMostRecentCostFromPool(poolSGC, codProduto, lote),
            getMostRecentCostFromPool(poolSGC2, codProduto, lote)
        ]);

        let bestResult = null;
        
        // Compara SGC e SGC2 e pega o mais recente (ou o melhor nivel)
        if (sgcResult && sgc2Result) {
            // Se um for nivel 1 e o outro nivel 2, preferimos o nivel 1 (lote exato)
            if (sgcResult.level < sgc2Result.level) bestResult = sgcResult;
            else if (sgc2Result.level < sgcResult.level) bestResult = sgc2Result;
            else {
                // Mesmo nivel, compara data
                if (new Date(sgcResult.date) >= new Date(sgc2Result.date)) {
                    bestResult = sgcResult;
                } else {
                    bestResult = sgc2Result;
                }
            }
        } else {
            bestResult = sgcResult || sgc2Result;
        }

        if (bestResult) {
            return bestResult.cost;
        }

        // NÍVEL 3: Postgres (Lote/Produto)
        if (lote) {
            const resN3 = await pgPool.query(\`
                SELECT custo_unitario 
                FROM financeiro.vendas_custos
                WHERE cod_produto = $1 AND lote = $2 AND custo_unitario > 0
                ORDER BY data_emissao DESC, id DESC
                LIMIT 1
            \`, [codProduto, lote]);

            if (resN3.rows.length > 0) {
                return parseFloat(resN3.rows[0].custo_unitario);
            }
        }

        // NÍVEL 4: Postgres (Produto genérico)
        const resN4 = await pgPool.query(\`
            SELECT custo_unitario 
            FROM financeiro.vendas_custos
            WHERE cod_produto = $1 AND custo_unitario > 0
            ORDER BY data_emissao DESC, id DESC
            LIMIT 1
        \`, [codProduto]);

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
`;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Rewritten cost_engine.js');
