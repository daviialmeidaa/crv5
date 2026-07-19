const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db/connection');
const { authMiddleware } = require('../middleware/authMiddleware');

// Buscar detalhes e itens da nota fiscal no Supra (Somente Leitura)
router.get('/:empresa/:numero', authMiddleware, async (req, res) => {
    try {
        const { empresa, numero } = req.params;
        
        let dbName = '';
        if (empresa.toUpperCase() === 'NEXOMED') {
            dbName = 'SGC';
        } else if (empresa.toUpperCase() === 'BML') {
            dbName = 'SGC2';
        } else {
            return res.status(400).json({ error: 'Empresa inválida ou desconhecida.' });
        }

        const pool = await getPool();
        if (!pool) {
            return res.status(500).json({ error: 'Falha de conexão com o banco de dados Supra.' });
        }

        // Utilizando parameterização segura contra SQL Injection
        // Busca do cabeçalho
        const cabecalhoResult = await pool.request()
            .input('nota', sql.VarChar, numero)
            .query(`
                SELECT 
                    numero_nota, 
                    nome_natureza_operacao, 
                    data, 
                    valor_total, 
                    nome_contato, 
                    informacao_complementar 
                FROM ${dbName}.dbo.nota_fiscal_venda 
                WHERE numero_nota = @nota
            `);

        // Busca dos itens
        const itensResult = await pool.request()
            .input('nota', sql.VarChar, numero)
            .query(`
                SELECT 
                    i.prod_codigo,
                    p.nome AS produto_nome,
                    f.nome AS fabricante_nome,
                    i.classificacao_fiscal, 
                    i.quantidade, 
                    i.Unidade, 
                    i.valor_unitario, 
                    i.valor_total 
                FROM ${dbName}.dbo.nota_fiscal_venda_item i
                LEFT JOIN ${dbName}.dbo.produto p ON i.prod_codigo = p.codigo
                LEFT JOIN ${dbName}.dbo.fabricante f ON p.fabr_codigo = f.codigo
                WHERE i.nf_numero = @nota
            `);

        const data = {
            cabecalho: cabecalhoResult.recordset.length > 0 ? cabecalhoResult.recordset[0] : null,
            itens: itensResult.recordset || []
        };

        if (!data.cabecalho) {
            return res.status(404).json({ error: 'Nota fiscal não encontrada no Supra.' });
        }

        res.json(data);
    } catch (err) {
        console.error('Erro ao buscar detalhes da nota:', err);
        res.status(500).json({ error: 'Erro interno ao buscar detalhes da nota fiscal.' });
    }
});

module.exports = router;
