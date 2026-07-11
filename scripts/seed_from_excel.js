const xlsx = require('xlsx');
const pgPool = require('../db/pgConnection');

async function runSeed() {
    console.log('🔄 Iniciando restauração do banco a partir da planilha base...');

    // 1. Apagar tudo da tabela titulos
    try {
        await pgPool.query('TRUNCATE TABLE titulos RESTART IDENTITY;');
        console.log('✅ Tabela titulos completamente zerada.');
    } catch (e) {
        console.error('❌ Erro ao limpar tabela:', e.message);
        process.exit(1);
    }

    console.log('📄 Lendo arquivo Excel (isso pode levar alguns segundos)...');
    
    // 2. Ler arquivo e extrair a primeira aba
    const workbook = xlsx.readFile('./contas a receber base inicial.xlsx', { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Parse com nomes exatos dos cabeçalhos na primeira linha
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Encontrados ${data.length} registros no Excel.`);
    
    // 3. Mapear e preparar para inserção
    const upsertQuery = `
        INSERT INTO titulos (
            empresa, nota, documento, cod_cliente, cliente, 
            esfera, uf, contrato, empenho, valor_nota, boleto_emitido, valor_deposito, 
            data_emissao, data_vencimento, data_pagamento, status, banco, retem_ir, origem
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'excel'
        )
    `;

    const BATCH_SIZE = 1000;
    let successCount = 0;
    let errorCount = 0;

    let promises = [];
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // Skip se não tiver documento (coluna obrigatória)
        if (!row['Nº Documento']) continue;

        // Limpeza de campos
        const empresa = row['Empresa Vendedora'] ? row['Empresa Vendedora'].toString().trim() : '';
        const documento = row['Nº Documento'].toString().trim();
        
        // Conversor de data do Excel (serial number ou string/Date)
        const formatDt = (dt) => {
            if (!dt) return null;
            if (dt instanceof Date) return dt;
            if (typeof dt === 'number') {
                // Excel converte 1900-01-01 como 1. JS usa 1970.
                const utc_days  = Math.floor(dt - 25569);
                const utc_value = utc_days * 86400;                                        
                return new Date(utc_value * 1000);
            }
            // Tenta parse de string (ex: '2023-10-01')
            const parsed = new Date(dt);
            return isNaN(parsed) ? null : parsed;
        };

        const values = [
            empresa,
            row['Nota'] ? row['Nota'].toString() : null,
            documento,
            row['Cod'] ? row['Cod'].toString() : null,
            row['Cliente'] ? row['Cliente'].toString() : null,
            row['Esfera'] ? row['Esfera'].toString() : null,
            row['UF'] ? row['UF'].toString().substring(0, 5) : null,
            row['Contrato'] ? row['Contrato'].toString() : null,
            row['Nº Empenho'] ? row['Nº Empenho'].toString() : null,
            parseFloat(row['Valor Nota']) || 0,
            row['Boleto Emitido'] ? row['Boleto Emitido'].toString() : 'Não',
            parseFloat(row['Valor Depósito']) || 0,
            formatDt(row['Data Emissao']),
            formatDt(row['Data Vencimento']),
            formatDt(row['Data Pagamento']),
            row['Status Pagamento'] ? row['Status Pagamento'].toString().trim() : 'Pendente',
            row['Banco'] ? row['Banco'].toString() : null,
            row['Retém IR?'] ? row['Retém IR?'].toString() : 'Não'
        ];

        promises.push(
            pgPool.query(upsertQuery, values)
                .then(() => { successCount++; })
                .catch((e) => { 
                    errorCount++; 
                    if(errorCount < 5) console.log(`Erro na linha ${i} (${empresa} - ${documento}):`, e.message); 
                })
        );

        if (promises.length >= BATCH_SIZE) {
            await Promise.all(promises);
            promises = [];
            console.log(`   ⏳ Lote inserido. Total inseridos até agora: ${successCount}`);
        }
    }

    if (promises.length > 0) {
        await Promise.all(promises);
    }

    console.log(`\n🎉 Restauração concluída!`);
    console.log(`✅ Sucesso: ${successCount} registros criados`);
    if (errorCount > 0) console.log(`⚠️  Falhas: ${errorCount} registros (prováveis documentos duplicados ou erros de schema)`);
    
    pgPool.end();
}

runSeed();
