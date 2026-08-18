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

        // 1. Buscar os códigos de clientes que possuem títulos na base local
        const pgResult = await pgPool.query(`SELECT DISTINCT cod_cliente FROM titulos WHERE cod_cliente IS NOT NULL`);
        const validClientCodes = new Set(pgResult.rows.map(row => String(row.cod_cliente).trim()));

        // 2. Buscar os clientes no Supra
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

        // 3. Filtrar em memória para retornar apenas clientes com vendas
        const filteredClients = result.recordset.filter(client => {
            return validClientCodes.has(String(client.codigo).trim());
        });

        res.json(filteredClients);
    } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        res.status(500).json({ error: 'Erro ao buscar dados de clientes.' });
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
                t.data_vencimento AS "dataVencimento",
                t.data_pagamento AS "dataPagamento",
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
                    WHEN t.status IN ('ATRASADO', 'PENDENTE') THEN t.data_vencimento 
                END ASC,
                CASE 
                    WHEN t.status = 'PAGO' THEN t.data_vencimento 
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

// ==========================================
// HISTÓRICO DE COBRANÇA (PostgreSQL)
// ==========================================

// Buscar histórico de cobrança do cliente
router.get('/:id/historico', authMiddleware, async (req, res) => {
    try {
        const result = await pgPool.query(`
            SELECT 
                h.id, 
                h.tipo_contato, 
                h.resultado_contato, 
                h.descritivo_contato, 
                h.agendamento_data_contato, 
                h.agendamento_hora_contato, 
                h.agendamento_tipo_retorno_contato, 
                h.agendamento_nota_contato,
                h.created_at AT TIME ZONE 'UTC' AS created_at,
                c.nome_contato,
                u.nome AS usuario_nome
            FROM historico_cobranca h
            LEFT JOIN agenda_contatos c ON h.agenda_contato_id = c.id
            LEFT JOIN users u ON h.created_by = u.id
            WHERE h.codigo_cliente = $1
            ORDER BY h.created_at DESC
        `, [req.params.id]);

        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar histórico de cobrança:', err);
        res.status(500).json({ error: 'Erro ao buscar histórico de cobrança no banco de dados.' });
    }
});

// Cadastrar novo registro no histórico
router.post('/:id/historico', authMiddleware, async (req, res) => {
    const { 
        tipo_contato, 
        agenda_contato_id, 
        resultado_contato, 
        descritivo_contato, 
        agendamento_data_contato, 
        agendamento_hora_contato, 
        agendamento_tipo_retorno_contato, 
        agendamento_nota_contato,
        has_agendamento
    } = req.body;
    
    // Pegar o ID do usuário do token injetado pelo authMiddleware
    const created_by = req.user ? req.user.id : null;

    try {
        const result = await pgPool.query(`
            INSERT INTO historico_cobranca 
            (codigo_cliente, tipo_contato, agenda_contato_id, resultado_contato, descritivo_contato, 
             agendamento_data_contato, agendamento_hora_contato, agendamento_tipo_retorno_contato, agendamento_nota_contato, has_agendamento, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            req.params.id, 
            tipo_contato, 
            agenda_contato_id || null, 
            resultado_contato, 
            descritivo_contato, 
            agendamento_data_contato || null, 
            agendamento_hora_contato || null, 
            agendamento_tipo_retorno_contato || null, 
            agendamento_nota_contato || null, 
            has_agendamento || false,
            created_by
        ]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao cadastrar histórico de cobrança:', err);
        res.status(500).json({ error: 'Erro ao cadastrar histórico de cobrança no banco de dados.' });
    }
});

module.exports = router;
