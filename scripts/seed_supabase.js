require('dotenv').config();
const { Pool } = require('pg');
const xlsx = require('xlsx');

// Configuration
const BATCH_SIZE = 500;
const FILE_PATH = './itens_arrematados.xlsx';
const SCHEMA = 'itens_arrematados';
const TABLES = ['IA_BML', 'IA_NEXOMED', 'UNIQUE_TBL'];

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

// Helper para converter data do Excel (número serial) para string YYYY-MM-DD
function parseExcelDate(dt) {
    if (dt === null || dt === undefined || dt === '') return null;
    
    // Se for número serial do Excel
    if (typeof dt === 'number') {
        const utc_days  = Math.floor(dt - 25569);
        const utc_value = utc_days * 86400;                                        
        const date_info = new Date(utc_value * 1000);
        
        // Ajuste básico de timezone
        const date = new Date(date_info.getTime() + (date_info.getTimezoneOffset() * 60000));
        
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0];
    }
    
    // Se for string no formato DD/MM/YYYY
    if (typeof dt === 'string') {
        const parts = dt.trim().split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            const dateStr = `${year}-${month}-${day}`;
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) return dateStr;
        }
        // Se for outro formato de string reconhecível pelo JS
        const parsed = new Date(dt);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }
    }
    
    return null;
}

// Data Types por Tabela para tratar adequadamente
const DATE_COLUMNS = ['DATA_PREGAO', 'DATA_PROPOSTA']; // Ajustado conforme retorno do check_tables

async function runMigration() {
    let client;
    try {
        console.log('⏳ Conectando ao Supabase...');
        client = await pool.connect();
        console.log('✅ Conectado com sucesso.');

        console.log(`⏳ Lendo arquivo Excel: ${FILE_PATH}...`);
        const workbook = xlsx.readFile(FILE_PATH);

        for (const tableName of TABLES) {
            if (!workbook.SheetNames.includes(tableName)) {
                console.warn(`⚠️ Aba ${tableName} não encontrada no Excel, pulando...`);
                continue;
            }

            console.log(`\n========================================`);
            console.log(`🚀 Processando Tabela: ${tableName}`);
            console.log(`========================================`);

            const sheet = workbook.Sheets[tableName];
            // Ler dados brutos
            let rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
            
            if (rows.length === 0) {
                console.log(`ℹ️ Aba ${tableName} está vazia.`);
                continue;
            }

            const columns = Object.keys(rows[0]);
            console.log(`📊 ${rows.length} registros encontrados. Colunas identificadas: ${columns.length}`);

            // 1. Truncar a tabela no Supabase
            console.log(`🗑️ Limpando tabela ${SCHEMA}."${tableName}" (TRUNCATE)...`);
            await client.query(`TRUNCATE TABLE ${SCHEMA}."${tableName}" RESTART IDENTITY CASCADE;`);
            console.log(`✅ Tabela limpa.`);

            // 2. Inserção em Lotes
            let insertedCount = 0;
            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE);
                
                const valueIndices = [];
                const flatValues = [];
                let paramIndex = 1;

                batch.forEach(row => {
                    const rowPlaceholders = [];
                    columns.forEach(col => {
                        let val = row[col];

                        // Tratar strings vazias
                        if (typeof val === 'string' && val.trim() === '') {
                            val = null;
                        }

                        // Tratar colunas de data
                        if (DATE_COLUMNS.includes(col)) {
                            val = parseExcelDate(val);
                        }
                        
                        flatValues.push(val);
                        rowPlaceholders.push(`$${paramIndex}`);
                        paramIndex++;
                    });
                    valueIndices.push(`(${rowPlaceholders.join(', ')})`);
                });

                const colsString = columns.map(c => `"${c}"`).join(', ');
                const query = `
                    INSERT INTO ${SCHEMA}."${tableName}" (${colsString}) 
                    VALUES ${valueIndices.join(', ')}
                `;

                await client.query(query, flatValues);
                insertedCount += batch.length;
                console.log(`  -> Inseridos ${insertedCount} de ${rows.length} registros...`);
            }

            console.log(`✅ Migração da tabela ${tableName} concluída com sucesso!`);
        }

    } catch (error) {
        console.error('\n❌ Erro durante a migração:', error);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
        console.log('\n🔌 Conexão encerrada.');
    }
}

runMigration();
