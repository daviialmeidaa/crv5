const express = require('express');
const router = express.Router();
const pgPool = require('../db/pgConnection');
const { sql, getPool } = require("../db/connection");
const { authMiddleware } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/rbac');
const { getCache, setCache, clearCache } = require('../db/redis');

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
            SELECT id, id_contrato, empresa, material, cod_cliente, cliente, uf, pregao, 
                   total_ata, inicio_ata, termino_ata, inativo, decimais, casas
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
        const { id_contrato, empresa, material, cod_cliente, cliente, uf, pregao, total_ata, inicio_ata, termino_ata, descricao_detalhada, decimais, casas } = req.body;
        
        if (!id_contrato || !cliente) {
            return res.status(400).json({ error: 'Cód. Contrato e Cliente são obrigatórios' });
        }

        const totalNumeric = total_ata ? parseFloat(total_ata.toString().replace(/[^\d,-]/g, '').replace(',', '.')) : null;

        const result = await pgPool.query(`
            INSERT INTO opme.contratos 
            (id_contrato, empresa, material, cod_cliente, cliente, uf, pregao, total_ata, inicio_ata, termino_ata, inativo, descricao_detalhada, decimais, casas)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11, $12, $13)
            RETURNING id
        `, [
            id_contrato, empresa || null, material || null, cod_cliente || null, cliente, uf || null, 
            pregao || null, isNaN(totalNumeric) ? null : totalNumeric, 
            inicio_ata || null, termino_ata || null, descricao_detalhada ? true : false,
            decimais === true, casas || 2
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
        const { id_contrato, empresa, material, cod_cliente, cliente, uf, pregao, total_ata, inicio_ata, termino_ata, descricao_detalhada } = req.body;
        
        if (!id_contrato || !cliente) {
            return res.status(400).json({ error: 'Cód. Contrato e Cliente são obrigatórios' });
        }

        const totalNumeric = total_ata ? parseFloat(total_ata.toString().replace(/[^\d,-]/g, '').replace(',', '.')) : null;

        await pgPool.query(`
            UPDATE opme.contratos SET 
                id_contrato = $1, empresa = $2, material = $3, cod_cliente = $4, cliente = $5, 
                uf = $6, pregao = $7, total_ata = $8, inicio_ata = $9, termino_ata = $10,
                descricao_detalhada = $11
            WHERE id = $12
        `, [
            id_contrato, empresa || null, material || null, cod_cliente || null, cliente, uf || null, 
            pregao || null, isNaN(totalNumeric) ? null : totalNumeric, 
            inicio_ata || null, termino_ata || null, descricao_detalhada ? true : false, id
        ]);

        res.json({ success: true, message: 'Item atualizado com sucesso' });
        
        // Invalida o cache
        await clearCache(`opme:cirurgias:all`);
        await clearCache(`opme:cirurgias:${id_contrato}`);
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
        
        res.json({
            success: true,
            message: 'Sincronização concluída.',
            details: 'Status do contrato atualizado com sucesso'
        });
        
        // Invalida o cache
        await clearCache(`opme:cirurgias:all`);
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
        query += ' ORDER BY data_cirurgia DESC NULLS LAST, paciente ASC, id DESC';
        
        const cacheKey = `opme:cirurgias:${contrato || 'all'}`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const result = await pgPool.query(query, params);
        await setCache(cacheKey, result.rows, 3600); // 1 hora
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
        const { contrato, cod_cliente, hospital, sigla, ir, aliquota, observacoes } = req.body;
        
        if (!contrato) {
            return res.status(400).json({ error: 'O Cód. Contrato é obrigatório' });
        }

        const query = `
            INSERT INTO opme.unidades (contrato, cod_cliente, hospital, sigla, ir, aliquota, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const values = [contrato, cod_cliente || null, hospital || null, sigla || null, ir || false, aliquota || 0, observacoes || null];
        
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
        const { contrato, cod_cliente, hospital, sigla, ir, aliquota, observacoes } = req.body;
        
        if (!contrato) {
            return res.status(400).json({ error: 'O Cód. Contrato é obrigatório' });
        }

        const query = `
            UPDATE opme.unidades 
            SET contrato = $1, cod_cliente = $2, hospital = $3, sigla = $4, ir = $5, aliquota = $6, observacoes = $7
            WHERE id = $8
            RETURNING *;
        `;
        const values = [contrato, cod_cliente || null, hospital || null, sigla || null, ir || false, aliquota || 0, observacoes || null, id];
        
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
        
        const cacheKey = `opme:bancocodigos:${contrato || 'all'}`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const result = await pgPool.query(query, params);
        await setCache(cacheKey, result.rows, 3600);
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
// Helper: Gerar texto de Observação automaticamente
// ==========================================
async function generateObservacaoText(pgPool, ref, items) {
    try {
        const contratoCod = ref.contrato;
        const localSigla = ref.local_cirurgia;

        // 1) Buscar dados do contrato (pregão, empresa)
        const contratoRes = await pgPool.query(
            'SELECT pregao, empresa FROM opme.contratos WHERE id_contrato = $1 LIMIT 1',
            [contratoCod]
        );
        const contrato = contratoRes.rows[0] || {};
        const pregao = contrato.pregao || '';
        const empresa = contrato.empresa || '';

        // 2) Buscar dados da unidade (hospital, sigla, ir, aliquota, observacoes)
        const unidadeRes = await pgPool.query(
            'SELECT hospital, sigla, ir, aliquota, observacoes FROM opme.unidades WHERE contrato = $1 AND sigla = $2 LIMIT 1',
            [contratoCod, localSigla]
        );
        const unidade = unidadeRes.rows[0] || {};

        // 3) Calcular valor total da cirurgia (somar valor_total de todos os itens)
        let totalNota = 0;
        for (const item of items) {
            const vt = parseFloat(item.valor_total);
            if (!isNaN(vt)) totalNota += vt;
        }

        // 4) Montar a primeira linha: CONTRATO | PE PREGAO | EMPENHO: xxx | AF: xxx
        const partes = [contratoCod];
        if (pregao) partes.push(`PE ${pregao}`);
        
        const isValidValue = (val) => {
            if (!val) return false;
            const str = String(val).trim();
            return str !== '' && str !== '-' && str !== "'";
        };

        const empenhos = [...new Set(items.map(i => i.empenho).filter(isValidValue))];
        const autorizacoes = [...new Set(items.map(i => i.autorizacao).filter(isValidValue))];

        if (empenhos.length > 0) partes.push(`EMPENHO: ${empenhos.join(' / ')}`);
        if (autorizacoes.length > 0) partes.push(`AF: ${autorizacoes.join(' / ')}`);

        let texto = partes.join(' | ');

        // 5) Bloco de dados do paciente
        texto += '\n';
        texto += `\nPACIENTE: ${ref.paciente || ''}`;

        // Formatar data para dd/mm/yyyy
        let dataFormatada = '';
        if (ref.data_cirurgia) {
            const d = new Date(ref.data_cirurgia);
            if (!isNaN(d.getTime())) {
                dataFormatada = d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            } else {
                dataFormatada = ref.data_cirurgia;
            }
        }
        texto += `\nDATA CIRURGIA: ${dataFormatada}`;

        if (ref.medico) {
            texto += `\nMÉDICO: ${ref.medico}`;
        }
        if (ref.crm) {
            texto += `\nCRM: ${ref.crm}`;
        }

        // 6) Local da cirurgia
        const nomeHospital = unidade.hospital || localSigla || '';
        const siglaUnidade = unidade.sigla || '';
        if (nomeHospital && siglaUnidade) {
            texto += `\n\nLOCAL DA CIRURGIA: ${nomeHospital} - ${siglaUnidade}`;
        } else if (nomeHospital) {
            texto += `\n\nLOCAL DA CIRURGIA: ${nomeHospital}`;
        }

        // 7) Dados bancários conforme empresa
        if (empresa === 'Nexomed') {
            texto += '\nBANCO BRASIL, AG: 1614-4, CC: 101018-2';
        } else if (empresa === 'Bml') {
            texto += '\nBANCO BRASIL, AG: 1614-4, CC: 201018-6';
        }

        // 8) Se a unidade tem IR, mostrar observações da unidade + cálculo pela alíquota
        if (unidade.ir === true && unidade.observacoes) {
            const aliquota = parseFloat(unidade.aliquota) || 0;
            const irValor = totalNota * (aliquota / 100);
            const aliquotaStr = String(aliquota).replace('.', ',');
            const irFormatado = irValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 5 });
            texto += `\n\n${unidade.observacoes} de ${aliquotaStr}% = R$ ${irFormatado}`;
        }

        return texto.trim();
    } catch (err) {
        console.error('[OPME] Erro ao gerar observação automática:', err.message);
        return '';
    }
}

// ==========================================
// POST /api/opme/cirurgias/sync-notas
// ==========================================
router.post('/cirurgias/sync-notas', async (req, res) => {
    try {
        const { contrato } = req.body;
        if (!contrato) return res.status(400).json({ error: 'Contrato não informado' });

        let cirurgiasResult = await pgPool.query(`
            SELECT id, cod_bio, pedido, nota_fiscal 
            FROM opme.cirurgias 
            WHERE contrato = $1 
              AND pedido IS NOT NULL 
        `, [contrato]);

        if (cirurgiasResult.rows.length === 0) {
            return res.json({ message: 'Nenhuma cirurgia com pedido gerado para sincronizar.', updated: 0, removed: 0 });
        }

        let pedidos = [...new Set(cirurgiasResult.rows.map(r => r.pedido))];
        if (pedidos.length === 0) {
            return res.json({ message: 'Nenhuma cirurgia pendente de nota com pedido gerado.', updated: 0 });
        }

        const contratoRes = await pgPool.query('SELECT empresa FROM opme.contratos WHERE id_contrato = $1', [contrato]);
        if (contratoRes.rows.length === 0) {
            return res.status(404).json({ error: 'Contrato não encontrado' });
        }
        
        const empresa = contratoRes.rows[0].empresa;
        if (!empresa) return res.status(400).json({ error: 'Contrato não tem empresa definida (SGC/BML)' });

        const viewDbName = empresa.toLowerCase() === 'bml' ? 'SGC2' : 'SGC';
        const viewName = empresa.toLowerCase() === 'bml' ? 'bml_pedidos_x_nf' : 'bio_pedidos_x_nf';
        const sgcDbName = empresa.toLowerCase() === 'bml' ? 'SGC2' : 'SGC';

        const mssqlPool = await getPool();
        
        const pedidosStr = pedidos.join(',');
        const nfRes = await mssqlPool.request().query(`
            SELECT Numero_Pedido, Numero_Nota 
            FROM ${viewDbName}.dbo.${viewName} 
            WHERE Numero_Pedido IN (${pedidosStr})
        `);

        if (nfRes.recordset.length === 0) {
            return res.json({ message: 'Nenhuma nota fiscal encontrada no Supra para os pedidos pendentes.', updated: 0 });
        }

        const nfMap = {};
        const nfs = [];
        for (const row of nfRes.recordset) {
            nfMap[row.Numero_Nota] = row.Numero_Pedido;
            nfs.push(row.Numero_Nota);
        }
        
        const nfsStr = nfs.join(',');
        const cabRes = await mssqlPool.request().query(`
            SELECT codigo, numero_nota, id_situacao_nfe 
            FROM ${sgcDbName}.dbo.nota_fiscal_venda 
            WHERE numero_nota IN (${nfsStr})
        `);

        const codigoToNf = {};
        const codigos = [];
        const notasTransmitidas = new Set();
        
        for (const row of cabRes.recordset) {
            codigoToNf[row.codigo] = row.numero_nota;
            codigos.push(row.codigo);
            // Considera apenas notas "Transmitida" (id_situacao_nfe = 2)
            if (row.id_situacao_nfe === 2) {
                notasTransmitidas.add(row.numero_nota.toString());
            }
        }

        if (codigos.length === 0) {
            return res.json({ message: 'Notas Fiscais encontradas na view, mas não na tabela principal do Supra.', updated: 0, removed: 0 });
        }

        const codigosStr = codigos.join(',');
        const itemRes = await mssqlPool.request().query(`
            SELECT nf_numero, prod_codigo 
            FROM ${sgcDbName}.dbo.nota_fiscal_venda_item 
            WHERE nf_numero IN (${codigosStr})
        `);

        // Mapeia (pedido_codBio) -> numeroNota (apenas notas transmitidas)
        const supraNotesMap = {};
        for (const item of itemRes.recordset) {
            const numeroNota = codigoToNf[item.nf_numero];
            const numeroPedido = nfMap[numeroNota];
            const prodCodigoStr = item.prod_codigo;
            
            if (notasTransmitidas.has(numeroNota.toString()) && numeroNota.toString() !== '0') {
                const key = `${numeroPedido}_${prodCodigoStr}`;
                supraNotesMap[key] = numeroNota.toString();
            }
        }

        let updatedCount = 0;
        let removedCount = 0;
        
        for (const row of cirurgiasResult.rows) {
            if (!row.cod_bio) continue;
            
            const key = `${row.pedido}_${row.cod_bio.toString()}`;
            const supraNota = supraNotesMap[key];
            
            if (supraNota) {
                // Existe nota transmitida no Supra para este produto
                if (row.nota_fiscal !== supraNota) {
                    await pgPool.query(`
                        UPDATE opme.cirurgias 
                        SET nota_fiscal = $1, status_expedicao = 'Ok' 
                        WHERE id = $2
                    `, [supraNota, row.id]);
                    updatedCount++;
                }
            } else {
                // NÃO existe nota transmitida no Supra para este produto
                if (row.nota_fiscal && row.nota_fiscal !== '') {
                    await pgPool.query(`
                        UPDATE opme.cirurgias 
                        SET nota_fiscal = NULL, status_expedicao = '' 
                        WHERE id = $1
                    `, [row.id]);
                    removedCount++;
                }
            }
        }
        
        // Limpa o cache para garantir que a grid carregue as NFs atualizadas
        await clearCache(`opme:cirurgias:all`);
        await clearCache(`opme:cirurgias:${contrato}`);
        
        res.json({ message: 'Sincronização finalizada com sucesso.', updated: updatedCount, removed: removedCount });

    } catch (err) {
        console.error('[OPME] Erro ao sincronizar notas fiscais:', err.message);
        res.status(500).json({ error: 'Erro ao sincronizar notas fiscais' });
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
        
        // PREVENÇÃO DE DESINCRONISMO (VBA): Sincroniza a sequence com o MAIOR ID real antes de inserir
        await client.query(`SELECT setval('opme.cirurgias_id_seq', COALESCE((SELECT MAX(id) FROM opme.cirurgias), 1))`);
        
        let newId = null;

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
                    let val = item[key] === '' ? null : item[key];
                    if (val !== null && ['nota_fiscal', 'pedido', 'empenho', 'autorizacao'].includes(key)) {
                        const s = String(val).trim();
                        if (s === '-' || s === "'" || s === '0') val = null;
                    }
                    values.push(val);
                    i++;
                }
            }

            if (fields.length === 0) continue;

            const query = `INSERT INTO opme.cirurgias (${fields.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`;
            const result = await client.query(query, values);
            if (!newId) newId = result.rows[0].id;
        }

        await client.query('COMMIT');

        // ==========================================
        // Gerar Observação Automática (após COMMIT)
        // ==========================================
        try {
            const ref = items[0]; // Referência: dados comuns da cirurgia
            const dateStr = ref.data_cirurgia ? String(ref.data_cirurgia).split('T')[0] : '';
            const cirurgiaId = `${ref.contrato}_${ref.paciente}_${dateStr}`.toUpperCase().replace(/\s+/g, '_');

            const obsTexto = await generateObservacaoText(pgPool, ref, items);

            if (obsTexto && cirurgiaId.length > 5) {
                await pgPool.query(`
                    INSERT INTO opme.observacoes (contrato, cirurgia, observacao)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (cirurgia) DO UPDATE
                    SET observacao = EXCLUDED.observacao, contrato = EXCLUDED.contrato
                `, [ref.contrato, cirurgiaId, obsTexto]);
            }
        } catch (obsErr) {
            // Não falha a operação principal se a observação der erro
            console.error('[OPME] Erro ao gerar observação automática (não-fatal):', obsErr.message);
        }

        // Invalida o cache ANTES de enviar a resposta
        await clearCache(`opme:cirurgias:all`);
        if (items.length > 0 && items[0].contrato) {
            await clearCache(`opme:cirurgias:${items[0].contrato}`);
        }

        res.json({ success: true, message: 'Nova cirurgia criada com sucesso.', id: newId });
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
        const { items, deletedIds, contrato } = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Payload inválido. Esperado array "items".' });
        }

        await client.query('BEGIN');

        // PREVENÇÃO DE DESINCRONISMO (VBA): Sincroniza a sequence com o MAIOR ID real antes de inserir novos itens na edição
        await client.query(`SELECT setval('opme.cirurgias_id_seq', COALESCE((SELECT MAX(id) FROM opme.cirurgias), 1))`);

        // Deletar itens removidos pelo usuário na edição
        if (Array.isArray(deletedIds) && deletedIds.length > 0) {
            const safeIds = deletedIds.filter(id => Number.isInteger(Number(id)));
            if (safeIds.length > 0) {
                const params = safeIds.map((_, idx) => `$${idx + 1}`).join(',');
                await client.query(`DELETE FROM opme.cirurgias WHERE id IN (${params})`, safeIds.map(Number));
            }
        }

        for (const item of items) {
            if (!item.id) {
                // Inserir novo item adicionado na edição da cirurgia
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
                        let val = item[key] === '' ? null : item[key];
                    if (val !== null && ['nota_fiscal', 'pedido', 'empenho', 'autorizacao'].includes(key)) {
                        const s = String(val).trim();
                        if (s === '-' || s === "'" || s === '0') val = null;
                    }
                    values.push(val);
                        i++;
                    }
                }

                if (fields.length > 0) {
                    const query = `INSERT INTO opme.cirurgias (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
                    await client.query(query, values);
                }
                continue;
            }

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
                    let val = item[key] === '' ? null : item[key];
                    if (val !== null && ['nota_fiscal', 'pedido', 'empenho', 'autorizacao'].includes(key)) {
                        const s = String(val).trim();
                        if (s === '-' || s === "'" || s === '0') val = null;
                    }
                    values.push(val);
                    i++;
                }
            }

            if (fields.length === 0) continue;

            const query = `UPDATE opme.cirurgias SET ${fields.join(', ')} WHERE id = $${i}`;
            values.push(item.id);

            await client.query(query, values);
        }

        await client.query('COMMIT');

        // Invalida o cache ANTES de enviar a resposta para evitar race conditions no frontend
        await clearCache(`opme:cirurgias:all`);
        const targetContrato = contrato || (items.length > 0 ? items[0].contrato : null);
        if (targetContrato) await clearCache(`opme:cirurgias:${targetContrato}`);

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
        const { ids, contrato } = req.body;
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
        
        // Invalida o cache
        await clearCache(`opme:cirurgias:all`);
        if (contrato) await clearCache(`opme:cirurgias:${contrato}`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[OPME] Erro ao excluir cirurgias (DELETE):', err.message);
        res.status(500).json({ error: 'Erro ao excluir cirurgias' });
    } finally {
        client.release();
    }
});
// ==========================================
// POST /api/opme/cirurgias/gerar-pedido
// ==========================================
router.post('/cirurgias/gerar-pedido', async (req, res) => {
    try {
        const { contrato, paciente, data_cirurgia, observacao } = req.body;
        
        if (!contrato || !paciente || !data_cirurgia) {
            return res.status(400).json({ error: 'Contrato, Paciente e Data da Cirurgia são obrigatórios.' });
        }

        // 1. Salvar observação localmente (Upsert)
        if (observacao !== undefined) {
            const cirurgiaKey = `${paciente}_${data_cirurgia}`;
            await pgPool.query(`
                INSERT INTO opme.observacoes (contrato, cirurgia, observacao)
                VALUES ($1, $2, $3)
                ON CONFLICT (cirurgia) DO UPDATE 
                SET observacao = EXCLUDED.observacao, contrato = EXCLUDED.contrato
            `, [contrato, cirurgiaKey, observacao]);
        }

        // 2. Buscar itens da cirurgia e info do contrato
        const cirurgiaRes = await pgPool.query(`
            SELECT c.*, ct.empresa, ct.descricao_detalhada 
            FROM opme.cirurgias c
            LEFT JOIN opme.contratos ct ON c.contrato = ct.id_contrato
            WHERE c.contrato = $1 AND c.paciente = $2 AND c.data_cirurgia = $3
        `, [contrato, paciente, data_cirurgia]);

        const items = cirurgiaRes.rows;
        if (items.length === 0) {
            return res.status(404).json({ error: 'Nenhum item encontrado para esta cirurgia.' });
        }

        const ref = items[0];
        if (ref.pedido) {
            return res.status(400).json({ error: 'Esta cirurgia já possui um pedido gerado.' });
        }

        if (!ref.empresa) {
            return res.status(400).json({ error: 'O contrato vinculado não possui empresa definida (Nexomed ou Bml).' });
        }

        let dbName, vendCodigo;
        if (ref.empresa.toUpperCase() === 'NEXOMED') {
            dbName = 'SGC';
            vendCodigo = 4;
        } else if (ref.empresa.toUpperCase() === 'BML') {
            dbName = 'SGC2';
            vendCodigo = 22;
        } else {
            return res.status(400).json({ error: 'Empresa inválida no contrato (deve ser Nexomed ou Bml).' });
        }

        let bancoCodigosMap = {};
        if (ref.descricao_detalhada) {
            const bcRes = await pgPool.query(`SELECT cod_bio, descricao_personalizada, produto FROM opme.bancocodigos WHERE contrato = $1`, [contrato]);
            for (const row of bcRes.rows) {
                bancoCodigosMap[row.cod_bio] = {
                    descricao_personalizada: row.descricao_personalizada,
                    produto: row.produto
                };
            }
        }

        const empenho = ref.autorizacao || ref.empenho || '';
        const cliforCodigo = ref.cod_cliente || 0;
        
        // Determinar observações (padrão vs nota fiscal)
        let obsPedido = observacao || '';
        let obsNotaFiscal = observacao || '';

        const unidadeRes = await pgPool.query(`SELECT ir, observacoes FROM opme.unidades WHERE contrato = $1 AND cod_cliente = $2`, [contrato, cliforCodigo]);
        if (unidadeRes.rows.length > 0) {
            const unid = unidadeRes.rows[0];
            if (unid.ir && unid.observacoes && unid.observacoes.trim() !== '') {
                // O texto que vem do front já traz a observação de IR calculada.
                // Na nota fiscal fica o texto completo.
                obsNotaFiscal = observacao || '';
                
                // No pedido, removemos o bloco de IR (localizamos o início da string de observação da unidade e cortamos)
                const obsBase = unid.observacoes.trim();
                const idx = obsPedido.indexOf(obsBase);
                if (idx !== -1) {
                    obsPedido = obsPedido.substring(0, idx).trim();
                }
            }
        }
        
        const pool = await getPool();
        let success = false;
        let novoCodigo = 0;
        let attempt = 1;
        let lastError = null;

        while (attempt <= 3 && !success) {
            const transaction = new sql.Transaction(pool);
            try {
                await transaction.begin();

                // Lock the table logic or just get MAX + 1. Using UPDLOCK + SERIALIZABLE ensures no one else can read MAX until we commit
                const reqCode = new sql.Request(transaction);
                const codeRes = await reqCode.query(`SELECT ISNULL(MAX(codigo), 0) + 1 AS newCode FROM ${dbName}.dbo.pedido WITH (UPDLOCK, SERIALIZABLE)`);
                novoCodigo = codeRes.recordset[0].newCode;

                let valorTotal = 0;
                let quantidadeTotal = 0;
                for (const item of items) {
                    const qtd = item.quantidade_utilizada || 0;
                    const vlr = item.valor_unitario || 0;
                    valorTotal += (qtd * vlr);
                    quantidadeTotal += qtd;
                }

                const reqInsert = new sql.Request(transaction);
                reqInsert.input('obs_pedido', sql.NVarChar(sql.MAX), obsPedido);
                reqInsert.input('obs_nota_fiscal', sql.NVarChar(sql.MAX), obsNotaFiscal);
                reqInsert.input('contato', sql.NVarChar(40), contrato || '');
                reqInsert.input('empenho', sql.NVarChar(40), empenho || '');
                await reqInsert.query(`
                    INSERT INTO ${dbName}.dbo.pedido (
                        codigo, numero_pedido, clifor_codigo, data, data_entrega, tipoped_codigo, 
                        vend_codigo, condpg_codigo, cob_codigo, id_situacao, numero_empenho_compra_publica,
                        listapr_codigo, empr_codigo, observacao, observacao_nota_fiscal, nome_contato,
                        valor_total, quantidade_total_produtos, id_estoque, id_frete, 
                        id_faturamento, id_nota_fiscal, id_emissao_nota_fiscal, vend_codigo_2
                    ) VALUES (
                        ${novoCodigo}, ${novoCodigo}, ${cliforCodigo}, GETDATE(), GETDATE(), 57,
                        ${vendCodigo}, 2, 1, 3, @empenho,
                        1, 0, @obs_pedido, @obs_nota_fiscal, @contato,
                        ${valorTotal}, ${quantidadeTotal}, 1, 1, 1, 1, 1, ${vendCodigo}
                    )
                `);

                let novoItemCodigo = 0;

                for (const item of items) {
                    novoItemCodigo++;
                    const prodCod = item.cod_bio || 0;
                    const qtd = item.quantidade_utilizada || 0;
                    
                    // Fetch product details
                    const reqProd = new sql.Request(transaction);
                    const prodRes = await reqProd.query(`
                        SELECT descricao, preco_venda, preco_custo, codigo_cst, unid_unidade 
                        FROM ${dbName}.dbo.produto 
                        WHERE codigo = '${prodCod}'
                    `);
                    
                    let pDescricao = '';
                    let pPrecoVenda = 0;
                    let pPrecoCusto = 0;
                    let pCst = '040';
                    let pUnid = 'UN';

                    if (prodRes.recordset.length > 0) {
                        const p = prodRes.recordset[0];
                        pDescricao = p.descricao || '';
                        pPrecoVenda = p.preco_venda || 0;
                        pPrecoCusto = p.preco_custo || 0;
                        pCst = p.codigo_cst || '040';
                        pUnid = p.unid_unidade || 'UN';
                    }
                    
                    // Use item's price as-is (it may be 0 for bundled/bonus items)
                    let vlr = item.valor_unitario !== undefined && item.valor_unitario !== null ? parseFloat(item.valor_unitario) : 0;
                    
                    // Use custom description if provided, otherwise fallback to product description
                    let finalDescricao = '';

                    if (ref.descricao_detalhada && bancoCodigosMap[prodCod]) {
                        const bcItem = bancoCodigosMap[prodCod];
                        if (bcItem.descricao_personalizada && bcItem.descricao_personalizada.trim() !== '') {
                            finalDescricao = bcItem.descricao_personalizada;
                        } else if (bcItem.produto && bcItem.produto.trim() !== '') {
                            finalDescricao = bcItem.produto;
                        } else {
                            finalDescricao = pDescricao;
                        }
                    } else {
                        finalDescricao = item.descricao_personalizada && item.descricao_personalizada.trim() !== '' 
                            ? item.descricao_personalizada 
                            : pDescricao;
                    }
                    
                    // Clean description from quotes
                    finalDescricao = finalDescricao.replace(/'/g, "''").trim();
                    
                    const reqItem = new sql.Request(transaction);
                    await reqItem.query(`
                        INSERT INTO ${dbName}.dbo.pedido_item (
                            codigo, ped_codigo, prod_codigo, quantidade, valor_unitario, 
                            quantidade_comercializacao, valor_unitario_comercializacao, descricao,
                            unidade, unid_unidade_comercializacao, unidade_tributacao, quantidade_tributacao,
                            id_desconto_acrescimo, id_base_calculo_st, id_calculo_preco,
                            id_metodo_calculo_preco_venda, codigo_cst, valor_custo, 
                            valor_unitario_cadastro, preco_custo_produto,
                            valor_frete, aliquota_icms, margem_lucro, valor_ipi, valor_outra_despesa,
                            aliquota_reducao_icms, percentual_desconto_acrescimo, valor_desc_acresc_item,
                            valor_desc_acresc_rateio, valor_base_calculo_icms_substituicao,
                            valor_substituicao_tributaria, valor_despesa_acessoria_rateio, margem_valor_agregado,
                            valor_unitario_sugerido
                        ) VALUES (
                            ${novoItemCodigo}, ${novoCodigo}, '${prodCod}', ${qtd}, ${vlr},
                            ${qtd}, ${vlr}, '${finalDescricao}',
                            '${pUnid}', '${pUnid}', '${pUnid}', ${qtd},
                            1, 1, 4,
                            1, '${pCst}', ${pPrecoCusto},
                            ${pPrecoCusto}, ${pPrecoCusto},
                            0, 0, 0, 0, 0,
                            0, 0, 0,
                            0, 0,
                            0, 0, 0,
                            ${pPrecoCusto}
                        )
                    `);
                }

                // Follow-up 
                const usuIdHub = 59; // ID placeholder for integration user
                const reqFollow = new sql.Request(transaction);
                await reqFollow.query(`
                    INSERT INTO ${dbName}.dbo.pedido_follow_up (
                        ped_codigo, data, usu_codigo, id_movimentacao, id_historico_follow_up, historico
                    ) VALUES (
                        ${novoCodigo}, GETDATE(), 
                        ${usuIdHub}, 1, 1, 'Gerado automaticamente via Hub'
                    )
                `);

                await transaction.commit();
                success = true;

                // Salvar log no pgPool
                await pgPool.query(`
                    INSERT INTO opme.supra_logs (banco, metodo, tabela, log) 
                    VALUES ($1, $2, $3, $4)
                `, [dbName, 'INSERT', 'dbo.pedido', `Criado pedido ${novoCodigo} com ${items.length} itens. Cliente: ${cliforCodigo}`]);

            } catch (err) {
                if (transaction) {
                    try { await transaction.rollback(); } catch(e) {}
                }
                lastError = err;
                console.warn(`Tentativa ${attempt} falhou ao inserir no Supra: `, err.message);
                attempt++;
            }
        }

        if (!success) {
            console.error('Falha ao gerar pedido após retentativas:', lastError);
            return res.status(500).json({ error: 'Falha ao gerar pedido no ERP Supra.', details: lastError?.message });
        }

        // 3. Atualizar registros no PostgreSQL
        await pgPool.query(`
            UPDATE opme.cirurgias 
            SET pedido = $1
            WHERE contrato = $2 AND paciente = $3 AND data_cirurgia::date = $4::date
        `, [novoCodigo.toString(), contrato, paciente, data_cirurgia]);

        // Limpar cache para que a grid principal reflita a mudança imediatamente
        await clearCache(`opme:cirurgias:all`);
        if (contrato) await clearCache(`opme:cirurgias:${contrato}`);

        res.json({ success: true, pedido: novoCodigo });
    } catch (err) {
        console.error('[OPME] Erro geral ao criar pedido supra:', err);
        res.status(500).json({ error: 'Erro interno ao criar pedido.', details: err.stack || err.message || String(err) });
    }
});

// ==========================================
// GET /api/opme/observacoes/generate
// Gera a observação on-the-fly a partir dos dados no banco
// ==========================================
router.get('/observacoes/generate', async (req, res) => {
    try {
        const { contrato, paciente, data_cirurgia } = req.query;

        if (!contrato || !paciente || !data_cirurgia) {
            return res.status(400).json({ error: 'Parâmetros contrato, paciente e data_cirurgia são obrigatórios' });
        }

        // Buscar os itens desta cirurgia no banco
        const itemsRes = await pgPool.query(
            `SELECT * FROM opme.cirurgias 
             WHERE contrato = $1 AND paciente = $2 AND data_cirurgia::date = $3::date`,
            [contrato, paciente, data_cirurgia]
        );

        if (itemsRes.rows.length === 0) {
            return res.json({ observacao: '' });
        }

        const items = itemsRes.rows;
        const ref = items[0];
        const obsTexto = await generateObservacaoText(pgPool, ref, items);

        res.json({ observacao: obsTexto });
    } catch (err) {
        console.error('[OPME] Erro ao gerar observação dinâmica:', err.message);
        res.status(500).json({ error: 'Erro ao gerar observação' });
    }
});

// ==========================================
// GET /api/opme/observacoes/:cirurgia
// ==========================================
router.get('/observacoes/:cirurgia', async (req, res) => {
    try {
        const { cirurgia } = req.params;
        const result = await pgPool.query('SELECT observacao FROM opme.observacoes WHERE cirurgia = $1', [cirurgia]);
        if (result.rows.length > 0) {
            res.json({ observacao: result.rows[0].observacao });
        } else {
            res.json({ observacao: '' });
        }
    } catch (err) {
        console.error('[OPME] Erro ao buscar observação da cirurgia:', err.message);
        res.status(500).json({ error: 'Erro ao buscar observação' });
    }
});

// ==========================================
// POST /api/opme/observacoes
// ==========================================
router.post('/observacoes', async (req, res) => {
    try {
        const { contrato, cirurgia, observacao } = req.body;

        if (!cirurgia) {
            return res.status(400).json({ error: 'Identificador da cirurgia é obrigatório' });
        }

        // Upsert na tabela de observacoes
        await pgPool.query(`
            INSERT INTO opme.observacoes (contrato, cirurgia, observacao)
            VALUES ($1, $2, $3)
            ON CONFLICT (cirurgia) DO UPDATE 
            SET observacao = EXCLUDED.observacao, contrato = EXCLUDED.contrato
        `, [contrato, cirurgia, observacao || '']);

        res.json({ success: true });
    } catch (err) {
        console.error('[OPME] Erro ao salvar observação da cirurgia:', err.message);
        res.status(500).json({ error: 'Erro ao salvar observação' });
    }
});

module.exports = router;
