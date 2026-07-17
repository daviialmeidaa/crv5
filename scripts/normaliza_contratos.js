const pgPool = require('../db/pgConnection');

async function normalize() {
    try {
        console.log("Iniciando normalização retroativa de contratos e esferas no banco PostgreSQL...");
        
        // Remove todos os espaços e converte para maiúsculo
        // A condição WHERE garante que só vamos atualizar as linhas que realmente precisam (têm espaço ou letras minúsculas)
        const result = await pgPool.query(`
            UPDATE titulos 
            SET 
                contrato = UPPER(REPLACE(COALESCE(contrato, ''), ' ', '')),
                esfera = UPPER(REPLACE(COALESCE(esfera, ''), ' ', ''))
            WHERE 
                contrato LIKE '% %' OR 
                contrato != UPPER(contrato) OR 
                esfera LIKE '% %' OR 
                esfera != UPPER(esfera);
        `);
        
        console.log(`Sucesso! ${result.rowCount} registros atualizados.`);
    } catch (e) {
        console.error("Erro na normalização:", e);
    } finally {
        process.exit(0);
    }
}

normalize();
