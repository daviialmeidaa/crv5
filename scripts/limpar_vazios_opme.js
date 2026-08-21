require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('../db/pgConnection');

async function runMigration() {
    console.log('=== Iniciando Migração: Limpeza de Valores Vazios/Nulos no Schema OPME ===');
    
    try {
        // 1. Obter todas as tabelas e colunas do schema 'opme'
        const res = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'opme' 
              AND is_updatable = 'YES'
        `);

        const columns = res.rows;
        let totalUpdates = 0;

        for (const col of columns) {
            const table = col.table_name;
            const column = col.column_name;
            const type = col.data_type;

            let query = '';
            
            // 2. Limpeza para campos de Texto (Strings)
            if (['character varying', 'text', 'character'].includes(type)) {
                // Remove "-", "0", "'" (aspa simples) e espaços em branco
                query = `
                    UPDATE opme.${table} 
                    SET ${column} = NULL 
                    WHERE ${column} IN ('-', '0', '''', ' ') 
                       OR TRIM(${column}) = '';
                `;
            } 
            // 3. Limpeza para campos Numéricos
            else if (['integer', 'numeric', 'double precision', 'real', 'smallint', 'bigint'].includes(type)) {
                // Não alterar colunas que representam valores monetários
                // (O usuário especificou não apagar zeros de valor unitário, vamos preservar todos os de valor)
                if (!column.toLowerCase().includes('valor')) {
                    query = `
                        UPDATE opme.${table} 
                        SET ${column} = NULL 
                        WHERE ${column} = 0;
                    `;
                }
            }

            // Executar se houver query
            if (query) {
                const updateRes = await pool.query(query);
                if (updateRes.rowCount > 0) {
                    console.log(`[OK] Tabela opme.${table}, Coluna ${column} -> ${updateRes.rowCount} registros atualizados para NULL.`);
                    totalUpdates += updateRes.rowCount;
                }
            }
        }

        console.log('=== Migração Concluída com Sucesso ===');
        console.log(`Total de campos limpos: ${totalUpdates}`);

    } catch (error) {
        console.error('ERRO FATAL DURANTE A MIGRAÇÃO:', error);
    } finally {
        // Encerra o pool para finalizar o script
        pool.end();
    }
}

runMigration();
