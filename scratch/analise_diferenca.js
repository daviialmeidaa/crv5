const pgPool = require('../db/pgConnection');
const fs = require('fs');

async function run() {
    const client = await pgPool.connect();
    try {
        let md = '# Deep Analysis - Diferença BML Julho 2026\n\n';

        // 1. Títulos
        const resTitulos = await client.query(`
            SELECT nota::text, SUM(valor_nota) as total_titulos
            FROM public.titulos
            WHERE empresa = 'BML'
              AND EXTRACT(YEAR FROM data_emissao) = 2026 
              AND EXTRACT(MONTH FROM data_emissao) = 7
              AND nota NOT IN ('80014879', '345008', '80017988')
            GROUP BY nota
        `);

        // 2. Vendas Custos (somando tudo para cada nota_fiscal, pois devoluções já são negativas)
        const resCustos = await client.query(`
            SELECT nota_fiscal::text as nota, SUM(valor_total) as total_custos
            FROM financeiro.vendas_custos
            WHERE empresa = 'BML'
              AND EXTRACT(YEAR FROM data_emissao) = 2026 
              AND EXTRACT(MONTH FROM data_emissao) = 7
            GROUP BY nota_fiscal
        `);

        const mapTitulos = {};
        resTitulos.rows.forEach(r => mapTitulos[r.nota] = Number(r.total_titulos));

        const mapCustos = {};
        resCustos.rows.forEach(r => mapCustos[r.nota] = Number(r.total_custos));

        const allNotas = new Set([...Object.keys(mapTitulos), ...Object.keys(mapCustos)]);
        
        md += '## Notas com Diferença de Valor (> R$ 0,01)\n\n';
        
        const diffs = [];
        for (const nota of allNotas) {
            const valT = mapTitulos[nota] || 0;
            const valC = mapCustos[nota] || 0;
            const diff = Math.abs(valT - valC);
            
            if (diff > 0.01) {
                diffs.push({ nota, valT, valC, diff });
            }
        }

        diffs.sort((a, b) => b.diff - a.diff);
        
        if (diffs.length === 0) {
            md += 'Nenhuma diferença de valor por nota encontrada!\n';
        } else {
            diffs.forEach(d => {
                md += `- **Nota ${d.nota}**: Títulos = R$ ${d.valT.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Custos = R$ ${d.valC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Diferença = R$ ${d.diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            });
        }
        
        // Sum total of diffs to see if it matches 1.153,17
        const totalDiffT = diffs.reduce((acc, curr) => acc + curr.valT, 0);
        const totalDiffC = diffs.reduce((acc, curr) => acc + curr.valC, 0);
        
        md += `\n**Soma de Títulos (nessas notas com diff)**: R$ ${totalDiffT.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
        md += `**Soma de Custos (nessas notas com diff)**: R$ ${totalDiffC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
        md += `**Diferença Líquida**: R$ ${(totalDiffT - totalDiffC).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;

        fs.writeFileSync('/home/davi/.gemini/antigravity-ide/brain/b99deff1-024d-4735-a2ec-88d67458eff2/analysis_results.md', md);
        console.log('Análise profunda concluída.');

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pgPool.end();
        process.exit(0);
    }
}
run();
