const XLSX = require('xlsx');
const pool = require('../db/pgConnection');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function seedExcel() {
    const filePath = path.join(__dirname, '../contas a receber base inicial.xlsx');
    console.log(`Lendo arquivo: ${filePath}`);
    
    // Ler Excel convertendo células de datas para objetos Date JS
    const wb = XLSX.readFile(filePath, { cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`Encontradas ${data.length} linhas na planilha. Inserindo no banco de dados...`);
    const client = await pool.connect();
    
    let inseridos = 0;
    
    try {
        // Limpar tabela antes de inserir
        console.log('Limpando tabela titulos...');
        await client.query('TRUNCATE TABLE titulos');
        console.log('Tabela limpa. Iniciando inserções...');
        
        // Função auxiliar para datas do Excel
        function parseExcelDate(val) {
            if (!val) return null;
            if (val instanceof Date) return val;
            if (typeof val === 'number') {
                return new Date(Math.round((val - 25569) * 86400 * 1000));
            }
            if (typeof val === 'string') {
                if (val.includes('/')) {
                    const parts = val.split('/');
                    if (parts.length === 3) {
                        return `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                }
                return val;
            }
            return null;
        }

        // Sem BEGIN/COMMIT para permitir que linhas com erro não abortem tudo
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            // Ignorar linhas que não tenham empresa ou documento (chaves necessárias)
            if (!row['Empresa Vendedora'] || !row['Nº Documento']) {
                continue;
            }
            
            const empresa = String(row['Empresa Vendedora']).trim();
            const nota = row['Nota'] ? String(row['Nota']).trim() : null;
            const cod_cliente = row['Cod'] ? String(row['Cod']).trim() : null;
            const cliente = row['Cliente'] ? String(row['Cliente']).trim() : null;
            const esfera = row['Esfera'] ? String(row['Esfera']).trim() : null;
            const uf = row['UF'] ? String(row['UF']).trim() : null;
            const contrato = row['Contrato'] ? String(row['Contrato']).trim() : null;
            const empenho = row['Nº Empenho'] ? String(row['Nº Empenho']).trim() : null;
            const documento = String(row['Nº Documento']).trim();
            
            // Valores monetários - Se for string na planilha, tentamos limpar
            let valor_nota = row['Valor Nota'];
            if (typeof valor_nota === 'string') {
                valor_nota = parseFloat(valor_nota.replace(/\./g, '').replace(/,/g, '.'));
            }
            if (isNaN(valor_nota) || valor_nota === '') valor_nota = null;
            
            const boleto_emitido = row['Boleto Emitido'] ? String(row['Boleto Emitido']).trim() : 'Não';
            
            let valor_deposito = row['Valor Depósito'];
            if (typeof valor_deposito === 'string') {
                valor_deposito = parseFloat(valor_deposito.replace(/\./g, '').replace(/,/g, '.'));
            }
            if (isNaN(valor_deposito) || valor_deposito === '') valor_deposito = null;
            
            // Datas
            const data_emissao = parseExcelDate(row['Data Emissao']);
            const data_vencimento = parseExcelDate(row['Data Vencimento']);
            const data_pagamento = parseExcelDate(row['Data Pagamento']);
            
            const status = row['Status Pagamento'] ? String(row['Status Pagamento']).trim() : 'Pendente';
            const banco = row['Banco'] ? String(row['Banco']).trim() : null;
            const retem_ir = row['Retém IR?'] ? String(row['Retém IR?']).trim() : 'Não';
            
            try {
                await client.query(`
                    INSERT INTO titulos (
                        empresa, nota, cod_cliente, cliente, esfera, uf, contrato,
                        empenho, documento, valor_nota, boleto_emitido, valor_deposito,
                        data_emissao, data_vencimento, data_pagamento, status, banco,
                        retem_ir, origem
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7,
                        $8, $9, $10, $11, $12,
                        $13, $14, $15, $16, $17,
                        $18, 'planilha'
                    )
                    ON CONFLICT (empresa, documento) DO NOTHING
                `, [
                    empresa, nota, cod_cliente, cliente, esfera, uf, contrato,
                    empenho, documento, valor_nota, boleto_emitido, valor_deposito,
                    data_emissao, data_vencimento, data_pagamento, status, banco,
                    retem_ir
                ]);
                inseridos++;
                
                if (inseridos % 500 === 0) {
                    console.log(`Inseridos ${inseridos} registros...`);
                }
            } catch (err) {
                console.error(`Erro ao inserir doc ${documento} na linha ${i+2}:`, err.message);
            }
        }
        
        console.log(`Seed concluído com sucesso! Total: ${inseridos} registros novos inseridos na tabela.`);
        
    } catch (err) {
        console.error('Erro na transação. Nenhuma linha inserida:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seedExcel();
