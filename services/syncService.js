const { sql, getPool } = require('../db/connection');
const pgPool = require('../db/pgConnection');

function calcularStatus(vencimento, quitacao, valorRecebido) {
    if (quitacao || valorRecebido > 0) return 'Pago';
    if (!vencimento) return 'Pendente';
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataVenc = new Date(vencimento);
    dataVenc.setHours(0, 0, 0, 0);
    
    if (dataVenc < hoje) return 'Atrasado';
    return 'Pendente';
}

async function runSync(onProgress = () => {}) {
    console.log("🔄 Iniciando Sincronização com o Supra...");
    onProgress({ step: 'start', message: 'Iniciando Sincronização com o Supra...', progress: 0 });
    
    const empresasConfig = [
        { id: 'Nexomed', db: 'SGC', view: 'bio_contas_a_receber', cutoff: 688 },
        { id: 'BML', db: 'SGC2', view: 'bml_contas_a_receber', cutoff: 11 }
    ];

    const syncResults = {
        empresas: [],
        totalAnalyzed: 0,
        totalUpdated: 0,
        totalNew: 0,
        totalDeleted: 0
    };

    let supraPool;
    try {
        supraPool = await getPool();

        const upsertQuery = `
            INSERT INTO titulos (
                empresa, nota, documento, cod_cliente, cliente, 
                esfera, uf, contrato, empenho, valor_nota, valor_deposito, 
                data_emissao, data_vencimento, data_pagamento, status, banco, retem_ir
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            )
            ON CONFLICT (empresa, documento) DO UPDATE SET
                cliente = EXCLUDED.cliente,
                esfera = EXCLUDED.esfera,
                contrato = EXCLUDED.contrato,
                empenho = EXCLUDED.empenho,
                valor_deposito = EXCLUDED.valor_deposito,
                data_pagamento = EXCLUDED.data_pagamento,
                status = EXCLUDED.status,
                banco = EXCLUDED.banco,
                updated_at = CURRENT_TIMESTAMP;
        `;

        const selectFields = `
            Núm_NF, Cód_Fornecedor, Nome_Fornecedor, Esfera, UF, Contrato,
            Numero_Empenho_publico, Núm_documento, Parcela, Valor_parcela, Valor_recebido,
            Data_emissão, Data_vencimento, Data_quitação, Nome_cta_débito, retem_imposto_renda
        `;

        for (const emp of empresasConfig) {
            console.log(`📡 [${emp.id}] Buscando TODOS os registros ativos no Supra (Nota >= ${emp.cutoff})...`);
            
            const empResult = {
                empresa: emp.id,
                analyzed: 0,
                updated: 0,
                new: 0,
                deleted: 0
            };

            const viewName = `${emp.db}.dbo.${emp.view}`;

            // Buscar TODOS os documentos locais desta empresa para comparação
            const localDocsResult = await pgPool.query(`
                SELECT documento, status, valor_deposito, data_vencimento, data_pagamento 
                FROM titulos 
                WHERE empresa = $1
            `, [emp.id]);
            const localDocsMap = new Map(localDocsResult.rows.map(r => [r.documento, r]));
            const localDocsSet = new Set(localDocsMap.keys());

            // Executar consulta unificada no Supra
            const queryStr = `
                SET DATEFORMAT dmy;
                SET LANGUAGE Portuguese;
                SELECT ${selectFields}
                FROM ${viewName}
                WHERE TRY_CAST(Núm_NF AS INT) >= ${emp.cutoff}
            `;
            
            const supraRecords = await supraPool.request().query(queryStr);
            const supraDocsSet = new Set();
            const upsertPromises = [];

            for (const row of supraRecords.recordset) {
                const numDoc = row.Parcela ? `${row.Núm_documento}-${row.Parcela}` : row.Núm_documento.toString();
                supraDocsSet.add(numDoc);

                const status = calcularStatus(row.Data_vencimento, row.Data_quitação, row.Valor_recebido);
                empResult.analyzed++;

                const isNew = !localDocsSet.has(numDoc);
                if (isNew) {
                    empResult.new++;
                } else {
                    const localRecord = localDocsMap.get(numDoc);
                    
                    const oldValor = parseFloat(localRecord.valor_deposito) || 0;
                    const newValor = parseFloat(row.Valor_recebido) || 0;
                    
                    const oldPag = localRecord.data_pagamento ? new Date(localRecord.data_pagamento).getTime() : 0;
                    const newPag = row.Data_quitação ? new Date(row.Data_quitação).getTime() : 0;
                    
                    const oldCliente = (localRecord.cliente || '').trim();
                    const newCliente = (row.Nome_Fornecedor || '').trim();
                    
                    const oldEsfera = (localRecord.esfera || '').trim();
                    const newEsfera = (row.Esfera || '').trim();
                    
                    const oldContrato = (localRecord.contrato || '').trim();
                    const newContrato = (row.Contrato || '').trim();
                    
                    const oldEmpenho = (localRecord.empenho || '').trim();
                    const newEmpenho = (row.Numero_Empenho_publico || '').trim();
                    
                    const oldBanco = (localRecord.banco || '').trim();
                    const newBanco = (row.Nome_cta_débito || '').trim();

                    if (
                        localRecord.status !== status || 
                        oldValor !== newValor || 
                        oldPag !== newPag ||
                        oldCliente !== newCliente ||
                        oldEsfera !== newEsfera ||
                        oldContrato !== newContrato ||
                        oldEmpenho !== newEmpenho ||
                        oldBanco !== newBanco
                    ) {
                        empResult.updated++;
                    }
                }
                const values = [
                    emp.id, row.Núm_NF, numDoc, row.Cód_Fornecedor,
                    row.Nome_Fornecedor, row.Esfera, row.UF, row.Contrato,
                    row.Numero_Empenho_publico, row.Valor_parcela || 0, row.Valor_recebido || 0,
                    row.Data_emissão, row.Data_vencimento, row.Data_quitação,
                    status, row.Nome_cta_débito,
                    row.retem_imposto_renda == 1 ? 'Sim' : 'Não'
                ];
                
                upsertPromises.push(pgPool.query(upsertQuery, values));
            }

            console.log(`   📥 Registros obtidos do Supra: ${supraRecords.recordset.length}. Salvando no PostgreSQL...`);
            onProgress({ step: 'process', message: `Processando ${supraRecords.recordset.length} registros da ${emp.id}...`, progress: 30 });

            // Executar inserts/updates em lotes de 1000 para não estourar conexões do PG
            const BATCH_SIZE = 1000;
            const totalBatches = Math.ceil(upsertPromises.length/BATCH_SIZE);
            for (let i = 0; i < upsertPromises.length; i += BATCH_SIZE) {
                await Promise.all(upsertPromises.slice(i, i + BATCH_SIZE));
                const currentBatch = Math.floor(i/BATCH_SIZE) + 1;
                const batchProgress = 30 + Math.floor((currentBatch / totalBatches) * 50); // Progress from 30% to 80%
                console.log(`   ⏳ Lote ${currentBatch}/${totalBatches} salvo localmente...`);
                onProgress({ step: 'save', message: `Gravando lote ${currentBatch} de ${totalBatches}...`, progress: batchProgress });
            }

            // Verificar exclusões (registros que sumiram do Supra)
            const docsToDelete = [...localDocsSet].filter(d => !supraDocsSet.has(d));
            if (docsToDelete.length > 0) {
                console.log(`   🗑️ Removendo ${docsToDelete.length} registros excluídos no Supra...`);
                // Deletar em lotes usando ANY()
                for (let i = 0; i < docsToDelete.length; i += BATCH_SIZE) {
                    const batch = docsToDelete.slice(i, i + BATCH_SIZE);
                    await pgPool.query(`DELETE FROM titulos WHERE empresa = $1 AND documento = ANY($2::varchar[])`, [emp.id, batch]);
                }
                empResult.deleted = docsToDelete.length;
            }

            console.log(`   ✅ Concluído para ${emp.id}: ${empResult.analyzed} analisados, ${empResult.updated} atualizados de fato, ${empResult.new} novos, ${empResult.deleted} removidos.`);

            syncResults.empresas.push(empResult);
            syncResults.totalAnalyzed += empResult.analyzed;
            syncResults.totalUpdated += empResult.updated;
            syncResults.totalNew += empResult.new;
            syncResults.totalDeleted += empResult.deleted;
            
            onProgress({ step: 'empresa_done', message: `Concluída ${emp.id}`, progress: 90 });
        }

        console.log("🎉 Sincronização concluída com sucesso!");
        onProgress({ step: 'done', message: "Sincronização concluída com sucesso!", progress: 100 });
        return { success: true, message: "Sincronização concluída!", details: syncResults };

    } catch (error) {
        console.error("❌ Erro durante a sincronização:", error.message);
        throw error;
    }
}

module.exports = { runSync };
