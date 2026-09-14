/**
 * import_custos_database.js
 * 
 * Script de Seed: Lê a planilha custos/database.xlsx e popula a tabela
 * financeiro.vendas_custos no PostgreSQL.
 * 
 * Uso: node scripts/import_custos_database.js
 * 
 * ETAPAS:
 * 1. Cria o schema 'financeiro' se não existir.
 * 2. Cria a tabela 'financeiro.vendas_custos' se não existir.
 * 3. Limpa dados existentes (TRUNCATE) — idempotente para re-importação.
 * 4. Lê o Excel e insere em lotes de 500 linhas.
 */

require('dotenv').config();
const XLSX = require('xlsx');
const path = require('path');
const pool = require('../db/pgConnection');

const BATCH_SIZE = 500;
const XLSX_PATH = path.join(__dirname, '..', 'custos', 'database.xlsx');

// Converte serial date do Excel para Date JS
function excelDateToJSDate(serial) {
    if (!serial || typeof serial !== 'number') return null;
    const utcDays = Math.floor(serial - 25569);
    const utcMs = utcDays * 86400 * 1000;
    return new Date(utcMs);
}

async function run() {
    const client = await pool.connect();
    console.log('✅ Conectado ao PostgreSQL.');

    try {
        // ===== ETAPA 1: Criar schema =====
        console.log('\n📦 Criando schema "financeiro"...');
        await client.query(`CREATE SCHEMA IF NOT EXISTS financeiro;`);
        console.log('   ✓ Schema criado/verificado.');

        // ===== ETAPA 2: Criar tabela =====
        console.log('\n📋 Criando tabela "financeiro.vendas_custos"...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS financeiro.vendas_custos (
                id SERIAL PRIMARY KEY,
                empresa VARCHAR(20) NOT NULL,
                nota_fiscal INTEGER NOT NULL,
                codigo_cliente INTEGER,
                cliente VARCHAR(255),
                cidade VARCHAR(100),
                uf CHAR(2),
                data_emissao DATE,
                tipo_nota VARCHAR(50),
                cod_produto VARCHAR(50),
                produto VARCHAR(255),
                lote VARCHAR(100),
                classificacao VARCHAR(100),
                fabricante VARCHAR(100),
                unidade VARCHAR(10),
                quantidade NUMERIC(15,4) DEFAULT 0,
                valor_unitario NUMERIC(15,4) DEFAULT 0,
                valor_total NUMERIC(15,4) DEFAULT 0,
                custo_unitario NUMERIC(15,4) DEFAULT 0,
                custo_total NUMERIC(15,4) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('   ✓ Tabela criada/verificada.');

        // Criar índices para performance
        console.log('\n🔧 Criando índices...');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_vc_cod_produto ON financeiro.vendas_custos (cod_produto);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_vc_lote ON financeiro.vendas_custos (lote);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_vc_empresa ON financeiro.vendas_custos (empresa);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_vc_data_emissao ON financeiro.vendas_custos (data_emissao);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_vc_tipo_nota ON financeiro.vendas_custos (tipo_nota);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_vc_custo_unitario ON financeiro.vendas_custos (custo_unitario);`);
        console.log('   ✓ Índices criados/verificados.');

        // ===== ETAPA 3: Limpar dados antigos =====
        console.log('\n🗑️  Limpando dados existentes (TRUNCATE)...');
        await client.query(`TRUNCATE TABLE financeiro.vendas_custos RESTART IDENTITY;`);
        console.log('   ✓ Tabela limpa.');

        // ===== ETAPA 4: Ler Excel =====
        console.log(`\n📄 Lendo planilha: ${XLSX_PATH}`);
        const workbook = XLSX.readFile(XLSX_PATH);
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
        console.log(`   ✓ ${rows.length} linhas encontradas.`);

        // ===== ETAPA 5: Inserir em lotes =====
        console.log(`\n🚀 Inserindo dados em lotes de ${BATCH_SIZE}...`);
        let inserted = 0;
        let errors = 0;

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);

            // Construir VALUES para batch insert
            const values = [];
            const placeholders = [];
            let paramIdx = 1;

            for (const row of batch) {
                const dataEmissao = excelDateToJSDate(row['Data de Emissao']);
                
                placeholders.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
                
                values.push(
                    row['Empresa'] || null,
                    row['Numero da Nota'] || null,
                    row['Codigo do Cliente'] || null,
                    row['Cliente'] ? String(row['Cliente']).trim() : null,
                    row['Cidade'] ? String(row['Cidade']).trim() : null,
                    row['Estado'] ? String(row['Estado']).trim() : null,
                    dataEmissao,
                    row['Tipo de Nota'] ? String(row['Tipo de Nota']).trim() : null,
                    row['Codigo do Produto'] ? String(row['Codigo do Produto']) : null,
                    row['Produto'] ? String(row['Produto']).trim() : null,
                    row['Lote'] ? String(row['Lote']).trim() : null,
                    row['Classificacao'] ? String(row['Classificacao']).trim() : null,
                    row['Fabricante'] ? String(row['Fabricante']).trim() : null,
                    row['Unidade'] ? String(row['Unidade']).trim() : null,
                    row['Quantidade'] ?? 0,
                    row['Valor Unitario'] ?? 0,
                    row['Valor Total'] ?? 0,
                    row['Custo Unitario'] ?? 0
                );
            }

            const sql = `
                INSERT INTO financeiro.vendas_custos 
                (empresa, nota_fiscal, codigo_cliente, cliente, cidade, uf, data_emissao, tipo_nota, cod_produto, produto, lote, classificacao, fabricante, unidade, quantidade, valor_unitario, valor_total, custo_unitario)
                VALUES ${placeholders.join(', ')}
            `;

            try {
                await client.query(sql, values);
                inserted += batch.length;
            } catch (err) {
                console.error(`   ❌ Erro no lote ${i}-${i + batch.length}: ${err.message}`);
                errors += batch.length;
            }

            // Progress log a cada 5000 registros
            if ((i + BATCH_SIZE) % 5000 === 0 || i + BATCH_SIZE >= rows.length) {
                const pct = Math.min(100, ((i + BATCH_SIZE) / rows.length * 100)).toFixed(1);
                console.log(`   📊 Progresso: ${pct}% (${inserted} inseridos / ${errors} erros)`);
            }
        }

        // ===== ETAPA 6: Atualizar custo_total =====
        console.log('\n🔄 Calculando custo_total (quantidade * custo_unitario)...');
        await client.query(`
            UPDATE financeiro.vendas_custos 
            SET custo_total = quantidade * custo_unitario
        `);
        console.log('   ✓ custo_total calculado.');

        // ===== RESULTADOS =====
        const countResult = await client.query(`SELECT COUNT(*) as total FROM financeiro.vendas_custos`);
        const nullCosts = await client.query(`SELECT COUNT(*) as total FROM financeiro.vendas_custos WHERE custo_unitario = 0 OR custo_unitario IS NULL`);

        console.log('\n' + '='.repeat(50));
        console.log('✅ IMPORTAÇÃO CONCLUÍDA!');
        console.log('='.repeat(50));
        console.log(`   Total de registros: ${countResult.rows[0].total}`);
        console.log(`   Custos nulos/zero: ${nullCosts.rows[0].total}`);
        console.log(`   Erros: ${errors}`);

    } catch (err) {
        console.error('\n❌ ERRO FATAL:', err.message);
        console.error(err.stack);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

run();
