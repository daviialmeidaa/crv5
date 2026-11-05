# Instruções para agentes de IA — Hub Nexomed

Leia este guia antes de alterar o projeto. Ele se aplica ao repositório inteiro.
Siga também as instruções específicas da área alterada e as orientações atuais
do usuário. O código em uso e seus contratos devem ser examinados antes de
propor qualquer mudança; este documento não substitui essa leitura.

## 1. Conduta e limites de autorização

- **Nunca faça commit, push, merge, criação/publicação de PR, tag, release ou
  deploy automaticamente.** Execute uma dessas ações somente quando o usuário
  pedir explicitamente aquela ação. Pedido de desenvolvimento, teste ou limpeza
  não autoriza publicar, nem autoriza toda a sequência de entrega.
- Não reescreva histórico, não use `push --force`, `reset --hard`, `clean` ou
  descarte alterações do usuário como parte de uma tarefa comum. Antes de uma
  operação destrutiva, apresente seu alcance e obtenha autorização específica.
- Verifique `git status` e o diff antes de editar. Preserve alterações existentes
  e mantenha o trabalho dentro do escopo solicitado. Não inclua reorganizações,
  novas dependências ou mudanças de regra de negócio sem necessidade.
- **Preserve o `.env`**, arquivos locais de configuração, uploads e dados dos
  usuários. Limpeza do repositório não autoriza excluí-los. Não imprima valores
  secretos em logs, respostas, capturas, testes, exemplos ou documentação.
- Não versione credenciais, macros com chaves reais, dumps com dados ou artefatos
  de execução. Use nomes de variáveis e exemplos fictícios para documentar.
- Não reinicie serviços externos, altere configurações do Heroku ou envie e-mails
  e mensagens reais sem autorização explícita. Scripts e botões do próprio Hub
  também podem produzir esses efeitos: examine-os antes de executar.
- Identifique o ambiente de banco antes de testar gravações. A existência de
  credenciais no `.env` não autoriza usar produção como laboratório.
- Comunique o que mudou, como foi verificado e os limites restantes. Não declare
  estabilidade absoluta nem cobertura de cenários que não foram executados.

## 2. Arquitetura atual e localização das responsabilidades

O Hub combina Node.js/Express com FastAPI/Python. O frontend usa EJS, HTML, CSS e
JavaScript no navegador, sem React, Vue, Angular ou etapa de bundling.
PostgreSQL mantém os dados do portal; SQL Server integra o Supra; Redis é cache.
JWT e `bcryptjs` fazem parte da autenticação existente.

```text
app/
  server.js                   Configuração e entrada do Express
  config/                     Mapeamento de páginas, URLs e metadados confiáveis
  routes/                     Endpoints do Hub
  middleware/                 Autenticação e autorização
  services/                   Integrações, sincronização, cache/eventos e rotinas
  db/                         Acesso aos bancos e Redis
  scripts/                    Entradas dos agendamentos
  views/layouts/base.ejs       Base das páginas internas
  views/components/           Componentes EJS e estrutura dos grids
  views/pages/<pagina>/       head.ejs, index.ejs e tail.ejs
  public/html/<pagina>/       Login, primeiro acesso e 403 independentes
  public/css/                 Tokens globais, componentes e CSS de cada página
  public/js/                  Componentes, scripts compartilhados e controllers
  public/assets/              Imagens e áudios
  public/uploads/             Arquivos utilizados pelos usuários
api/                          Aplicação FastAPI
scripts/start_hub.js           Inicialização conjunta Node + FastAPI
tests/e2e/                    Testes com navegador e bancos descartáveis
requirements.txt              Entrada de instalação: -r api/requirements.txt
```

O comando local padrão é **`npm run dev`**. `npm start` também inicia os dois
serviços, sem o monitoramento do nodemon. `npm run start:node` inicia só o Node.
A `.venv` e o `node_modules` ficam na raiz e não devem ser versionados.
Mantenha o supervisor, Docker, Procfile e comandos npm coerentes quando alterar
caminhos. Não transforme uma reorganização de arquivos em troca de stack.

## 3. Reutilização obrigatória dos componentes existentes

Antes de criar HTML, CSS ou JS reutilizável, procure a implementação equivalente
no projeto. **Use e estenda os componentes existentes; não copie sua lógica
para uma página.** Uma particularidade de tela deve ser configuração, callback,
preset ou variação delimitada do componente, conforme os padrões já usados.

### Base das páginas

- Páginas internas usam `app/views/layouts/base.ejs`. Sidebar, navbar, footer e
  os subcomponentes da navbar têm templates, CSS e JS próprios. Não repita essa
  estrutura nem seus listeners nos controllers das páginas.
- Registre título, navegação ativa e variações em `app/config/pageViews.js`.
  Registre caminhos em `app/config/publicPaths.js` e use o serviço
  `app/services/pageRenderer.js` conforme as rotas existentes.
- Conteúdo e recursos específicos ficam em `views/pages/<pagina>/`;
  controllers ficam em `public/js/pages/<pagina>/`.
- **Login, primeiro acesso, recuperação/troca de senha e 403 ficam fora da base
  compartilhada.** Não aplique sidebar, navbar ou footer a essas telas.
- Preserve URLs públicas, IDs, namespaces e handlers utilizados pelos scripts.
  Links novos usam rotas limpas, sem `.html`; mantenha os aliases existentes.
- Templates e nomes de includes são definidos pelo servidor. Nunca passe
  caminhos recebidos em requisições para renderização. Escape texto externo
  com `<%= valor %>`; reserve saída HTML sem escape para conteúdo confiável.

### CSS e apresentação

- `app/public/css/global.css` é a fonte da paleta `nexo`/`steel`, tipografia e
  estados `success`, `alert`, `danger`, `info` e `neutral`. Reutilize seus tokens.
- CSS de componente fica em `public/css/components/`; CSS específico fica em
  `public/css/pages/<pagina>/<pagina>.css`, delimitado por `data-page` quando
  necessário. Não recrie blocos de estilos estáticos dentro de HTML ou JS.
- A configuração compartilhada `public/js/shared/tailwind.config.js` lê a paleta
  global. Não replique `tailwind.config` por página nem invente outra paleta.
- Preserve a ordem dos recursos: CSS global, configuração/recursos compartilhados,
  componentes e CSS da página. Carregue componentes JS antes dos controllers.
- JS pode controlar valores e estados dinâmicos, como posição de popup e
  dimensão calculada. Prefira classes de estado e variáveis CSS.
- Preserve tema claro/escuro, tipografia por contexto, responsividade, rolagem,
  alinhamentos, cores condicionais e interações já existentes. Componentizar não
  autoriza redesenhar a tela. Verifique também telas de notebook e modais.
- Use modal, calendário, seletor de horário, notificações e demais componentes
  existentes. Não introduza versões paralelas para resolver um caso de página.

### Data Grid

- Toda nova listagem que precise de grid deve usar **`HubDataGrid`**, em
  `public/js/components/data-grid/`, e os parciais de
  `views/components/data-grid/`. Contas a Receber é a referência funcional.
- Filtros, ordenação, paginação, seleção/soma, conversões e exportação pertencem
  aos subcomponentes. A página fornece colunas, dados, permissões e ações de
  negócio; o grid não conhece token, API ou persistência.
- Use o preset `presets/nota-items.js` para a apresentação compartilhada dos
  produtos das notas. Para grids em modais, use o template/montagem existente e
  destrua a instância ao removê-la para evitar listeners duplicados.
- Preserve filtros em cascata, opção de vazios, árvore de datas e seu estado de
  expansão. Filtro sem seleção significa zero resultados. Vazios ficam no fim
  da ordenação tanto crescente quanto decrescente.
- Preserve Ctrl/Meta+clique e arrasto, contagem/soma/média, tratamento de
  negativos e limpeza de seleção. A exportação contempla todas as linhas
  filtradas, incluindo outras páginas, e conserva tipos numéricos.
- **Recursos são opcionais.** Use `export: false`, `pagination: false` e as
  configurações existentes em vez de esconder botões com CSS ou duplicar lógica.
  Sem exportação em toda a página, use os assets com `exportEnabled: false`.
- Não reintroduza exportação em Usuários, Clientes, Notas do Cliente, produtos
  dos modais de nota, lista de contratos OPME ou modal de cirurgias em aberto.
  Nas abas do contrato OPME, a exportação permanece em `#tabsContainer`.
- O modal Banco de Códigos preserva a interação original: cabeçalho seleciona
  a coluna pesquisada, sem seletor separado `#bcLookupSearchColumn`, sem funis,
  ordenação, soma, exportação ou paginação. Mantém destaque de Cód. Bio,
  tooltips, limite de 100 resultados e orientação para refinar a busca.
  Reutilize `renderHeader`, `headerClassName` e `refreshHeaders: false`.
- Agenda e Itens Arrematados mantêm as alturas responsivas de referência
  (110 px e 150 px a partir de 1536 px), podendo crescer com o conteúdo,
  e as quebras/larguras específicas de suas colunas. Não force densidade única
  que trunque textos ou elimine a apresentação existente.

## 4. Backend, autenticação e contratos

- Siga os padrões do router/service alterado. Separe transporte HTTP,
  persistência, integração e apresentação sem refatorar o domínio inteiro.
- Preserve métodos, caminhos, parâmetros, status e formatos de resposta usados
  pelo Hub, VBA e outras integrações. Valide os dois lados ao mover um arquivo.
- Toda rota protegida exige autenticação e autorização no backend. Ocultar um
  botão no navegador não concede nem substitui permissão.
- Consulte `app/middleware/rbac.js` e os perfis carregados do banco. Verifique a
  permissão específica da ação, respeitando também hierarquia e regras de
  gerenciamento de usuários. Não substitua o modelo por um booleano de admin.
- Preserve os guards de sessão e os fluxos de login, primeiro acesso e 403.
  Não enfraqueça validações nem exponha senha/hash, token ou segredo em respostas.
- Escape conteúdo externo; use consultas parametrizadas. Identificadores SQL
  dinâmicos precisam de lista permitida, não de interpolação de entrada livre.
- Não trate `0` como ausência usando fallback com `||` em valores financeiros.
  Diferencie zero, vazio e nulo conforme o contrato de cada campo.

## 5. Bancos de dados, transações e cache

**Supra real é somente leitura para os agentes.** Nunca execute `INSERT`,
`UPDATE`, `DELETE`, `MERGE`, `DROP`, `ALTER`, `TRUNCATE`, `EXEC` ou outra operação
com efeito de escrita em SGC/SGC2, inclusive por scripts ou endpoints do Hub.
A existência de integração de pedidos no código não autoriza testá-la no ERP.
As gravações de teste devem ocorrer no PostgreSQL isolado da suíte.

- Use as conexões existentes em `app/db/` e `api/database.py`. Não crie outra
  configuração de banco nem substitua o `.env` para rodar testes.
- Operações de lote precisam ser atômicas. No Node, obtenha um único
  `client = await pool.connect()` e execute `BEGIN`, todas as consultas,
  `COMMIT` ou `ROLLBACK` nesse client, liberando-o em `finally`.
  **Não use `pool.query('BEGIN')`**: requisições concorrentes podem trocar de
  conexão e misturar transações. Preserve a disciplina equivalente na FastAPI.
- Em consultas pesadas, reutilize o padrão de cache e suas chaves. Após uma
  gravação confirmada, invalide todas as chaves afetadas antes da resposta de
  sucesso, incluindo listas globais e por contrato. Em exclusões, derive os
  contratos dos registros realmente removidos, sem depender só do corpo enviado.
- Falhas de Redis não devem apagar dados nem substituir o banco como fonte de
  verdade. Evite novas cópias volumosas de cache e investigue consumo real antes
  de alterar TTL ou política; não suponha plano, memória ou configuração iguais
  entre desenvolvimento e produção.
- Preserve compressão das respostas comuns e sua exceção para SSE: buffering
  pode impedir a entrega dos eventos. Não substitua o fluxo SSE por polling.
- Considere índices e plano das consultas quando necessário. Prepare alterações
  de esquema revisáveis; não execute DDL ou migrações em produção por iniciativa.
- Sincronizações devem respeitar comparação incremental, normalização e regras
  de remoção existentes. Não substitua o processo por `TRUNCATE` e recarga cega.

## 6. FastAPI e compatibilidade com VBA

- A aplicação Python fica em `api/`: routers HTTP, services, config, security,
  schemas e compatibilidade. Novos endpoints seguem essa separação.
- O Node recebe as URLs públicas e usa o proxy para a FastAPI no mesmo servidor.
  Preserve `/api/vba/agenda_licitacoes`, `/docs`, `/api/docs` e
  `/api/openapi.json`. Registre novos prefixos no proxy quando necessário.
- Preserve `x-api-key` e a configuração **`VBA_API_KEY`**. Não desative a
  integração por considerá-la temporária e não grave chaves reais em exemplos.
- O GET e as gravações da Agenda usam a mesma tabela PostgreSQL do Hub. A rota
  normal da interface `/api/agenda_licitacoes` continua no Node. Não crie outra
  base nem volte a exigir Access para a integração já migrada.
- Preserve serialização, sanitização, datas, horas como fração de dia do Excel,
  distinção entre zero e vazio e os formatos de erro documentados.
  `CHAVE` bigint deve manter todos os dígitos, inclusive quando transportada
  como string; não a converta para número JavaScript sem segurança de precisão.
- Na planilha, mude apenas o que foi solicitado: preserve fórmulas, preparação,
  formatação e rotinas auxiliares. A ordenação definida para a leitura da macro
  é CHAVE crescente. Não confunda isso com a ordenação padrão do GET da API.
- Preserve a comunicação FastAPI → PostgreSQL LISTEN/NOTIFY → Node/SSE.
  Respeite quando uma operação deve gerar log/notificação ou apenas atualizar
  dados. Não repita gravações automaticamente ao falhar uma chamada de rede.
- Detalhes de payloads, conversões, instalação e hospedagem: [API](../api/README.md).

## 7. Invariantes de negócio que não podem mudar numa reorganização

### Financeiro, notas e cobrança

- Dashboard: filtros globais de ano/mês usam `data_emissao`; vendido soma
  `valor_nota`; recebido soma `valor_deposito` independentemente do status;
  aberto segue o critério existente de pendência ou depósito zero/nulo.
  A meta global usa `metas_recebimento.id = 1`, e seu período considera a data
  de pagamento. Não reinterprete os indicadores durante manutenção visual.
- No Supra, `nota_fiscal_venda_item.nf_numero` referencia o `codigo` interno do
  cabeçalho, **não** `numero_nota`. Preserve a identificação correta de empresa,
  série/documento e os critérios existentes ao consultar itens de notas.
- Contatos e histórico de cobrança preservam vínculos, exclusão lógica e
  agendamento de retorno. Preserve o tratamento de timezone e o contrato de
  timestamps das queries existentes; não aplique deslocamentos duplicados.
- No módulo de custos, preserve a cascata de busca do custo por lote/origem/data,
  histórico e lançamento manual. O endpoint atual de salvamento recebe `id` e
  `custo_unitario`; não o altere para outra chave por uma suposição documental.
- Preserve sinais de devolução, CFOPs, precisão, totalizações e exibição contábil
  entre parênteses tanto na tela quanto nas exportações. Custos usam a permissão
  específica `canViewCustos`.

### Licitações e OPME

- Preserve a separação por empresa, chaves geradas pela sequência e os vínculos
  entre itens arrematados e contratos. Observe o comportamento atual do modal
  para campos compartilhados e campos por produto; não os redistribua como
  parte de uma mudança de layout.
- No OPME, mantenha a seleção de contrato, agrupamento de cirurgias por
  contrato/paciente/data, abas dependentes, precisão configurada e valores
  bonificados iguais a zero. Não substitua zero pelo preço do catálogo.
- Preserve compatibilidade com dados legados: textos longos, nulos e o esquema
  existente. Não acrescente FKs, restrições ou truncamentos sem avaliar os dados
  e o fluxo que motivaram o modelo atual.
- Sincronização de notas OPME aceita os status válidos `4` e `2`; canceladas
  (`6`) não permanecem vinculadas como válidas. Trate `numero_nota` nulo antes
  de converter para texto. A limpeza de cancelamentos deve funcionar mesmo
  quando a busca não encontrar notas válidas.
- Na manutenção da integração de pedidos, preserve os mapeamentos críticos
  existentes: bloqueio de geração de código, situação `3`, lista `1`, condição
  `2`, data do servidor, descrição/CST/unidade/custo do produto, flags dos itens
  (`1`, `1`, `4`, `1` nos campos correspondentes) e preço zero do Hub.
  Isso documenta o código; **não autoriza executar pedidos no Supra real**.

### Notificações e e-mails

- Preserve leitura individual, permissões e geração por mudanças efetivas.
  Não crie logs de alteração quando os campos comparados não mudaram.
- Diferencie rotinas do Scheduler e lembretes internos. Não inicialize cron
  duplicado nem execute rotinas reais apenas para verificar um import.
- Reutilize templates corporativos de e-mail, com CSS inline compatível com
  clientes de e-mail e imagens em URL absoluta. Essa necessidade de inline é
  específica dos e-mails, não uma autorização para duplicar CSS nas páginas.

## 8. Verificação e entrega

1. Inspecione o diff e identifique páginas, endpoints, banco, cache e integrações
   afetados. Compare o fluxo existente antes e depois, inclusive seus modais.
2. Execute verificações proporcionais à mudança. Para persistência e interação,
   use a suíte **`npm run test:e2e`**, podendo selecionar cenários relacionados.
   Preserve e amplie testes quando houver nova regra ou regressão relevante.
3. A suíte usa Playwright, Express/FastAPI reais, PostgreSQL e Redis descartáveis
   e dados fictícios. Supra, SMTP e municípios são substituídos em teste.
   Não remova essas proteções nem intercepte as APIs do Hub para simular um
   sucesso que deveria ser confirmado no banco.
4. Verifique gravação e releitura, edição, exclusão/desativação conforme o módulo,
   falhas, permissões, rollback, concorrência e cache conforme o impacto.
   Navegar por páginas sem verificar persistência não comprova CRUD.
5. Preserve relatórios e artefatos em diretórios ignorados pelo Git. Nunca use
   dados reais ou credenciais fixas como fixtures.
6. Revise caminhos, imports, assets, documentação e `git diff --check`. Para uma
   mudança apenas documental, valide conteúdo e links; não execute rotinas com
   efeitos externos ou toda a suíte sem necessidade.
7. Entregue o resultado e suas limitações ao usuário. **Pare antes de commit,
   push ou deploy**, salvo pedido explícito para a ação correspondente.

## Documentação de referência

- [Apresentação e uso diário do Hub](../README.md).
- [Base EJS e criação de páginas](../app/views/README.md).
- [CSS e tokens compartilhados](../app/public/css/README.md).
- [Data Grid, presets e extensões](../app/public/js/components/data-grid/README.md).
- [FastAPI e contrato VBA](../api/README.md).
- [Execução, cobertura e limites dos testes](../tests/e2e/README.md).
