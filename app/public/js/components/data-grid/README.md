# Data Grid do Hub

Componente compartilhado de listagens, baseado no grid de Contas a Receber.
Filtros, ordenação, paginação, seleção/soma e exportação ficam no componente.
A página fornece as colunas, os dados e as ações do seu módulo.

```text
data-grid/
  data-grid.js          Componente pai, tabela e ciclo de atualização
  filters.js            Filtros em cascata, busca, vazios e árvore de datas
  sorting.js            Ordenação por tipo e tratamento de valores vazios
  pagination.js         Paginação e controles de primeira/anterior/próxima/última
  selection.js          Ctrl/Meta+clique, arrasto, contagem, soma e média
  export.js             Exportação dos dados filtrados para Excel
  actions.js            Botões de ação reutilizáveis
  values.js             Conversões, datas, valores e escape de texto
  presets/nota-items.js Colunas/formatação dos produtos nos modais de nota
```

O HTML está em `app/views/components/data-grid/`; o CSS tem uma entrada única em
`app/public/css/components/data-grid.css`, que carrega os estilos dos
subcomponentes em `css/components/data-grid/`.
Tipografia e densidade seguem Contas a Receber em todas as páginas. Para trocar
a fonte de todos os grids, definir `--font-data-grid` no CSS global.

## Nova página

No `head.ejs`, importar uma vez o componente. O import inclui seu CSS, os scripts
e a mesma versão do SheetJS já utilizada pelo Hub:

```ejs
<%- include('../../components/data-grid/assets') %>
```

No conteúdo, incluir a estrutura da tabela. Cada grid precisa de um identificador
único, inclusive quando houver vários na mesma página:

```ejs
<%- include('../../components/data-grid/grid', {
    grid: { id: 'pedidos', toolbar: true }
}) %>
```

No controller, definir as colunas e entregar os dados:

```js
const pedidosGrid = HubDataGrid.create({
    bodyId: 'pedidosBody',
    columns: [
        { key: 'numero', label: 'Pedido', type: 'number' },
        { key: 'cliente', label: 'Cliente', align: 'left', wrap: true },
        { key: 'emissao', label: 'Emissão', type: 'date' },
        { key: 'valor', label: 'Valor', type: 'currency' }
    ],
    onRowClick: row => abrirPedido(row.numero),
    exportOptions: { filename: 'pedidos.xlsx' }
});

// Após a chamada autenticada à API feita pela página:
pedidosGrid.setData(dados);
```

O componente identifica automaticamente os controles criados pelo template.
Com `toolbar: true`, a tabela recebe os botões de remover filtros e exportar.
Para telas existentes, é possível informar `headerId`, `pageSizeId`, `infoId`,
`paginationId`, `clearId` e `exportId` e manter os controles nas posições atuais.
A API, o token, permissões e a persistência continuam sob responsabilidade do
módulo. O grid não faz requisições HTTP.

## Colunas e ações

- `type`: `text` (padrão), `number`, `currency`, `date`, `percent`, `boolean`,
  `deadline`, `actions` ou `input`. Tipos numéricos orientam a ordenação e a soma.
- `value(row)`: valor de uma coluna calculada, usado também para ordenar/filtrar.
- `render(value, row, index)`: apresentação da célula. Pode retornar um elemento
  DOM ou `{ text, className, numericValue }`. `text` é inserido como texto seguro.
- Uma string retornada por `render` é HTML explícito. Escapar valores externos
  com `HubDataGrid.components.values.escape` antes de colocá-los nesse HTML.
- `align`, `wrap` e `sticky`: alinhamento, quebra de linhas e colunas fixas.
- `sortable: false`, `filterable: false` e `exportable: false`: desativam recursos
  de uma coluna específica. Colunas `actions` não são ordenadas, filtradas ou
  exportadas; `input` não entra no Excel.
- `exportValue(row)` e `filterFormat(value)`: ajustes específicos da coluna.

`HubDataGrid.components.Actions.button({ label, icon, danger, onClick })` cria um
botão com ícone e trata a propagação do clique. `Actions.group([...])` agrupa
botões. As permissões para mostrar/executar cada ação são definidas pela página.
Ctrl/Meta+clique em células é reservado à seleção e não aciona `onRowClick`.

## Estado e extensões

Cada instância mantém seus próprios `rawData`, `filteredData`, `viewData`,
`filters`, `sort` e `pagination`. É possível passar um `state` existente para
migrar um controller sem alterar suas ações de negócio.

- `process()`: refiltra, ordena e pagina após atualizar dados/estado.
- `setData(rows, resetPage)`, `setPage(page)`, `toggleSort(key)` e `clearFilters()`.
- `searchId` e `searchKeys`: busca global ou em campos definidos.
- `defaultCompare(a, b)` e `tieBreaker(a, b)`: regras de ordenação específicas do
  módulo, como os agrupamentos de contratos e parcelas de uma nota.
- `onChange(state)`: atualiza indicadores da página após o processamento.
- `renderHeader(th, col, grid)`: adapta a apresentação e a interação do cabeçalho
  quando uma consulta existente precisa manter seu comportamento específico.
- `rowLimit`: limita as linhas renderizadas sem alterar o total de resultados,
  usado junto com `pagination: false` em consultas que orientam a refinar a busca.
- `selectionValue(row, col)`: valor numérico quando a apresentação altera o sinal
  ou a precisão, como nas devoluções do histórico de custos.
- `export(options)`: exporta todos os registros filtrados, incluindo outras
  páginas. As opções aceitam `filename`, `sheetName`, `accounting`, `value` e
  `extraValues`. O modo contábil preserva números negativos no arquivo Excel.
- `onEmptyExport()` e `onExportError(error)`: personalizam os avisos de exportação.
  O comportamento padrão avisa quando não há dados ou a biblioteca não carregou.
- `destroy()`: fecha filtros, limpa seleção/tabela, remove listeners e o observer.
  Deve ser chamado antes de remover um grid criado em modal.

Para modais montados sob demanda, colocar o mesmo parcial `grid` em um
`<template>` e usar `HubDataGrid.mount(templateId, host, options)`. Não duplicar
markup ou algoritmos para criar um grid em um diálogo.

Filtros sem seleção produzem zero registros e mantêm visível o botão de remover
filtros. Valores vazios são uma opção distinta de textos literais. A busca do
filtro limpa a seleção no primeiro termo digitado e permite acumular escolhas em
buscas seguintes. Datas são agrupadas por ano/mês/dia sem converter o dia para o
fuso do navegador. A árvore mantém sua expansão enquanto o filtro está aberto.

A seleção tem estado por grid e uma barra informativa compartilhada. Trocar de
página, filtrar, atualizar dados, pressionar Escape ou clicar fora limpa a seleção.
A barra não intercepta cliques dos controles. A soma usa os valores numéricos das
células e ignora datas e textos; aceita negativos e a exibição contábil.

## Migração realizada

Usam esta implementação: Contas a Receber, Clientes, Notas do Cliente, Agenda de
Licitações, Itens Arrematados, Usuários, Custos Nulos, Histórico de Custos e as
abas de Cirurgias/OPME. Também usam o componente os produtos dos dois modais de
nota, a consulta ao banco de códigos e o modal de cirurgias em aberto.

As tabelas de resumo financeiro e os históricos de observações são relatórios
sem comportamento de grid. A tabela de lançamento de produtos de cirurgia é um
formulário de edição. Suas regras permanecem nos módulos correspondentes.
Não há novas dependências npm, variáveis de ambiente ou etapa de build.

## Recursos opcionais e apresentação por módulo

Use `export: false` no parcial `grid` e na configuração JavaScript para remover
botão, listener e execução de exportação daquela instância. Quando nenhuma
tabela da página exportar, importe os assets com
`{ exportEnabled: false }`: SheetJS e `export.js` não serão carregados.
A opção JavaScript também aceita uma função para habilitar exportação por
contexto, como nas abas de um contrato OPME. O botão pode ficar fora do grid,
identificado por `exportId`.

Usuários, Clientes e Notas do Cliente (incluindo os produtos do modal) não têm
exportação. Em Cirurgias, a lista de contratos e o modal de cirurgias em aberto
não exportam; nas abas do contrato, a ação permanece em `#tabsContainer`.
Os produtos do modal de nota de Contas a Receber também não exportam.

Use `pagination: false` no parcial e na configuração JavaScript para mostrar
todos os resultados filtrados, sem seletor de quantidade ou navegação de páginas.
O Banco de Códigos usa esse modo e desabilita a exportação. Para preservar a
consulta de produção, seus cabeçalhos selecionam a coluna pesquisada, sem
controles de ordenação, filtros por checkbox ou seleção/soma de células. A lista
mostra até 100 resultados e orienta a refinar a busca quando houver mais itens.
Produto e Descrição mantêm uma linha com tooltip; Cód. Bio mantém o destaque de cor.

A barra de ações fica oculta quando não há exportação nem filtros ativos,
mantendo o cabeçalho junto ao topo do card. Ela reaparece ao aplicar filtros
para permitir sua remoção.

Alturas e quebras de linha podem ser ajustadas no CSS da página usando o
`data-grid` da instância e `td[data-col="campo"]`. Agenda e Itens Arrematados
preservam o padrão de produção: linhas de 110 px (150 px a partir de 1536 px),
com crescimento conforme o conteúdo. Em Itens, Órgão/Material têm largura entre
250 e 350 px e Status entre 120 e 200 px; os demais campos mantêm suas regras de
alinhamento e quebra de linha.

Use `headerLayout: 'inline'` para manter o título e a seta no mesmo bloco de
texto do cabeçalho, preservando as larguras originais das colunas de licitações.
