# Contexto do Projeto: Contas a Receber v5 (Nexomed)

Este arquivo define as regras e o contexto arquitetural do projeto. **Todos os agentes de IA devem ler e seguir estas diretrizes antes de realizar alterações no código.**

## Stack Tecnológica
- **Backend:** Node.js com Express.js.
- **Bancos de Dados:** PostgreSQL (`pg`) e SQL Server (`mssql`).
- **Autenticação:** JWT (`jsonwebtoken`) e senhas encriptadas com `bcryptjs`.
- **Frontend:** Vanilla HTML, CSS, JavaScript (sem frameworks como React, Vue ou Angular).
- **Estilização:** Tailwind CSS (carregado via CDN) com configurações customizadas injetadas no próprio HTML.

## Regras de Estrutura de Frontend (Obrigatórias)
Todo código de interface deve seguir estritamente o padrão estabelecido na pasta `public/`:

1. **Páginas HTML e Tailwind CDN:**
   - Criadas como arquivos `.html` na raiz da pasta `public/`.
   - Devem sempre importar o script do Tailwind via CDN: `<script src="https://cdn.tailwindcss.com"></script>`.
   - **Crucial:** Devem conter o script de configuração do Tailwind (`tailwind.config`) injetando a paleta de cores própria do projeto antes de renderizar os estilos (veja o padrão no `index.html` ou `dashboard.html`).
   - A fonte oficial do projeto é a **Inter** (do Google Fonts), que deve ser importada no `<head>`.

2. **Paleta de Cores e Tema (Tailwind Config):**
   - O projeto não utiliza cores genéricas do Tailwind para sua identidade.
   - **`nexo`**: Tons de Teal/Cyan (ex: `nexo-500: '#0097A7'`, `nexo-600: '#00838F'`) - Utilizados para marca, botões primários e destaques (accent).
   - **`steel`**: Tons de Cinza/Grafite (ex: `steel-800: '#1f2937'`, `steel-900: '#111827'`) - Utilizados para fundos estruturais, painéis, sidebar e tipografia.
   - As fontes devem usar a classe `font-sans` configurada para priorizar a fonte 'Inter'.

3. **Suporte a Dark Mode:**
   - A configuração do Tailwind exige `darkMode: 'class'`.
   - O suporte ao tema escuro é obrigatório em todas as páginas.
   - Utilize o prefixo `dark:` (ex: `bg-white dark:bg-steel-800`, `text-steel-800 dark:text-gray-100`).
   - A preferência do tema do usuário é salva no `localStorage` sob a chave `'theme'`.

4. **Estética, Animações e Micro-interações:**
   - Priorize uma interface *premium*, limpa e dinâmica (UI/UX).
   - Elementos interativos devem ter transições suaves utilizando classes utilitárias (ex: `transition-all duration-200`).
   - Efeitos de `hover`, `focus` em inputs (ex: *glow* suave com cor primária) e animações de entrada (ex: *fade-in-up*) são essenciais e podem ser definidos em blocos `<style>` locais quando não forem facilmente cobertos pelo Tailwind.

5. **Organização de Arquivos Frontend:**
   - **JavaScript (`public/js/`):** Arquivos modularizados por responsabilidade da página (ex: `dashboard.js`, `theme.js`). Não misture regras de páginas diferentes no mesmo arquivo.
   - **Imagens/Mídias (`public/assets/`):** Organizadas na pasta de assets.
   - **CSS (`public/css/`):** Usar primariamente para estilos globais que realmente não possam ser resolvidos via utilitários do Tailwind (o que é raro neste projeto).

Sempre que um agente criar ou modificar uma página web, ele deve inspecionar `public/index.html` ou `public/dashboard.html` como referência viva de estruturação.

## Arquitetura de Tabelas (Data Grids) e Filtros
Quando o projeto exigir tabelas complexas (com paginação, ordenação multifacetada e filtros dinâmicos com checkboxes):
- **Estágio Atual (Mock/Protótipo):** A arquitetura é implementada em **Client-Side**. Isso significa que todo o gerenciamento de estado (Array de dados brutos, filtragem, interseção, ordenação e corte de paginação) ocorre inteiramente no JavaScript do navegador em memória, utilizando Vanilla JS puro.
- **Transição Futura (Produção em Larga Escala):** Quando a base de dados crescer consideravelmente, os agentes de IA devem auxiliar a migrar essa lógica para **Server-Side**. Ou seja, as interações de filtro, ordenação e paginação no frontend passarão a enviar parâmetros (query strings) nas requisições para a API Node.js. O backend será o responsável por executar a lógica usando SQL dinâmico (`LIMIT`/`OFFSET` e condições de `WHERE`).

## Segurança de Dados (Integração com Supra ERP)
> [!CAUTION]
> **REGRA DE SEGURANÇA MÁXIMA (READ-ONLY NO SUPRA)**
> Sob **NENHUMA HIPÓTESE** os agentes (backend Node.js ou qualquer script) poderão executar comandos como `INSERT`, `UPDATE`, `DELETE`, `DROP` ou `ALTER` no banco de dados do Supra (SQL Server SGC/SGC2). A integração com o Supra é **ESTRITAMENTE SOMENTE LEITURA (`SELECT`)**. O banco do Supra é de Produção e a sua integridade é inegociável. Todas as mutações e atualizações do sistema ocorrerão EXCLUSIVAMENTE no banco de dados local da aplicação (PostgreSQL).

## Melhores Práticas e Lições Aprendidas (Desenvolvimento MVP)
Durante o desenvolvimento do MVP, algumas decisões e práticas essenciais foram consolidadas e devem ser seguidas para futuras manutenções:

1. **Importação e Conversão de Datas do Excel (Seed):**
   - Ao importar planilhas (`.xlsx`) via biblioteca `xlsx`, o Excel armazena datas nativas como **números seriais** (dias desde 1900).
   - Scripts de importação devem conter lógica matemática apropriada para converter esse número serial para formato Data em JavaScript (`Math.floor(dt - 25569) * 86400 * 1000`) antes de persistir no PostgreSQL, evitando que colunas de datas vitais assumam valores `null`.

2. **Lógica de Sincronização Inteligente:**
   - A sincronização entre o Supra (SQL Server) e o banco local (PostgreSQL) não deve usar abordagens destrutivas cegas (`TRUNCATE` / repopulate) no dia a dia.
   - O algoritmo deve buscar a lista de documentos ativos do Supra, **comparar campo a campo** com os registros locais, e só aplicar comandos `UPDATE` nos registros que realmente sofreram mutação de valor/status/data.
   - Registros ausentes no Supra mas presentes localmente devem ser identificados por diferença de Conjuntos (Sets) em JavaScript e deletados (limpeza de órfãos).
   - O Frontend deve ser informado do balanço exato: "Analisados", "Atualizados", "Novos" e "Excluídos".

3. **UX de Filtros e Ordenação na Data Grid:**
   - **Filtros de Datas Hierárquicos:** Colunas do tipo `date` possuem um filtro customizado que agrupa opções no estilo Excel (Ano > Mês > Dia). Ao alterar o componente de filtro (ex: `contas_a_receber.js`), deve-se preservar a capacidade de reter o estado de expansão/colapso (`expandedState`) da árvore de datas.
   - **Ordenação Segura:** Valores `null` ou vazios (`-`) devem ser tratados de forma resiliente na ordenação client-side, sendo jogados para o **final da tabela**, independentemente da direção do sort (ASC ou DESC), para não "poluir" a primeira página de dados que o usuário quer ver.

4. **Padronização de URLs (Rotas Frontend):**
   - **NENHUMA URL deve conter a extensão `.html` para os usuários.** 
   - A configuração de rotas estáticas no Express (em `server.js`) deve mapear nomes limpos (ex: `app.get('/dashboard', ...)` ou `app.get('/perfil', ...)`) para os seus respectivos arquivos `.html`.
   - Links no frontend (tag `<a>` ou `window.location.href`) sempre devem apontar para a rota limpa: `/dashboard`, `/perfil`, `/contas_a_receber`, etc.

## Regras de Negócio do Dashboard (KPIs e Gráficos)
As métricas do Dashboard obedecem a uma matemática estrita baseada na tabela de títulos:
1. **Filtro de Data (Motor do Dashboard):** Os seletores globais de "Ano" e "Mês" operam **exclusivamente** sobre o campo `data_emissao` para delimitar o universo de dados (`filteredData`).
2. **Total Vendido:** Soma simples e incondicional do campo `valor_nota`.
3. **Total Recebido:** Soma simples e incondicional do campo `valor_deposito` (independentemente do status pago ou pendente — se houve depósito, é somado).
4. **Total em Aberto:** Soma do campo `valor_nota`, mas aplicando um filtro rígido: APENAS se o `status` for igual a `PENDENTE` **OU** se o `valor_deposito` for 0/Nulo/Vazio.
5. **Meta de Recebimento:** É mantida em banco (`metas_recebimento`) através de um **ÚNICO** registro global (`id = 1`). Os selects de mês/ano do painel de meta apenas filtram localmente o gráfico velocímetro verificando se a data real de recebimento (`data_pagamento`) está dentro do período visualizado contra o valor global da meta.
6. **Gráficos e Dark Mode:** Componentes como ApexCharts sofrem cache das cores no navegador (ex: Legend e DataLabels). Quando a classe `dark` do Tailwind muda, o Javascript DEVE atualizar forçadamente todas as propriedades visuais (`updateOptions(opts, false, false)` passando o objeto completo) para garantir legibilidade nos dois temas.

## Autenticação, Onboarding e Proteção de Rotas (Auth Guard)
- **Criação de Usuários e SMTP:** A criação de contas não exige digitação de senha pelo Admin. O backend gera uma senha forte, a encripta e utiliza o `nodemailer` para enviar as credenciais para o e-mail do usuário usando um template HTML responsivo estilizado com estética Tailwind (inline-styles). O e-mail contém um link com o parâmetro `?force_logout=1` para garantir que o cache de sessão seja limpo.
- **Proteção Global (auth_guard.js):** Para evitar flashes de conteúdo não autorizado, o controle de acesso é implementado injetando a tag `<script src="/js/auth_guard.js"></script>` no topo do `<head>` das páginas HTML protegidas. A lógica não usa mais um campo booleano genérico, mas lê o objeto de permissões explícitas no JWT.
- **Redirecionamento Rígido:** O `auth_guard.js` é implacável: se não houver token, envia para `/`. Se houver token mas `first_access === true`, tranca o usuário em `/primeiro_acesso`. Se tentar entrar em uma rota sem a permissão específica (`canViewUsers`, `canViewLC`, etc.), despacha o usuário imediatamente para a rota `/403`.
- **Estética de Telas 403 e Login:** Páginas externas ao layout do painel (como Login, Primeiro Acesso e Acesso Restrito 403) devem obrigatoriamente herdar a paleta suave de "Soft UI" da marca Nexomed (tons de `steel` para fundo e `nexo` para destaque), centralizadas na tela com leves sombras (`shadow-xl`).

## Controle de Acesso Baseado em Papéis (RBAC)
- O sistema abandonou flags booleanas para administradores. Agora, existe a coluna `role` na tabela `users` do PostgreSQL, mapeada para um modelo estrito de níveis de permissão no backend (`middleware/rbac.js`).
- **Nomenclatura de Níveis:** Os papéis atuais são `ADMIN`, `CR1` a `CR4` e `LC1` a `LC4`. As regras são definidas de forma explícita por flags booleanas no payload do token: `canViewCR`, `canViewLC`, `canViewUsers`, `canManageUsers`.
- Os agentes e o frontend nunca devem referenciar "se o usuário é admin", mas sim verificar a permissão específica exigida para o contexto de exibição ou ação (ex: ocultar um link via JS lendo `user.permissions.canViewCR`).

## Navegação Lateral (Sidebar e Submenus)
- **Estrutura Expandível:** Os links no menu lateral (Sidebar) agora estão agrupados sob blocos lógicos principais (Ex: `Financeiro` e `Licitações`) categorizados em cabeçalhos (Ex: `MAIN` e `HUB`).
- A visibilidade de blocos completos é gerenciada dinamicamente pelo `public/js/layout.js`, que utiliza os IDs dos grupos (como `menu-group-financeiro` ou `menu-group-licitacoes`) para omitir itens da tela caso o usuário não possua permissão (RBAC) para ver qualquer item interno do bloco.
- **Abertura Inteligente de Submenus:** A mecânica de expansão/colapso (`sidebar-submenu`, `.hidden`) é tratada globalmente via JS (`layout.js`), MAS na montagem inicial do HTML (build-time/server-side), o grupo que contém a página atual ativa DEVE ser renderizado já aberto (sem a classe `hidden`) e com a rotação do Chevron em `90deg`.
- **Rotação do Chevron:** O ícone de seta (`sidebar-chevron`) é desenhado nativamente apontando para a direita (`d="M9 5l7 7-7 7"`). Quando o submenu está aberto, o JS aplica a rotação `transform: rotate(90deg)` (apontando para baixo). O estado fechado retorna a `rotate(0deg)`.
- **Estética "Sash" (Design Premium):** Botões e links da sidebar NÃO usam fundos sólidos pesados. Quando uma rota está ativa, ela deve utilizar tipografia Semibold na cor primária (`text-nexo-400`) e um background sutil de 10% de opacidade (`bg-nexo-500/10`). Ícones internos de submenu usam um marcador circular vazado (`span` vazio com borda `border-current`).
- **Comportamento Colapsado (Centralização):** Todas as páginas que possuem a sidebar devem conter um bloco de `<style>` prevendo a classe `sidebar-collapsed` no `body`. É **obrigatório** centralizar os títulos de grupos (`h4`), os links principais (`nav a`) e os botões de submenu (`nav .sidebar-group-btn`) removendo os paddings laterais e forçando o alinhamento centralizado. O padrão CSS a ser injetado é: `body.sidebar-collapsed aside h4 { text-align: center; padding: 0; }` e `body.sidebar-collapsed aside nav a, body.sidebar-collapsed aside nav .sidebar-group-btn { justify-content: center; padding: 0; }`.
- **ATENÇÃO AO TAILWIND JIT:** Ao injetar classes via scripts dinâmicos (Javascript executado em node, por exemplo), aspas invertidas de *Template Literals* (`${variável}`) NUNCA devem ser escapadas com `\`, pois isso força a string literal no HTML final, inutilizando a compilação do Tailwind CDN (ex: quebrando as classes do `flexbox`).

## Peculiaridades do Banco de Dados Legado (Supra ERP)
- **Cruzamento de Tabelas de Itens da Nota:** A arquitetura original do banco de dados do Supra possui um relacionamento anti-intuitivo para o cruzamento entre cabeçalho (`nota_fiscal_venda`) e itens (`nota_fiscal_venda_item`). A coluna `nf_numero` na tabela de itens **NÃO** armazena o número da nota fiscal (`numero_nota`). Ela armazena o ID Primário Interno da tabela pai (`codigo`).
- **Como realizar o JOIN:** Ao invés de `ON item.nf_numero = cabecalho.numero_nota` (que puxará itens cruzados incorretos caso a nota tenha mesmo número em outra série), todo e qualquer agente que precisar buscar itens de uma nota **deve obrigatoriamente** fazer o cruzamento utilizando `ON item.nf_numero = cabecalho.codigo`.

## Diretrizes para a Tela "Itens Arrematados"
As seguintes regras definem o comportamento e design consolidados para o grid de Itens Arrematados (Licitações):
1. **Minimalismo e Foco (Sem KPIs / Text Search):** A interface deve permanecer limpa. Não inclua cards de KPIs no topo e nem barra de pesquisa global por texto livre (`#searchInput`). Toda e qualquer pesquisa de dados deve ser feita exclusivamente através dos filtros dinâmicos embutidos no cabeçalho de cada coluna (ícone de funil).
2. **Centralização Estrita de Cabeçalhos:** Todos os títulos de todas as colunas — sem exceção (nem mesmo Órgão e Material), tanto no grid principal quanto na tabela interna do modal de contrato — devem ser forçados ao centro geométrico, horizontal e verticalmente (`text-center`, `justify-center`, `align-middle`).
3. **Ícones de Filtro Flutuantes:** Para que o texto do cabeçalho permaneça no centro absoluto da célula, o ícone de filtro (funil) deve ser renderizado com posição absoluta (ex: `absolute right-2 top-1/2 -translate-y-1/2`). Ele não deve fazer parte do Flexbox que alinha o texto principal do título.
4. **Status Textual Simples:** Ao contrário de outros grids do projeto, a coluna de "Status" de itens arrematados não deve utilizar componentes de "Badges" ou "Pills" coloridos, devido à falta de dicionário/padronização dos textos que vêm do legado. Deve-se renderizar apenas o texto limpo, forçado em caixa alta (uppercase).
5. **Altura de Linha Fixa:** As linhas (`<tr>`) do grid principal possuem uma altura travada (`h-[150px]`) para simular o espaçamento de visualização do Excel, com os textos alinhados verticalmente ao centro. Colunas textuais (como Órgão e Material) devem usar quebra de linha normal (`break-words`, `whitespace-normal`), enquanto dados quantitativos permanecem `whitespace-nowrap`.
6. **Modal de Criação / Edição de Contrato (Múltiplos Produtos):** A atomicidade do banco de dados para itens arrematados é o **Produto/Item**, não o contrato em si.
   - O modal de criação de contrato deve permitir a inserção dinâmica de múltiplos produtos.
   - Os campos burocráticos (Datas e Status) pertencem ao escopo do **Produto**, e não ao escopo do contrato global.
   - O cálculo do "Total Normalizado" ocorre em tempo real via JavaScript (`* 0.3` para valores entre 10k e 100k, ou "AVALIAÇÃO INDIVIDUAL" para acima de 100k) interceptando eventos de input nos campos "Qtde", "Valor Unitário" e "Valor Total".
   - Deve existir um recurso de "Aplicar aos Demais" para clonar os campos de Datas e Status do primeiro produto para os subsequentes da interface.
   - Na inserção (POST), o backend deve gerar *N* registros independentes no banco de dados, onde cada um representa um produto, mas que compartilham as mesmas informações globais (Cód. Contrato, Órgão, Edital).
   - A geração da chave primária (`CHAVE`) ocorre automaticamente pela *Identity Sequence* do PostgreSQL. É proibido passar o ID no corpo da requisição POST. Em caso de dessincronização de *sequence* (ex: após seeding manual), deve-se usar `setval(pg_get_serial_sequence(...), MAX("CHAVE"))` diretamente no PostgreSQL para realinhar.

## Sistema de Notificações
O sistema possui uma central de notificações injetada globalmente, com as seguintes regras de desenvolvimento:
1. **Frontend Modular:** A UI (`public/js/notifications.js`) é carregada dinamicamente via `layout.js` e não deve ser copiada/colada em arquivos HTML. O estilo do "custom-scrollbar" também é injetado programaticamente por este script para garantir visualização consistente.
2. **Armazenamento:** As notificações utilizam duas tabelas no PostgreSQL: `notifications` (log central) e `notification_reads` (controle de leitura atrelado ao usuário, garantindo que o estado de leitura seja individual).
3. **Geração Inteligente (Diff):** Durante uma ação de `UPDATE` (PUT), o sistema realiza a comparação de campos (Diff) verificando os dados antigos contra os novos. Apenas colunas que **realmente sofreram mutação** geram log. Além disso, existe um dicionário de mapeamento (`columnNamesMap`) na rota backend para que nomes de colunas de banco de dados sejam convertidos para rótulos amigáveis (UX) na notificação.
4. **Proteção de Acesso (RBAC):** Somente perfis `ADMIN, LC1, LC2, LC3, LC4` podem visualizar a UI do sino e consumir a API `/api/notifications`. A interface sequer é renderizada para usuários de outros perfis.

## Diretrizes para a Tela "Agenda de Licitações"
A Agenda de Licitações herda a estrutura visual e comportamental (Data Grid, Abas por Empresa, Filtros Hierárquicos) dos Itens Arrematados, com as seguintes regras específicas consolidadas:
1. **Formatação Automática de Datas (Client-Side):** Todas as colunas do tipo `date` que retornam do banco no formato ISO 8601 (ex: `2026-07-30T03:00:00.000Z`) devem ser convertidas automaticamente pelo Javascript durante a renderização da célula usando `toLocaleDateString('pt-BR', { timeZone: 'UTC' })`. Essa conversão em tela é puramente visual (renderização), garantindo que o array de dados original permaneça intacto para alimentar a árvore do filtro hierárquico (ano/mês) de forma nativa.
2. **Responsividade do Grid (Sem Scroll Horizontal):** Para acomodar um alto volume de colunas (14+), o grid deve forçar o conteúdo a caber inteiramente na tela do usuário. Deve-se assegurar a ausência da classe `min-w-max` na tag `<table>` e o uso das classes `whitespace-normal break-words` nos cabeçalhos (`<th>`) e células (`<td>`). O cabeçalho deve possuir uma altura fixa maior (ex: `h-[70px]`) para comportar a quebra dos títulos longos.
3. **Exclusão de Registros (RBAC):** A permissão para exclusão de itens da Agenda é idêntica à de Itens Arrematados. A exclusão (botão de lixeira) só é renderizada caso o usuário possua permissão de alto nível, controlada no frontend pela constante `const canDelete = ['ADMIN', 'LC3', 'LC4'].includes(userRole);`.
4. **Lembretes e Cron Jobs (Notificações por E-mail):** O sistema possui um robô de cron (`services/cron_agenda.js`) que desperta em horários fixos e estratégicos (08h e 17h). Ele busca pregões do dia seguinte (`CURRENT_DATE + INTERVAL '1 DAY'`) e consolida um lembrete único na central de notificações. Além disso, dispara um **E-mail HTML Dinâmico** (via `nodemailer`) para todos os usuários da hierarquia (`ADMIN`, `LC1` a `LC4` em produção). O e-mail agrupa visualmente os pregões por empresa (NEXOMED vs BML) utilizando tabelas com `table-layout: fixed;` para garantir alinhamento perfeito. Nenhuma lógica complexa de *diff* é necessária para os e-mails, focando apenas no disparo consolidado nesses dois horários.

## Diretrizes para o Módulo de Clientes (Cobrança)
O módulo de Clientes, acessado via `/clientes`, serve como base para a frente de Cobrança e segue padrões rigorosos de UI e Arquitetura:
1. **Fonte de Dados (Supra ERP):** Para garantir dados limpos e indexados, a busca de clientes não é feita na tabela bruta `cliente_fornecedor`, mas obrigatoriamente na View `SGC.dbo.bi_cadastro_clientes`. 
2. **Proteção e RBAC:** A rota `/clientes` é restrita. Apenas usuários com os perfis `ADMIN, CR2, CR3, CR4, LC3, LC4` possuem permissão para acessá-la.
3. **Estética do Grid e Paginação:**
   - **Cabeçalhos:** O título das colunas deve ser estritamente centralizado (`justify-center w-full h-full`), com o ícone de filtro (funil) posicionado como absoluto (`absolute right-2 top-1/2 -translate-y-1/2`) para não interferir no alinhamento flexbox do texto.
   - **Ícone de Filtro:** O botão do funil deve ser "flat" (sem background colorido persistente), ganhando cor primária apenas quando há um filtro ativo.
   - **Filtros Dinâmicos:** O modal de filtro segue o padrão do sistema (checkboxes) com a opção inteligente "(Selecionar Tudo)" ancorada no topo.
   - **Paginação Minimalista:** Os controles numéricos e setas da paginação no rodapé não possuem bordas marcadas. Utilizam-se SVGs vetoriais elegantes para "Primeira/Última" e "Anterior/Próxima", com destaque de cor primária apenas na página ativa.
4. **Navegação (Drill-down):** Cada linha da tabela é interativa (`cursor-pointer`, hover cinza/nexo). Ao clicar em um registro, o sistema deve redirecionar o usuário para a rota detalhada utilizando o ID do cliente: `window.location.href = '/clientes/' + row.codigo`.

## Diretrizes da Tela de Detalhes do Cliente (Cobrança)
A tela de Detalhes do Cliente (`/clientes/:codigo`) atua como um hub central para as ações de cobrança, dividida em três pilares principais (Abas): **Notas Fiscais**, **Agenda de Contatos** e **Histórico**.
1. **Estética de Interatividade (Hover/Glow):** Cards informativos (KPIs de vendas, cards de contatos e itens da timeline do histórico) possuem um padrão estrito de elevação sutil e borda colorida no `hover` (ex: `hover:-translate-y-1 hover:shadow-lg hover:border-nexo-400 transition-all duration-300`). O design deve parecer dinâmico e responsivo ao mouse.
2. **Agenda de Contatos (Relacional):** 
   - A aba Agenda gerencia contatos/pessoas físicas vinculadas ao cliente (PostgreSQL local: `agenda_contatos`). 
3. **Histórico de Cobrança e Timeline:**
   - A lógica de Registro de Histórico de Cobrança exige a vinculação a um contato existente (`agenda_contato_id`). Isso força a alimentação do CRM.
   - O formulário possui uma seção colapsável de **"Agendar próximo contato"** que é acionada por um botão de toggle com design *Sash/Soft*. O estado real (salvo no banco no campo `has_agendamento`) governa regras futuras de notificação (cron).
   - **⚠️ Fuso Horário (Timezone):** É obrigatório que qualquer data transacional salva via `CURRENT_TIMESTAMP` na tabela `historico_cobranca` (que seja do tipo `timestamp without time zone`), seja resgatada na query do backend (Node) injetando `AT TIME ZONE 'UTC'` (ex: `h.created_at AT TIME ZONE 'UTC' AS created_at`). Isso impede o driver `pg` de classificar erroneamente a hora gerada pelo servidor como se fosse a hora local, garantindo que a renderização no Javascript do navegador diminua corretamente as 3 horas (-03:00) do fuso de Brasília.
4. **Isolamento de Escopo JS:** Métodos disparados diretamente por eventos HTML (ex: `onclick="ClienteDetalhe.changeModalPage(1)"`) devem sempre referenciar de forma estrita o Namespace/Objeto da respectiva página para evitar *ReferenceErrors*, pois o sistema não empacota o JS via Webpack, contando com escopo de janela (window) isolado por namespaces definidos no topo dos arquivos Vanilla JS.

## Padrões de Interface e Experiência (UX/UI Coesos)
As seguintes regras foram consolidadas para garantir uma experiência premium uniforme em todas as telas:
1. **Custom Scrollbar:** O uso da barra de rolagem nativa do navegador (branca e grossa) é proibido. Toda área de rolagem (tabelas, main content do dashboard, modais longos) deve utilizar a classe utilitária `custom-scrollbar`. É necessário garantir que o bloco CSS correspondente (`::-webkit-scrollbar`) esteja injetado na tag `<style>` da página.
2. **Listas Suspensas (Dropdowns Customizados):** Para manter a estética em modais, abandonou-se a tag nativa `<select>`. Combos de seleção (ex: Modalidade, Portal) devem ser desenhados usando `<div>` relativas e `<ul>` absolutas com `max-h-48 overflow-y-auto custom-scrollbar`, gerenciando a seleção e placeholder visuais via Vanilla JS.
3. **Data Grids Interativos:** Para facilitar a usabilidade, as linhas inteiras (`<tr>`) dos grids principais (como `/contas_a_receber` e `/itens_arrematados`) devem ser clicáveis (`cursor-pointer hover:bg-gray-50`), acionando a abertura do modal de detalhes, abolindo a necessidade do usuário clicar apenas em uma palavra específica.
4. **Coesão e Reuso de Componentes:** Funcionalidades de visualização (ex: "Ver Danfe" carregando PDF em nova aba) e componentes de edição interativos (ex: Edição de Contrato em Notas Fiscais) devem estar espelhados de forma idêntica entre os diferentes fluxos (ex: tela de `/contas_a_receber` e tela de `/clientes/:codigo`).

## Evoluções na Arquitetura de Dados
1. **Prazos e Status (Itens Arrematados):** Entendeu-se que campos burocráticos de licitação (Data Proposta, Vigência, Status) pertencem ao ciclo de vida do **Contrato** como um todo, e não a cada produto de forma isolada. Modais de edição devem isolar esses campos em uma sessão separada e, ao salvar, replicar os valores para todos os itens atrelados ao mesmo contrato.
2. **Filtragem Otimizada (Memória vs BD):** Ao exibir listagens puras vindas do Supra (como o `/api/clientes`), se a regra de negócio exigir exibir **apenas** clientes que já tiveram movimentação, não se deve sobrecarregar o SQL Server com cruzamentos complexos. O padrão correto é fazer um `SELECT DISTINCT` na base local (PostgreSQL), carregar os códigos em um `Set` no Javascript (Node.js) e utilizar `.filter()` na memória do servidor antes de devolver a resposta, garantindo performance excelente.

## Integração Temporária com Legado (VBA)
Atualmente, existe uma API temporária para o sistema VBA (`/api/vba/agenda_licitacoes`) autenticada por **API Key**. Ela serve como espelho (Shadowing) enquanto o Access não é desativado.
- **Chave no `.env`:** `VBA_API_KEY`

### Como Desligar a API (Quando o VBA for aposentado):
1. Remover o import e `app.use('/api/vba', ...)` do arquivo `server.js`.
2. Excluir o arquivo `routes/vba_integration.js`.
3. Remover a variável `VBA_API_KEY` das variáveis de ambiente de produção (Heroku e local).

## Motor de Agendamento e Notificações (Cobrança)
O sistema possui um motor autônomo (Cron Jobs) construído em `services/cron_cobranca.js` para alertar os usuários sobre compromissos agendados no CRM de cobranças. Ele é dividido em duas estratégias distintas de execução:

1. **Sumário Diário (Heroku Scheduler / One-Off Dyno):**
   - **Objetivo:** Disparar um e-mail matinal consolidado às 08:00h (Horário de Brasília) contendo a lista completa de todos os contatos que o usuário precisa realizar no dia.
   - **Gatilho:** Não roda em loop no código da aplicação. É acionado externamente via `npm run scheduler:cobranca` (configurado no painel do Heroku Scheduler).
   - **Estética:** O e-mail utiliza `nodemailer` para gerar uma estrutura HTML Premium com formatação tabular clara (Código, Razão Social, Fantasia, Motivo) para o usuário se organizar sem nem precisar abrir o sistema.

2. **Lembretes em Tempo Real (Node-Cron Interno):**
   - **Objetivo:** Alertar o usuário no painel do sistema **exatamente 10 minutos antes** da hora exata do compromisso.
   - **Gatilho:** Roda nativamente atrelado à memória do próprio servidor web (`server.js`) utilizando `node-cron` (`* * * * 1-5`).
   - **Mecânica:** A cada virada de minuto, a lógica calcula `Hora de Brasília Atual + 10 minutos` e faz um *polling* pontual no banco de dados. Caso exista um *match* exato de data e minuto na tabela `historico_cobranca`, insere uma notificação na tabela `notifications` com ação prefixada por `REMINDER_`.
   - **UX:** A notificação aciona o SSE (`eventBus.emit('refresh')`) que despacha o aviso para o navegador do usuário instantaneamente, renderizando a interface de alerta com a tag visual roxa 🟪 e ícone de relógio na aba "Agendamentos". A UI tocará um alarme sonoro unicamente quando o ID da notificação mais recente aumentar.
   - **Performance:** Como roda puramente no Backend, não existe nenhuma requisição de polling contínuo (AJAX) no client-side poluindo a aba Network do navegador. Apenas a via SSE pré-existente é utilizada.
