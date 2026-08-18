const express = require('express');
const router = express.Router();
const pgPool = require('../db/pgConnection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbac');

// Middleware global: autenticação + permissão OPME
router.use(authMiddleware);
router.use(requirePermission('canViewOPME'));

// ==========================================
// GET /api/opme/contratos
// ==========================================
router.get('/contratos', async (req, res) => {
    try {
        let whereClause = 'WHERE inativo = false';
        if (req.query.inativos_only === 'true') {
            whereClause = 'WHERE inativo = true';
        } else if (req.query.inativo === 'true') {
            whereClause = '';
        }
        
        const result = await pgPool.query(`
            SELECT id, id_contrato, material, cod_cliente, cliente, uf, pregao, 
                   total_ata, inicio_ata, termino_ata, inativo
            FROM opme.contratos
            ${whereClause}
            ORDER BY id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('[OPME] Erro ao buscar contratos:', err.message);
        res.status(500).json({ error: 'Erro ao buscar contratos' });
    }
});
// ==========================================
// POST /api/opme/contratos
// ==========================================
router.post('/contratos', async (req, res) => {
    try {
        const { id_contrato, material, cod_cliente, cliente, uf, pregao, total_ata, inicio_ata, termino_ata } = req.body;
        
        if (!id_contrato || !cliente) {
            return res.status(400).json({ error: 'Cód. Contrato e Cliente são obrigatórios' });
        }

        const totalNumeric = total_ata ? parseFloat(total_ata.toString().replace(/[^\d,-]/g, '').replace(',', '.')) : null;

        const result = await pgPool.query(`
            INSERT INTO opme.contratos 
            (id_contrato, material, cod_cliente, cliente, uf, pregao, total_ata, inicio_ata, termino_ata, inativo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
            RETURNING id
        `, [
            id_contrato, material || null, cod_cliente || null, cliente, uf || null, 
            pregao || null, isNaN(totalNumeric) ? null : totalNumeric, 
            inicio_ata || null, termino_ata || null
        ]);

        res.json({ success: true, id: result.rows[0].id, message: 'Contrato criado com sucesso' });
    } catch (err) {
        console.error('[OPME] Erro ao criar contrato:', err.message);
        res.status(500).json({ error: 'Erro ao criar contrato' });
    }
});

// ==========================================
// PUT /api/opme/contratos/:id
// ==========================================
router.put('/contratos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { id_contrato, material, cod_cliente, cliente, uf, pregao, total_ata, inicio_ata, termino_ata } = req.body;
        
        if (!id_contrato || !cliente) {
            return res.status(400).json({ error: 'Cód. Contrato e Cliente são obrigatórios' });
        }

        const totalNumeric = total_ata ? parseFloat(total_ata.toString().replace(/[^\d,-]/g, '').replace(',', '.')) : null;

        await pgPool.query(`
            UPDATE opme.contratos SET 
                id_contrato = $1, material = $2, cod_cliente = $3, cliente = $4, 
                uf = $5, pregao = $6, total_ata = $7, inicio_ata = $8, termino_ata = $9
            WHERE id = $10
        `, [
            id_contrato, material || null, cod_cliente || null, cliente, uf || null, 
            pregao || null, isNaN(totalNumeric) ? null : totalNumeric, 
            inicio_ata || null, termino_ata || null, id
        ]);

        res.json({ success: true, message: 'Contrato atualizado com sucesso' });
    } catch (err) {
        console.error('[OPME] Erro ao atualizar contrato:', err.message);
        res.status(500).json({ error: 'Erro ao atualizar contrato' });
    }
});


// ==========================================
// PUT /api/opme/contratos/:id/status
// ==========================================
router.put('/contratos/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { inativo } = req.body;
        
        await pgPool.query(
            'UPDATE opme.contratos SET inativo = $1 WHERE id = $2',
            [inativo, id]
        );
        
        res.json({ success: true, message: 'Status do contrato atualizado com sucesso' });
    } catch (err) {
        console.error('[OPME] Erro ao atualizar status do contrato:', err.message);
        res.status(500).json({ error: 'Erro ao atualizar status do contrato' });
    }
});

// ==========================================
// GET /api/opme/kpis
// ==========================================
router.get('/kpis', async (req, res) => {
    try {
        const resultCirurgias = await pgPool.query(`
            SELECT 
                COUNT(DISTINCT c.paciente || c.data_cirurgia) FILTER (WHERE c.acao = 'CIRURGIA') AS cirurgias_realizadas,
                COUNT(DISTINCT c.paciente || c.data_cirurgia) FILTER (WHERE c.acao = 'CIRURGIA' AND (c.nota_fiscal IS NULL OR c.nota_fiscal = '' OR c.nota_fiscal = '0')) AS cirurgias_em_aberto,
                SUM(c.valor_total) FILTER (WHERE c.acao = 'CIRURGIA') AS total_cirurgias_realizadas,
                SUM(c.valor_total) FILTER (WHERE c.acao = 'CIRURGIA' AND (c.nota_fiscal IS NULL OR c.nota_fiscal = '' OR c.nota_fiscal = '0')) AS total_cirurgias_a_faturar,
                SUM(c.valor_total) FILTER (WHERE c.acao = 'CIRURGIA' AND (c.nota_fiscal IS NOT NULL AND c.nota_fiscal != '' AND c.nota_fiscal != '0')) AS total_faturado
            FROM opme.cirurgias c
            JOIN opme.contratos ct ON c.contrato = ct.id_contrato
            WHERE ct.inativo = false;
        `);

        const resultContratos = await pgPool.query(`
            SELECT inativo, COUNT(*) as qtd
            FROM opme.contratos
            GROUP BY inativo;
        `);

        let ativos = 0;
        let inativos = 0;
        for (const row of resultContratos.rows) {
            if (row.inativo === true) inativos = parseInt(row.qtd);
            if (row.inativo === false) ativos = parseInt(row.qtd);
        }
        
        const rowData = resultCirurgias.rows[0] || {};
        
        res.json({
            cirurgias_realizadas: rowData.cirurgias_realizadas || 0,
            cirurgias_em_aberto: rowData.cirurgias_em_aberto || 0,
            total_cirurgias_realizadas: rowData.total_cirurgias_realizadas || 0,
            total_cirurgias_a_faturar: rowData.total_cirurgias_a_faturar || 0,
            total_faturado: rowData.total_faturado || 0,
            contratos_ativos: ativos,
            contratos_inativos: inativos
        });
    } catch (err) {
        console.error('[OPME] Erro ao buscar KPIs:', err.message);
        res.status(500).json({ error: 'Erro ao buscar KPIs' });
    }
});

// ==========================================
// GET /api/opme/cirurgias?contrato=BIO687
// ==========================================
router.get('/cirurgias', async (req, res) => {
    try {
        const { contrato } = req.query;
        let query = 'SELECT * FROM opme.cirurgias';
        const params = [];
        
        if (contrato) {
            query += ' WHERE contrato = $1';
            params.push(contrato);
        }
        query += ' ORDER BY id DESC';
        
        const result = await pgPool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('[OPME] Erro ao buscar cirurgias:', err.message);
        res.status(500).json({ error: 'Erro ao buscar cirurgias' });
    }
});

// ==========================================
// GET /api/opme/unidades?contrato=BIO687
// ==========================================
router.get('/unidades', async (req, res) => {
    try {
        const { contrato } = req.query;
        let query = 'SELECT * FROM opme.unidades';
        const params = [];
        
        if (contrato) {
            query += ' WHERE contrato = $1';
            params.push(contrato);
        }
        query += ' ORDER BY id';
        
        const result = await pgPool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('[OPME] Erro ao buscar unidades:', err.message);
        res.status(500).json({ error: 'Erro ao buscar unidades' });
    }
});

// ==========================================
// POST /api/opme/unidades
// ==========================================
router.post('/unidades', async (req, res) => {
    try {
        const { contrato, cod_cliente, hospital, sigla } = req.body;
        
        if (!contrato) {
            return res.status(400).json({ error: 'O Cód. Contrato é obrigatório' });
        }

        const query = `
            INSERT INTO opme.unidades (contrato, cod_cliente, hospital, sigla)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const values = [contrato, cod_cliente || null, hospital || null, sigla || null];
        
        const result = await pgPool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('[OPME] Erro ao criar unidade:', err.message);
        res.status(500).json({ error: 'Erro ao criar unidade' });
    }
});

// ==========================================
// PUT /api/opme/unidades/:id
// ==========================================
router.put('/unidades/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { contrato, cod_cliente, hospital, sigla } = req.body;
        
        if (!contrato) {
            return res.status(400).json({ error: 'O Cód. Contrato é obrigatório' });
        }

        const query = `
            UPDATE opme.unidades 
            SET contrato = $1, cod_cliente = $2, hospital = $3, sigla = $4
            WHERE id = $5
            RETURNING *;
        `;
        const values = [contrato, cod_cliente || null, hospital || null, sigla || null, id];
        
        const result = await pgPool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Unidade não encontrada' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[OPME] Erro ao atualizar unidade:', err.message);
        res.status(500).json({ error: 'Erro ao atualizar unidade' });
    }
});
// ==========================================
// POST /api/opme/saldo-ata
// ==========================================
router.post('/saldo-ata', async (req, res) => {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Payload deve conter um array "items".' });
    }

    try {
        await pgPool.query('BEGIN');
        
        for (const item of items) {
            const { contrato, item_ata, descricao_item, quantidade_ata, valor_unitario, valor_total } = item;
            await pgPool.query(
                `INSERT INTO opme.saldoata (contrato, item_ata, descricao_item, quantidade_ata, valor_unitario, valor_total)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [contrato, item_ata, descricao_item, quantidade_ata, valor_unitario, valor_total]
            );
        }

        await pgPool.query('COMMIT');
        res.json({ message: 'Itens de saldo ata inseridos com sucesso.' });
    } catch (err) {
        await pgPool.query('ROLLBACK');
        console.error('[OPME] Erro ao inserir itens de saldo ata:', err.message);
        res.status(500).json({ error: 'Erro ao inserir itens de saldo ata.' });
    }
});

// ==========================================
// PUT /api/opme/saldo-ata/:id
// ==========================================
router.put('/saldo-ata/:id', async (req, res) => {
    const { id } = req.params;
    const { contrato, item_ata, descricao_item, quantidade_ata, valor_unitario, valor_total } = req.body;
    
    try {
        const result = await pgPool.query(
            `UPDATE opme.saldoata 
             SET contrato = $1, item_ata = $2, descricao_item = $3, quantidade_ata = $4, valor_unitario = $5, valor_total = $6
             WHERE id = $7 RETURNING *`,
            [contrato, item_ata, descricao_item, quantidade_ata, valor_unitario, valor_total, id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Item não encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[OPME] Erro ao atualizar item de saldo ata:', err.message);
        res.status(500).json({ error: 'Erro ao atualizar item de saldo ata.' });
    }
});

// ==========================================
// GET /api/opme/saldo-ata?contrato=BIO687
// ==========================================
router.get('/saldo-ata', async (req, res) => {
    try {
        const { contrato } = req.query;
        let query = `
            SELECT 
                s.*,
                COALESCE(c.qtd_utilizada, 0) AS quantidade_utilizada,
                s.quantidade_ata - COALESCE(c.qtd_utilizada, 0) AS saldo
            FROM opme.saldoata s
            LEFT JOIN (
                SELECT contrato, item_pregao, SUM(quantidade_utilizada) as qtd_utilizada
                FROM opme.cirurgias
                WHERE acao = 'CIRURGIA'
                GROUP BY contrato, item_pregao
            ) c ON s.contrato = c.contrato AND s.item_ata = c.item_pregao
        `;
        const params = [];
        
        if (contrato) {
            query += ' WHERE s.contrato = $1';
            params.push(contrato);
        }
        query += ' ORDER BY s.id';
        
        const result = await pgPool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('[OPME] Erro ao buscar saldo ata:', err.message);
        res.status(500).json({ error: 'Erro ao buscar saldo ata' });
    }
});

// ==========================================
// GET /api/opme/saldo-ata-hospital?contrato=BIO687
// ==========================================
router.get('/saldo-ata-hospital', async (req, res) => {
    try {
        const { contrato } = req.query;
        let query = `
            SELECT 
                s.*,
                COALESCE(c.qtd_utilizada, 0) AS quantidade_utilizada,
                s.quantidade_ata - COALESCE(c.qtd_utilizada, 0) AS saldo
            FROM opme.saldoatahospital s
            LEFT JOIN (
                SELECT contrato, item_pregao, local_cirurgia, SUM(quantidade_utilizada) as qtd_utilizada
                FROM opme.cirurgias
                WHERE acao = 'CIRURGIA'
                GROUP BY contrato, item_pregao, local_cirurgia
            ) c ON s.contrato = c.contrato AND s.item_ata = c.item_pregao AND s.unidade = c.local_cirurgia
        `;
        const params = [];
        
        if (contrato) {
            query += ' WHERE s.contrato = $1';
            params.push(contrato);
        }
        query += ' ORDER BY s.id';
        
        const result = await pgPool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('[OPME] Erro ao buscar saldo ata hospital:', err.message);
        res.status(500).json({ error: 'Erro ao buscar saldo ata hospital' });
    }
});

// ==========================================
// POST /api/opme/saldo-ata-hospital
// ==========================================
router.post('/saldo-ata-hospital', async (req, res) => {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Nenhum item enviado.' });
    }

    try {
        await pgPool.query('BEGIN');
        
        for (const item of items) {
            const { contrato, unidade, item_ata, descricao_item, quantidade_ata, valor_unitario, valor_total } = item;
            await pgPool.query(
                `INSERT INTO opme.saldoatahospital (contrato, unidade, item_ata, descricao_item, quantidade_ata, valor_unitario, valor_total)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [contrato, unidade, item_ata, descricao_item, quantidade_ata, valor_unitario, valor_total]
            );
        }

        await pgPool.query('COMMIT');
        res.json({ message: 'Itens de saldo ata hospital inseridos com sucesso.' });
    } catch (err) {
        await pgPool.query('ROLLBACK');
        console.error('[OPME] Erro ao inserir itens de saldo ata hospital:', err.message);
        res.status(500).json({ error: 'Erro ao inserir itens de saldo ata hospital.' });
    }
});

// ==========================================
// PUT /api/opme/saldo-ata-hospital/:id
// ==========================================
router.put('/saldo-ata-hospital/:id', async (req, res) => {
    const { id } = req.params;
    const { contrato, unidade, item_ata, descricao_item, quantidade_ata, valor_unitario, valor_total } = req.body;
    
    try {
        const result = await pgPool.query(
            `UPDATE opme.saldoatahospital 
             SET contrato = $1, unidade = $2, item_ata = $3, descricao_item = $4, quantidade_ata = $5, valor_unitario = $6, valor_total = $7
             WHERE id = $8 RETURNING *`,
            [contrato, unidade, item_ata, descricao_item, quantidade_ata, valor_unitario, valor_total, id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Item não encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[OPME] Erro ao atualizar item de saldo ata hospital:', err.message);
        res.status(500).json({ error: 'Erro ao atualizar item de saldo ata hospital.' });
    }
});

// ==========================================
// GET /api/opme/banco-codigos?contrato=BIO687
// ==========================================
router.get('/banco-codigos', async (req, res) => {
    try {
        const { contrato } = req.query;
        let query = 'SELECT * FROM opme.bancocodigos';
        const params = [];
        
        if (contrato) {
            query += ' WHERE contrato = $1';
            params.push(contrato);
        }
        query += ' ORDER BY id';
        
        const result = await pgPool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('[OPME] Erro ao buscar banco de códigos:', err.message);
        res.status(500).json({ error: 'Erro ao buscar banco de códigos' });
    }
});
// ==========================================
// GET /api/opme/produto-info
// Busca informações no bancocodigos e saldoata
// ==========================================
router.get('/produto-info', async (req, res) => {
    try {
        const { cod_bio, contrato } = req.query;
        
        if (!cod_bio || !contrato) {
            return res.status(400).json({ error: 'Parâmetros cod_bio e contrato são obrigatórios.' });
        }

        const query = `
            SELECT 
                bc.classificacao,
                bc.produto,
                bc.descricao_personalizada,
                bc.item_ata,
                sa.valor_unitario
            FROM opme.bancocodigos bc
            LEFT JOIN opme.saldoata sa 
                ON bc.contrato = sa.contrato AND bc.item_ata = sa.item_ata
            WHERE bc.cod_bio = $1 AND bc.contrato = $2
            LIMIT 1
        `;

        const result = await pgPool.query(query, [cod_bio, contrato]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Código não encontrado no banco de códigos do contrato.' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('[OPME] Erro ao buscar produto-info:', err.message);
        res.status(500).json({ error: 'Erro interno ao buscar informações do produto.' });
    }
});
// ==========================================
// POST /api/opme/cirurgias
// ==========================================
router.post('/cirurgias', async (req, res) => {
    const client = await pgPool.connect();
    try {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Payload inválido. Esperado array "items".' });
        }

        await client.query('BEGIN');

        for (const item of items) {
            const fields = [];
            const values = [];
            const placeholders = [];
            let i = 1;

            const insertColumns = [
                'contrato', 'acao', 'local_cirurgia', 'paciente', 'data_cirurgia', 
                'prontuario', 'medico', 'crm', 'cod_cliente', 'empenho', 'autorizacao', 
                'pedido', 'nota_fiscal', 'retorno_consignacao', 'status_expedicao', 
                'autorizacao_opme', 'cod_bio', 'classificacao', 'produto', 
                'descricao_personalizada', 'quantidade_utilizada', 'lote', 
                'valor_unitario', 'valor_total', 'item_pregao'
            ];

            for (const key of insertColumns) {
                if (item[key] !== undefined) {
                    fields.push(key);
                    placeholders.push(`$${i}`);
                    values.push(item[key] === '' ? null : item[key]);
                    i++;
                }
            }

            if (fields.length === 0) continue;

            const query = `INSERT INTO opme.cirurgias (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
            await client.query(query, values);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Cirurgia(s) criada(s) com sucesso' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[OPME] Erro ao criar cirurgias (POST):', err.message);
        res.status(500).json({ error: 'Erro ao criar cirurgias' });
    } finally {
        client.release();
    }
});
// ==========================================
// PUT /api/opme/cirurgias
// ==========================================
router.put('/cirurgias', async (req, res) => {
    const client = await pgPool.connect();
    try {
        const { items } = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Payload inválido. Esperado array "items".' });
        }

        await client.query('BEGIN');

        for (const item of items) {
            if (!item.id) continue; // Por ora, não inserimos novos, apenas damos update

            // Mapeando chaves do objeto para update
            const fields = [];
            const values = [];
            let i = 1;

            const updateableColumns = [
                'contrato', 'acao', 'local_cirurgia', 'paciente', 'data_cirurgia', 
                'prontuario', 'medico', 'crm', 'cod_cliente', 'empenho', 'autorizacao', 
                'pedido', 'nota_fiscal', 'retorno_consignacao', 'status_expedicao', 
                'autorizacao_opme', 'cod_bio', 'classificacao', 'produto', 
                'descricao_personalizada', 'quantidade_utilizada', 'lote', 
                'valor_unitario', 'valor_total'
            ];

            for (const key of updateableColumns) {
                if (item[key] !== undefined) {
                    fields.push(`${key} = $${i}`);
                    values.push(item[key] === '' ? null : item[key]);
                    i++;
                }
            }

            if (fields.length === 0) continue;

            const query = `UPDATE opme.cirurgias SET ${fields.join(', ')} WHERE id = $${i}`;
            values.push(item.id);

            await client.query(query, values);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Cirurgia(s) atualizada(s) com sucesso' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[OPME] Erro ao atualizar cirurgias (PUT):', err.message);
        res.status(500).json({ error: 'Erro ao atualizar cirurgias' });
    } finally {
        client.release();
    }
});

// ==========================================
// POST /api/opme/cirurgias/batch-delete
// ==========================================
router.post('/cirurgias/batch-delete', async (req, res) => {
    const client = await pgPool.connect();
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Array de IDs inválido ou vazio.' });
        }

        await client.query('BEGIN');

        // Proteção extra: a exclusão poderia exigir um role mais alto se controlássemos via middleware
        // Como o JS de frontend já bloqueia, vamos garantir a deleção via query segura
        const params = ids.map((_, idx) => `$${idx + 1}`).join(',');
        await client.query(`DELETE FROM opme.cirurgias WHERE id IN (${params})`, ids);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Itens da cirurgia excluídos com sucesso' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[OPME] Erro ao excluir cirurgias (DELETE):', err.message);
        res.status(500).json({ error: 'Erro ao excluir cirurgias' });
    } finally {
        client.release();
    }
});

module.exports = router;
