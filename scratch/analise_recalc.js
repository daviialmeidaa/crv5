const pgPool = require('../db/pgConnection');
const fs = require('fs');

async function run() {
    const client = await pgPool.connect();
    try {
        let md = '# Reanálise de Totais - Julho 2026\n\n';

        // 1. Verificar notas de devolução 31336 e 31337
        const resDevolucoes = await client.query(`
            SELECT DISTINCT empresa, nota_fiscal, tipo_nota, valor_total 
            FROM financeiro.vendas_custos 
            WHERE nota_fiscal IN ('31336', '31337') 
              AND EXTRACT(YEAR FROM data_emissao) = 2026 
              AND EXTRACT(MONTH FROM data_emissao) = 7
        `);
        
        md += '## 1. Verificação das Notas de Devolução (31336 e 31337)\n';
        if (resDevolucoes.rows.length > 0) {
            md += 'As notas foram encontradas no módulo de Custos:\n';
            resDevolucoes.rows.forEach(r => {
                md += `- Empresa: ${r.empresa} | Nota: ${r.nota_fiscal} | Tipo: ${r.tipo_nota} | Valor: R$ ${Number(r.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            });
        } else {
            md += 'As notas NÃO foram encontradas no módulo de Custos.\n';
        }
        md += '\n';

        // 2. Recálculo Títulos (excluindo locações)
        const resTitulos = await client.query(`
            SELECT empresa, SUM(valor_nota) as total 
            FROM public.titulos 
            WHERE EXTRACT(YEAR FROM data_emissao) = 2026 AND EXTRACT(MONTH FROM data_emissao) = 7
              AND nota NOT IN ('80014879', '345008', '80017988')
            GROUP BY empresa
        `);
        md += '## 2. Recálculo `public.titulos` (SEM as notas de locação)\n';
        let totalT = 0;
        resTitulos.rows.forEach(r => {
            md += `- **${r.empresa}**: R$ ${Number(r.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            totalT += Number(r.total);
        });
        md += `- **TOTAL NOVO (Títulos)**: R$ ${totalT.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;

        // 3. Totais em Vendas Custos (Líquido)
        const resVendas = await client.query(`
            SELECT empresa, tipo_nota, SUM(valor_total) as total 
            FROM financeiro.vendas_custos 
            WHERE EXTRACT(YEAR FROM data_emissao) = 2026 AND EXTRACT(MONTH FROM data_emissao) = 7
            GROUP BY empresa, tipo_nota
        `);
        
        let totaisL = { 'BML': 0, 'Nexomed': 0 };
        resVendas.rows.forEach(r => {
            if (r.tipo_nota === 'VENDA') totaisL[r.empresa] += Number(r.total);
            if (r.tipo_nota.includes('DEVOLU')) totaisL[r.empresa] += Number(r.total);
        });

        md += '## 3. Totais `financeiro.vendas_custos` (Vendido LÍQUIDO)\n';
        let totalGeralL = 0;
        for (const emp in totaisL) {
            md += `- **${emp}**: R$ ${totaisL[emp].toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            totalGeralL += totaisL[emp];
        }
        md += `- **TOTAL LÍQUIDO (Vendas Custos)**: R$ ${totalGeralL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;

        // Comparativo Final
        md += '## 4. Comparativo Final\n';
        md += `- **Total Títulos (Ajustado)**: R$ ${totalT.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
        md += `- **Total Custos (Líquido)**: R$ ${totalGeralL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
        md += `- **Diferença**: R$ ${Math.abs(totalT - totalGeralL).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;

        fs.writeFileSync('/home/davi/.gemini/antigravity-ide/brain/b99deff1-024d-4735-a2ec-88d67458eff2/analysis_results.md', md);
        console.log('Reanálise concluída e salva em analysis_results.md.');

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pgPool.end();
        process.exit(0);
    }
}
run();
