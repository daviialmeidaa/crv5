const express = require('express');
const router = express.Router();
const { getPool } = require('../db/connection');
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

module.exports = router;
