const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'atualiza_contratos.txt');
const data = fs.readFileSync(filePath, 'utf-8');
const lines = data.split('\n').filter(line => line.trim() !== '' && !line.toLowerCase().startsWith('nota'));

const contracts = {};

lines.forEach(line => {
    const parts = line.split('\t');
    if (parts.length >= 2) {
        const nota = parts[0].trim();
        const contrato = parts[1].trim();
        if (nota && contrato) {
            if (!contracts[contrato]) {
                contracts[contrato] = [];
            }
            contracts[contrato].push(nota);
        }
    }
});

let sql = '';

for (const [contrato, notas] of Object.entries(contracts)) {
    const totalNotas = notas.length;
    const notasStr = notas.join(', ');

    sql += `-- ===================================================================\n`;
    sql += `-- CONTRATO: ${contrato} (Total de ${totalNotas} notas)\n`;
    sql += `-- ===================================================================\n\n`;

    sql += `-- 1. VALIDAÇÃO\n`;
    sql += `SELECT numero_nota, nome_contato, valor_total, data\n`;
    sql += `FROM SGC.dbo.nota_fiscal_venda\n`;
    sql += `WHERE numero_nota IN (${notasStr});\n\n`;

    sql += `-- 2. EXECUÇÃO\n`;
    sql += `UPDATE SGC.dbo.nota_fiscal_venda\n`;
    sql += `SET nome_contato = '${contrato}'\n`;
    sql += `OUTPUT inserted.numero_nota, inserted.nome_contato, inserted.valor_total\n`;
    sql += `WHERE numero_nota IN (${notasStr});\n\n\n`;
}

const outPath = path.join(__dirname, '..', 'lote_atualizacao_parte2.sql');
fs.writeFileSync(outPath, sql);
console.log(`Arquivo gerado com sucesso em: ${outPath}`);
