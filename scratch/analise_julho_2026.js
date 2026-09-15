const pgPool = require('../db/pgConnection');
const fs = require('fs');

async function run() {
    const client = await pgPool.connect();
    try {
        let md = '# Análise de Consistência - Julho 2026\n\n';

        // 1. Total Titulos por Empresa
        const resTitulos = await client.query(`
            SELECT empresa, SUM(valor_nota) as total 
            FROM public.titulos 
            WHERE EXTRACT(YEAR FROM data_emissao) = 2026 AND EXTRACT(MONTH FROM data_emissao) = 7
            GROUP BY empresa
        `);
        md += '## 1. Valores em `public.titulos` (Faturamento / Contas a Receber)\n';
        let totalT = 0;
        resTitulos.rows.forEach(r => {
            md += `- **${r.empresa}**: R$ ${Number(r.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            totalT += Number(r.total);
        });
        md += `- **TOTAL GERAL**: R$ ${totalT.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;

        // 2. Total Vendas Custos por Empresa e Tipo
        const resVendas = await client.query(`
            SELECT empresa, tipo_nota, SUM(valor_total) as total 
            FROM financeiro.vendas_custos 
            WHERE EXTRACT(YEAR FROM data_emissao) = 2026 AND EXTRACT(MONTH FROM data_emissao) = 7
            GROUP BY empresa, tipo_nota
        `);
        md += '## 2. Valores em `financeiro.vendas_custos` (Custos de Produtos)\n';
        let totalVC = 0;
        let totalV = 0;
        let totalD = 0;
        resVendas.rows.forEach(r => {
            md += `- **${r.empresa}** (${r.tipo_nota}): R$ ${Number(r.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            if (r.tipo_nota === 'VENDA') totalV += Number(r.total);
            if (r.tipo_nota.includes('DEVOLU')) totalD += Number(r.total);
            totalVC += Number(r.total);
        });
        md += `- **TOTAL VENDAS**: R$ ${totalV.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
        md += `- **TOTAL DEVOLUÇÕES**: R$ ${totalD.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
        md += `- **TOTAL LÍQUIDO (Vendas - Devoluções)**: R$ ${(totalV - totalD).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;

        // 3. Notas em Vendas Custos (Venda) que NAO estao em Titulos
        const notasFaltandoTitulos = await client.query(`
            SELECT DISTINCT v.empresa, v.nota_fiscal, v.valor_total
            FROM financeiro.vendas_custos v
            LEFT JOIN public.titulos t ON v.empresa = t.empresa AND v.nota_fiscal::text = t.nota::text
            WHERE v.tipo_nota = 'VENDA'
              AND EXTRACT(YEAR FROM v.data_emissao) = 2026 
              AND EXTRACT(MONTH FROM v.data_emissao) = 7
              AND t.nota IS NULL
        `);
        md += '## 3. Notas de Venda em `vendas_custos` AUSENTES em `titulos`\n';
        if (notasFaltandoTitulos.rows.length === 0) {
            md += 'Nenhuma nota de venda está faltando no faturamento!\n\n';
        } else {
            md += `Foram encontradas ${notasFaltandoTitulos.rows.length} notas em Custos que NÃO foram para o Contas a Receber.\n`;
            notasFaltandoTitulos.rows.slice(0, 10).forEach(r => {
                md += `- Empresa: ${r.empresa} | Nota: ${r.nota_fiscal} | Valor: R$ ${Number(r.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            });
            if(notasFaltandoTitulos.rows.length > 10) md += '- ... (mostrando as 10 primeiras)\n';
            md += '\n';
        }

        // 4. Notas em Titulos que NAO estao em Vendas Custos
        const notasFaltandoCustos = await client.query(`
            SELECT t.empresa, t.nota, t.valor_nota
            FROM public.titulos t
            LEFT JOIN (SELECT DISTINCT empresa, nota_fiscal FROM financeiro.vendas_custos) v 
              ON t.empresa = v.empresa AND t.nota::text = v.nota_fiscal::text
            WHERE EXTRACT(YEAR FROM t.data_emissao) = 2026 
              AND EXTRACT(MONTH FROM t.data_emissao) = 7
              AND v.nota_fiscal IS NULL
        `);
        md += '## 4. Notas em `titulos` AUSENTES em `vendas_custos`\n';
        if (notasFaltandoCustos.rows.length === 0) {
            md += 'Nenhuma nota do faturamento está faltando nos Custos!\n\n';
        } else {
            md += `Foram encontradas ${notasFaltandoCustos.rows.length} notas no Contas a Receber que NÃO entraram em Custos (Possíveis serviços ou CFOPs não contabilizados).\n`;
            notasFaltandoCustos.rows.slice(0, 10).forEach(r => {
                md += `- Empresa: ${r.empresa} | Nota: ${r.nota} | Valor: R$ ${Number(r.valor_nota).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            });
            if(notasFaltandoCustos.rows.length > 10) md += '- ... (mostrando as 10 primeiras)\n';
            md += '\n';
        }

        // 5. Devoluções em Vendas Custos que TAMBÉM estão em Títulos
        const devolucoesEmTitulos = await client.query(`
            SELECT DISTINCT v.empresa, v.nota_fiscal, v.valor_total
            FROM financeiro.vendas_custos v
            INNER JOIN public.titulos t ON v.empresa = t.empresa AND v.nota_fiscal::text = t.nota::text
            WHERE v.tipo_nota = 'DEVOLUÇÃO RETORNO DE VENDA'
              AND EXTRACT(YEAR FROM v.data_emissao) = 2026 
              AND EXTRACT(MONTH FROM v.data_emissao) = 7
        `);
        md += '## 5. Notas de DEVOLUÇÃO em `vendas_custos` que estão PRESAS em `titulos` (como recebíveis ativos)\n';
        if (devolucoesEmTitulos.rows.length === 0) {
            md += 'Nenhuma devolução está indevidamente cadastrada no Contas a Receber.\n\n';
        } else {
            md += `> [!WARNING]\n> Foram encontradas ${devolucoesEmTitulos.rows.length} devoluções geradas no Módulo de Custos que TAMBÉM estão sendo cobradas como recebíveis no Módulo de Títulos!\n\n`;
            devolucoesEmTitulos.rows.slice(0, 10).forEach(r => {
                md += `- Empresa: ${r.empresa} | Nota: ${r.nota_fiscal} | Valor: R$ ${Number(r.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            });
            if(devolucoesEmTitulos.rows.length > 10) md += '- ... (mostrando as 10 primeiras)\n';
            md += '\n';
        }

        fs.writeFileSync('/home/davi/.gemini/antigravity-ide/brain/b99deff1-024d-4735-a2ec-88d67458eff2/analysis_results.md', md);
        console.log('Análise concluída e salva em analysis_results.md.');

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pgPool.end();
        process.exit(0);
    }
}
run();
