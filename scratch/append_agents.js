const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../.agents/AGENTS.md');
const contentToAppend = `
## Arquitetura do Módulo de Custos de Produtos (Financeiro)
O módulo de Custos de Produtos foi refatorado para suportar integração cross-database e lidar com casos onde itens de notas podem ter sido gerados a partir da SGC (Nexomed) ou SGC2 (BML), ou até mesmo não possuir custo nativo de ERP.

### 1. Cost Engine (Motor de Precificação Multibanco)
- O motor de custos (\`services/cost_engine.js\`) não se limita à empresa primária informada. Ele dispara queries concorrentes via \`Promise.all\` para os bancos Supra SGC e SGC2, tentando localizar o custo de compra na raiz (\`compra_item\` e \`compra_item_lote\`).
- A lógica emprega uma cascata de **5 Níveis** de desempate e fallback:
  1. **Nível 1 (Lote Exato - SGC e SGC2):** Custo de compra buscando na \`compra_item_lote\` através do \`prod_codigo\` e \`lote_numero\` exato.
  2. **Nível 2 (Produto Genérico - SGC e SGC2):** Custo da compra mais recente buscando apenas pelo \`prod_codigo\`.
  3. **Resolução de Conflitos (Supra):** Caso encontre em ambos os bancos, prioriza o Nível 1 sobre o 2. Em caso de empate de nível, compara o campo \`data_entrada\` (data de fechamento da compra no Supra) e adota estritamente o valor da mais recente.
  4. **Nível 3 e 4 (Postgres/Local):** Se não achar custo no legado, realiza o fallback buscando no histórico local (tabela \`financeiro.vendas_custos\`) caso algum outro usuário já tenha preenchido um custo manual para aquele Produto/Lote anteriormente.
  5. **Nível 5 (Custo Nulo):** Se falhar em tudo, assinala o custo como \`0.00\`, direcionando a nota para auditoria manual na aba "Custos Nulos".

### 2. Sincronização de Dados (\`sync_custos.js\`)
- A sincronização via API (\`/api/financeiro/custos/sincronizar\`) faz varreduras para um mês/ano iterando sobre pools conectados ao \`SGC\` e \`SGC2\`.
- O cruzamento de cabeçalho e item para resgatar a data de entrada (\`data_entrada\`) deve ser feito unindo \`compra_item ci\` com \`compra c ON ci.comp_codigo = c.codigo\`.
- CFOPS de Vendas (5102, 6102) entram multiplicados por 1, CFOPs de Devolução (1202, 2202) são inseridos com quantidades multiplicadas por \`-1\`.

### 3. Frontend e Client-Side State
- O grid de "Custos Nulos" e "Histórico" carregam todo o seu conteúdo via cache Redis. O grid do Histórico, em particular, abdicou da necessidade de seleção de ano e carrega a vida inteira do módulo ordenando os mais recentes no topo (\`data_emissao DESC, nota_fiscal DESC\`).
- A inserção de custo manual no grid envia um \`PUT /api/financeiro/custos/save-batch\` passando não o ID, mas as chaves lógicas do produto: \`empresa, nota_fiscal, cod_produto, lote\`.
- O PostgreSQL atualiza todos os registros gêmeos no histórico e a UI varre seus arrays \`rawData\` e \`filteredData\` em memória eliminando visualmente todas as instâncias daquele item pendente resolvido, renderizando dinamicamente a badge do contador sem forçar um refresh na API.
`;

fs.appendFileSync(filePath, contentToAppend, 'utf8');
console.log('Appended to AGENTS.md successfully!');
