const pool = require('./pgConnection');

async function createTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS titulos (
            id SERIAL PRIMARY KEY,
            empresa VARCHAR(50) NOT NULL,
            nota VARCHAR(50),
            documento VARCHAR(50) NOT NULL,
            cod_cliente VARCHAR(50),
            cliente VARCHAR(255),
            esfera VARCHAR(50),
            uf VARCHAR(5),
            contrato VARCHAR(255),
            empenho VARCHAR(255),
            valor_nota NUMERIC(15, 2),
            boleto_emitido VARCHAR(10) DEFAULT 'Não',
            valor_deposito NUMERIC(15, 2),
            data_emissao DATE,
            data_vencimento DATE,
            data_pagamento DATE,
            status VARCHAR(50) DEFAULT 'Pendente',
            banco VARCHAR(255),
            retem_ir VARCHAR(5) DEFAULT 'Não',
            origem VARCHAR(20) DEFAULT 'supra',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(empresa, documento)
        );
    `;

    try {
        await pool.query(query);
        console.log('✅ Tabela "titulos" criada/verificada com sucesso.');
    } catch (err) {
        console.error('❌ Erro ao criar tabela:', err);
    } finally {
        pool.end();
    }
}

createTable();
