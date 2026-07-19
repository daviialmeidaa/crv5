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
        const valorFiltro = req.query.valor;

        let queryCabecalho = `
            SELECT 
                codigo,
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
        
        if (valorFiltro) {
            // Converte o valor recebido do front (ex: "1669.6") para float, ou tenta match exato se a conversão do BD permitir
            const valorNum = parseFloat(valorFiltro);
            if (!isNaN(valorNum)) {
                queryCabecalho += ` AND ABS(valor_total - @valor) < 0.05`;
                requestCabecalho.input('valor', sql.Float, valorNum);
            }
        }

        const cabecalhoResult = await requestCabecalho.query(queryCabecalho);

        let cabecalho = null;
        let itensResult = { recordset: [] };

        if (cabecalhoResult.recordset.length > 0) {
            cabecalho = cabecalhoResult.recordset[0];
            const codigoNota = cabecalho.codigo;

            // Busca as colunas da tabela de itens dinamicamente para saber qual é a Foreign Key
            const colResult = await pool.request().query(`
                SELECT COLUMN_NAME 
                FROM ${dbName}.INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'nota_fiscal_venda_item'
            `);
            const cols = colResult.recordset.map(r => r.COLUMN_NAME.toLowerCase());
            
            let linkColumn = null;
            if (cols.includes('nf_codigo')) linkColumn = 'nf_codigo';
            else if (cols.includes('codigo_nf')) linkColumn = 'codigo_nf';
            else if (cols.includes('id_nota')) linkColumn = 'id_nota';
            else if (cols.includes('nota_codigo')) linkColumn = 'nota_codigo';
            else if (cols.includes('cod_nota')) linkColumn = 'cod_nota';
            else if (cols.includes('id_nota_fiscal')) linkColumn = 'id_nota_fiscal';
            else if (cols.includes('nfv_codigo')) linkColumn = 'nfv_codigo';
            else if (cols.includes('nota_fiscal_venda_codigo')) linkColumn = 'nota_fiscal_venda_codigo';
            
            // Se encontrou a coluna de link exata (FK), usamos ela. Senão, faz fallback pro numero_nota (menos preciso)
            if (linkColumn && codigoNota) {
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
                    WHERE i.${linkColumn} = @codigoNota
                `);
            } else {
                // Fallback legado caso não ache a coluna FK
                itensResult = await pool.request()
                    .input('nota', sql.VarChar, numero)
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
                    WHERE i.nf_numero = @nota
                `);
            }
        }

        const data = {
            cabecalho: cabecalho,
            itens: itensResult.recordset || [],
            debug_colunas: !linkColumn ? cols : undefined
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
