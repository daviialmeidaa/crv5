const express = require('express');
const router = express.Router();
const { getPool } = require('../db/connection');
const pgPool = require('../db/pgConnection');
const { authMiddleware } = require('../middleware/authMiddleware');

// Buscar a lista de clientes no Supra (Somente Leitura)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const pool = await getPool();
        if (!pool) {
            return res.status(503).json({ error: 'Servidor SQL Server (Supra) indisponível no momento.' });
        }

        const result = await pool.request().query(`
            SELECT 
                [Código] AS codigo, 
                [Nome_Razão_Social] AS razaoSocial, 
                [Nome_Fantasia] AS nomeFantasia, 
                [Cidade] AS cidade,
                [Estado] AS uf, 
                [CPF_CNPJ] AS cnpj 
            FROM SGC.dbo.bi_cadastro_clientes
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Erro ao buscar clientes no Supra:', err);
        res.status(500).json({ error: 'Erro ao buscar dados do Supra.' });
    }
});
// Buscar um cliente específico no Supra
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const pool = await getPool();
        if (!pool) {
            return res.status(503).json({ error: 'Servidor SQL Server (Supra) indisponível no momento.' });
        }

        const result = await pool.request()
            .input('codigo', req.params.id)
            .query(`
                SELECT 
                    [Código] AS codigo,
                    [Nome_Razão_Social] AS razaoSocial, 
                    [Nome_Fantasia] AS nomeFantasia, 
                    [CPF_CNPJ] AS cnpj,
                    [Tipo_Logradouro] AS tipoLogradouro,
                    [Logradouro] AS logradouro,
                    [Número] AS numero,
                    [Complemento] AS complemento,
                    [Bairro] AS bairro,
                    [CEP] AS cep,
                    [Cidade] AS cidade,
                    [Estado] AS uf,
                    [E_mail] AS email,
                    [DDD] AS ddd,
                    [Telefone] AS telefone
                FROM SGC.dbo.bi_cadastro_clientes
                WHERE [Código] = @codigo
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Erro ao buscar detalhes do cliente no Supra:', err);
        res.status(500).json({ error: 'Erro ao buscar dados do Supra.' });
    }
});


// Buscar as notas fiscais (títulos) do cliente no banco local PostgreSQL
router.get('/:id/notas', authMiddleware, async (req, res) => {
    try {
        const result = await pgPool.query(`
            SELECT 
                t.empresa AS "empresa",
                t.nota AS "nota",
                '' AS "posicao",
                t.contrato AS "contrato",
                c.edital AS "pregao",
                c.tipo_contrato AS "tipoContrato",
                c.classificacao AS "classificacao",
                t.empenho AS "empenho",
                t.documento AS "documento",
                t.valor_nota AS "valor",
                t.data_emissao AS "dataEmissao"
            FROM titulos t
            LEFT JOIN contratos c ON t.contrato = c.codigo_contrato
            WHERE t.cod_cliente = $1
            ORDER BY t.data_emissao DESC
        `, [req.params.id]);

        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar notas do cliente:', err);
        res.status(500).json({ error: 'Erro ao buscar notas do banco de dados.' });
    }
});

module.exports = router;
