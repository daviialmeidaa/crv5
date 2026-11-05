const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db/connection');
const pgPool = require('../db/pgConnection');
const { authMiddleware } = require('../middleware/authMiddleware');
const { DANFe } = require('node-sped-pdf');
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
        const valorFiltro = req.query.valor;
        const documento = req.query.documento;

        let clifor_codigo = null;
        if (documento) {
            try {
                const empresaPg = empresa.toUpperCase() === 'NEXOMED' ? 'Nexomed' : 'BML';
                const pgRes = await pgPool.query(`SELECT cod_cliente FROM titulos WHERE empresa = $1 AND documento = $2`, [empresaPg, documento]);
                if (pgRes.rows.length > 0) {
                    clifor_codigo = pgRes.rows[0].cod_cliente;
                }
            } catch (err) {
                console.error('Erro ao buscar clifor_codigo no PostgreSQL:', err);
            }
        }

        let queryCabecalho = `
            SELECT 
                codigo,
                clifor_codigo,
                numero_nota, 
                nome_natureza_operacao, 
                data, 
                valor_total, 
                nome_contato, 
                informacao_complementar 
            FROM ${dbName}.dbo.nota_fiscal_venda 
            WHERE numero_nota = @nota
        `;

        const requestCabecalho = pool.request().input('nota', sql.VarChar, numero);
        
        if (clifor_codigo) {
            queryCabecalho += ` AND clifor_codigo = @clifor_codigo`;
            requestCabecalho.input('clifor_codigo', sql.Int, parseInt(clifor_codigo));
        } else if (valorFiltro) {
            // Fallback para manter retrocompatibilidade caso documento nao seja passado
            const valorNum = parseFloat(valorFiltro);
            if (!isNaN(valorNum)) {
                queryCabecalho += ` AND ABS(valor_total - @valor) < 0.05`;
                requestCabecalho.input('valor', sql.Float, valorNum);
            }
        }

        queryCabecalho += ` ORDER BY data DESC`;

        const cabecalhoResult = await requestCabecalho.query(queryCabecalho);

        let cabecalho = null;
        let itensResult = { recordset: [] };
        let debugCols = null;
        let linkColumn = null;

        let followUpResult = { recordset: [] };

        if (cabecalhoResult.recordset.length > 0) {
            cabecalho = cabecalhoResult.recordset[0];
            const codigoNota = cabecalho.codigo;

            // O usuário descobriu via query manual que a coluna 'nf_numero' na tabela de itens
            // não armazena o número da nota, mas sim o 'codigo' (ID interno) do cabeçalho!
            itensResult = await pool.request()
                .input('codigoNota', sql.Int, codigoNota)
                .query(`
                SELECT 
                    i.prod_codigo,
                    (SELECT TOP 1 nome FROM ${dbName}.dbo.produto WHERE codigo = i.prod_codigo) AS produto_nome,
                    (SELECT TOP 1 f.nome 
                     FROM ${dbName}.dbo.produto p 
                     INNER JOIN ${dbName}.dbo.fabricante f ON p.fabr_codigo = f.codigo 
                     WHERE p.codigo = i.prod_codigo) AS fabricante_nome,
                    i.classificacao_fiscal, 
                    i.quantidade, 
                    i.Unidade, 
                    i.valor_unitario, 
                    i.valor_total 
                FROM ${dbName}.dbo.nota_fiscal_venda_item i
                WHERE i.nf_numero = @codigoNota
            `);

            // Fetch Follow-Up
            followUpResult = await pool.request()
                .input('codigoNota', sql.Int, codigoNota)
                .query(`
                SELECT 
                    f.data,
                    u.nome AS usuario,
                    f.historico AS observacao
                FROM ${dbName}.dbo.nota_fiscal_venda_follow_up f
                LEFT JOIN ${dbName}.dbo.usuario u ON f.usu_codigo = u.codigo
                WHERE f.nf_codigo = @codigoNota
                ORDER BY f.data DESC
            `);
        }

        const data = {
            cabecalho: cabecalho,
            itens: itensResult.recordset || [],
            followup: followUpResult.recordset || []
        };

        if (!data.cabecalho) {
            return res.status(404).json({ error: 'Nota fiscal não encontrada no Supra.' });
        }

        res.json(data);
    } catch (err) {
        console.error('Erro ao buscar detalhes da nota:', err);
        res.status(500).json({ error: 'Erro interno ao buscar detalhes da nota fiscal.', details: err.message });
    }
});

// Atualizar Contrato da Nota
router.put('/:empresa/:codigo_nota/contrato', authMiddleware, async (req, res) => {
    try {
        const { empresa, codigo_nota } = req.params;
        const { contrato, numero_nota, documento } = req.body;

        if (!contrato || !numero_nota || !documento) {
            return res.status(400).json({ error: 'Campos contrato, numero_nota e documento são obrigatórios.' });
        }

        let dbName = '';
        let empresaPg = '';
        if (empresa.toUpperCase() === 'NEXOMED') {
            dbName = 'SGC';
            empresaPg = 'Nexomed';
        }
        else if (empresa.toUpperCase() === 'BML') {
            dbName = 'SGC2';
            empresaPg = 'BML';
        }
        else return res.status(400).json({ error: 'Empresa inválida.' });

        const pool = await getPool();
        if (!pool) return res.status(500).json({ error: 'Falha na conexão com Supra.' });

        // 1. Update Supra
        await pool.request()
            .input('contrato', sql.VarChar, contrato)
            .input('codigo_nota', sql.Int, parseInt(codigo_nota))
            .query(`
                UPDATE ${dbName}.dbo.nota_fiscal_venda 
                SET nome_contato = @contrato 
                WHERE codigo = @codigo_nota
            `);

        // 2. Update Postgres
        const pgRes = await pgPool.query(
            `UPDATE titulos SET contrato = $1 WHERE empresa = $2 AND documento = $3`,
            [contrato, empresaPg, documento]
        );

        if (pgRes.rowCount === 0) {
            console.warn(`Documento ${documento} não encontrado no banco local PostgreSQL.`);
        }

        res.json({ success: true, message: 'Contrato atualizado com sucesso.' });
    } catch (err) {
        console.error('Erro ao atualizar contrato:', err);
        res.status(500).json({ error: `Erro ao atualizar contrato: ${err.message}` });
    }
});

// Atualizar Esfera do Cliente
router.put('/:empresa/:codigo_cliente/esfera', authMiddleware, async (req, res) => {
    try {
        const { empresa, codigo_cliente } = req.params;
        const { esfera, documento } = req.body; // MUNICIPAL, ESTADUAL, FEDERAL, PARTICULAR

        if (!esfera || !documento) {
            return res.status(400).json({ error: 'Campos esfera e documento são obrigatórios.' });
        }

        let dbName = '';
        let empresaPg = '';
        if (empresa.toUpperCase() === 'NEXOMED') {
            dbName = 'SGC';
            empresaPg = 'Nexomed';
        }
        else if (empresa.toUpperCase() === 'BML') {
            dbName = 'SGC2';
            empresaPg = 'BML';
        }
        else return res.status(400).json({ error: 'Empresa inválida.' });

        // Mapeamento de texto para ID
        const mapaEsfera = {
            'PARTICULAR': 10,
            'MUNICIPAL': 12,
            'ESTADUAL': 13,
            'FEDERAL': 14
        };

        const esferaUpper = esfera.toUpperCase();
        const esferaId = mapaEsfera[esferaUpper];

        if (!esferaId) {
            return res.status(400).json({ error: 'Esfera inválida.' });
        }

        const pool = await getPool();
        if (!pool) return res.status(500).json({ error: 'Falha na conexão com Supra.' });

        // 1. Update Supra
        await pool.request()
            .input('esfera_id', sql.Int, esferaId)
            .input('codigo_cliente', sql.Int, parseInt(codigo_cliente))
            .query(`
                UPDATE ${dbName}.dbo.cliente_fornecedor 
                SET clascli_codigo_2 = @esfera_id 
                WHERE codigo = @codigo_cliente
            `);

        // 2. Update Postgres (apenas para a parcela sendo visualizada para dar feedback imediato)
        const pgRes = await pgPool.query(
            `UPDATE titulos SET esfera = $1 WHERE empresa = $2 AND documento = $3`,
            [esferaUpper, empresaPg, documento]
        );

        if (pgRes.rowCount === 0) {
            console.warn(`Documento ${documento} não encontrado no banco local PostgreSQL.`);
        }

        res.json({ success: true, message: 'Esfera atualizada com sucesso.' });
    } catch (err) {
        console.error('Erro ao atualizar esfera:', err);
        res.status(500).json({ error: `Erro ao atualizar esfera: ${err.message}` });
    }
});

// Geração de DANFE (PDF)
router.get('/:empresa/:numero/danfe', authMiddleware, async (req, res) => {
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

        // 1. Encontrar o ID da nota (codigo)
        const queryCabecalho = `SELECT codigo FROM ${dbName}.dbo.nota_fiscal_venda WHERE numero_nota = @nota`;
        const cabecalhoResult = await pool.request()
            .input('nota', sql.VarChar, numero)
            .query(queryCabecalho);

        if (cabecalhoResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Nota fiscal não encontrada no Supra.' });
        }

        const nf_codigo = cabecalhoResult.recordset[0].codigo;

        // 2. Buscar o XML na tabela nfe_nota
        const queryXml = `SELECT nfe FROM ${dbName}.dbo.nfe_nota WHERE nf_codigo = @codigo`;
        const xmlResult = await pool.request()
            .input('codigo', sql.Int, nf_codigo)
            .query(queryXml);

        if (xmlResult.recordset.length === 0 || !xmlResult.recordset[0].nfe) {
            return res.status(404).json({ error: 'XML da Nota Fiscal Eletrônica não encontrado.' });
        }

        const nfeXml = xmlResult.recordset[0].nfe;

        // 3. Gerar o PDF do DANFE em memória (Layout Padrão)
        const pdfBuffer = await DANFe({ xml: nfeXml });

        // 4. Formatar o nome do arquivo conforme: YYYYMMDD_Empresa_NFe Numero
        const d = new Date();
        const dateStr = d.getFullYear().toString() + (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0');
        const empresaName = empresa.toUpperCase() === 'NEXOMED' ? 'Nexomed' : 'Bml';
        const filename = `${dateStr}_${empresaName}_NFe ${numero}.pdf`;

        // 5. Retornar o PDF para o navegador
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.send(Buffer.from(pdfBuffer));

    } catch (err) {
        console.error('Erro ao gerar DANFE:', err);
        res.status(500).json({ error: 'Erro interno ao gerar DANFE.', details: err.message });
    }
});

module.exports = router;
