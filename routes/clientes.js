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
                    [Telefone] AS telefone,
                    [Class_Cliente_2] AS classificacao
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
                t.data_emissao AS "dataEmissao",
                t.status AS "status"
            FROM titulos t
            LEFT JOIN contratos c ON t.contrato = c.codigo_contrato
            WHERE t.cod_cliente = $1
            ORDER BY 
                CASE t.status
                    WHEN 'ATRASADO' THEN 1
                    WHEN 'PENDENTE' THEN 2
                    WHEN 'PAGO' THEN 3
                    ELSE 4
                END ASC,
                CASE 
                    WHEN t.status IN ('ATRASADO', 'PENDENTE') THEN t.data_emissao 
                END ASC,
                CASE 
                    WHEN t.status = 'PAGO' THEN t.data_emissao 
                END DESC
        `, [req.params.id]);

        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar notas do cliente:', err);
        res.status(500).json({ error: 'Erro ao buscar notas do banco de dados.' });
    }
});
// ==========================================
// AGENDA DE CONTATOS (PostgreSQL)
// ==========================================

// Buscar contatos da agenda do cliente
router.get('/:id/contatos', authMiddleware, async (req, res) => {
    try {
        const result = await pgPool.query(`
            SELECT id, nome_contato, cargo_contato, telefone_contato, email_contato, observacao
            FROM agenda_contatos
            WHERE codigo_cliente = $1 AND ativo = true
            ORDER BY id DESC
        `, [req.params.id]);

        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar contatos da agenda:', err);
        res.status(500).json({ error: 'Erro ao buscar contatos do banco de dados.' });
    }
});

// Cadastrar novo contato na agenda
router.post('/:id/contatos', authMiddleware, async (req, res) => {
    const { nome, cargo, telefone, email, observacao } = req.body;
    
    if (!nome) {
        return res.status(400).json({ error: 'Nome do contato é obrigatório.' });
    }

    try {
        const result = await pgPool.query(`
            INSERT INTO agenda_contatos 
            (codigo_cliente, nome_contato, cargo_contato, telefone_contato, email_contato, observacao)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, nome_contato, cargo_contato, telefone_contato, email_contato, observacao
        `, [req.params.id, nome, cargo, telefone, email, observacao]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao cadastrar contato na agenda:', err);
        res.status(500).json({ error: 'Erro ao cadastrar contato no banco de dados.' });
    }
});

// Editar contato na agenda
router.put('/:id/contatos/:contatoId', authMiddleware, async (req, res) => {
    const { nome, cargo, telefone, email, observacao } = req.body;
    const { id, contatoId } = req.params;

    if (!nome) {
        return res.status(400).json({ error: 'Nome do contato é obrigatório.' });
    }

    try {
        const result = await pgPool.query(`
            UPDATE agenda_contatos 
            SET nome_contato = $1, cargo_contato = $2, telefone_contato = $3, email_contato = $4, observacao = $5
            WHERE id = $6 AND codigo_cliente = $7 AND ativo = true
            RETURNING id, nome_contato, cargo_contato, telefone_contato, email_contato, observacao
        `, [nome, cargo, telefone, email, observacao, contatoId, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Contato não encontrado ou inativo.' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao atualizar contato na agenda:', err);
        res.status(500).json({ error: 'Erro ao atualizar contato no banco de dados.' });
    }
});

// Deletar contato da agenda (Soft Delete)
router.delete('/:id/contatos/:contatoId', authMiddleware, async (req, res) => {
    const { id, contatoId } = req.params;

    try {
        const result = await pgPool.query(`
            UPDATE agenda_contatos 
            SET ativo = false 
            WHERE id = $1 AND codigo_cliente = $2
        `, [contatoId, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Contato não encontrado.' });
        }

        res.json({ success: true, message: 'Contato excluído com sucesso.' });
    } catch (err) {
        console.error('Erro ao deletar contato na agenda:', err);
        res.status(500).json({ error: 'Erro ao deletar contato no banco de dados.' });
    }
});

module.exports = router;
