const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../routes/financeiro.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove year filter from historico
const histRegex = /\/custos\/historico[\s\S]*?res\.status\(500\)\.json\(\{ error: 'Erro interno ao buscar histórico\.' \}\);\n    \}\n\}\);/;
const newHistRoute = `// =============================================================
// GET /api/financeiro/custos/historico
// Retorna todo o histórico de vendas_custos sem limite de ano
// =============================================================
router.get('/custos/historico', async (req, res) => {
    // Retiramos o limite de ano para exibir todo o histórico
    const cacheKey = \`financeiro:historico:all\`;

    try {
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const result = await pool.query(\`
            SELECT id, empresa, nota_fiscal, tipo_nota, cliente, cidade, uf, cod_produto, produto, lote, classificacao, fabricante, unidade, quantidade, valor_unitario, valor_total, custo_unitario, custo_total, data_emissao
            FROM financeiro.vendas_custos
            ORDER BY data_emissao DESC, nota_fiscal DESC
        \`);

        await setCache(cacheKey, result.rows, 3600);
        res.json(result.rows);

    } catch (err) {
        console.error('Erro ao buscar histórico:', err.message);
        res.status(500).json({ error: 'Erro interno ao buscar histórico.' });
    }
});`;
content = content.replace(histRegex, newHistRoute);

// 2. Change PUT to save-batch
const putRegex = /\/custos\/:id[\s\S]*?res\.status\(500\)\.json\(\{ error: 'Erro interno ao atualizar custo\.' \}\);\n    \}\n\}\);/;
const newPutRoute = `// =============================================================
// PUT /api/financeiro/custos/save-batch
// Atualiza o custo unitário por empresa, nota, produto e lote
// =============================================================
router.put('/custos/save-batch', async (req, res) => {
    const { empresa, nota_fiscal, cod_produto, lote, custo_unitario } = req.body;

    if (custo_unitario === undefined || custo_unitario === null || !empresa || !nota_fiscal || !cod_produto) {
        return res.status(400).json({ error: 'Dados insuficientes. Exige empresa, nota_fiscal, cod_produto e custo_unitario.' });
    }

    const custoNum = parseFloat(custo_unitario);
    if (isNaN(custoNum)) {
        return res.status(400).json({ error: 'custo_unitario deve ser um número válido.' });
    }

    try {
        let query = \`
            UPDATE financeiro.vendas_custos
            SET custo_unitario = $1,
                custo_total = quantidade * $1,
                updated_at = NOW()
            WHERE empresa = $2 AND nota_fiscal = $3 AND cod_produto = $4
        \`;
        let params = [custoNum, empresa, nota_fiscal, cod_produto];

        if (lote) {
            query += \` AND lote = $5\`;
            params.push(lote);
        } else {
            query += \` AND lote IS NULL\`;
        }

        query += \` RETURNING id, custo_unitario, custo_total\`;

        const result = await pool.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Nenhum registro encontrado para atualizar.' });
        }

        // Limpar caches (nulos, resumo, historico)
        const currentYear = new Date().getFullYear();
        await clearCache(\`financeiro:historico:all\`);
        for (let y = 2023; y <= currentYear + 1; y++) {
            await clearCache(\`financeiro:resumo:\${y}\`);
            for(let m = 1; m <= 12; m++) {
                await clearCache(\`financeiro:custos_nulos:\${y}:\${m}\`);
            }
        }

        res.json({ success: true, count: result.rowCount, data: result.rows });

    } catch (err) {
        console.error('Erro ao atualizar custo:', err.message);
        res.status(500).json({ error: 'Erro interno ao atualizar custo.' });
    }
});`;

content = content.replace(putRegex, newPutRoute);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Rewritten financeiro.js');
