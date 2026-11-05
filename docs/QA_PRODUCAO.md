# Homologação da reorganização — 04/11/2026

**Parecer: a reorganização passou nas verificações de caminhos e integração
executadas, mas o sistema não recebe aprovação geral para produção enquanto
os achados abaixo permanecerem abertos.** Não foi realizado deploy.

## Resultados

| Bateria | Resultado |
| --- | --- |
| Regressão inicial: Node, Python e Playwright | 77 aprovados: 23 + 27 + 27 |
| Homologação com HTTP e bancos reais | 80 testes: 76 aprovados e 4 falhas |
| Indisponibilidade e ciclo de processos | 5 aprovados |
| Nova execução das transações com os 44 índices | 7 aprovados; repetição dos cenários já contabilizados |

Não há testes ignorados ou falhas marcadas como sucesso esperado na bateria
ampliada. `npm run test:staging` retorna código diferente de zero pelos quatro
problemas reproduzidos. Os 77 testes iniciais, isoladamente, não detectavam esses
problemas porque parte deles usava respostas simuladas de negócio.

## Ambiente e fidelidade

- Imagem construída pelo Dockerfile do projeto, `npm ci --omit=dev` e `npm start`.
- Node 20 e Python 3.11 na imagem; a suíte Python local também executou em 3.12.
- PostgreSQL 15 e Redis 7 separados da produção. Foram reproduzidas 26 tabelas,
  354 colunas, 33 restrições e 44 índices a partir de metadados consultados em
  modo somente leitura. Não existem triggers nessas tabelas na origem consultada.
- Apenas registros fictícios: 60 títulos, 62 agendas, usuários com diferentes
  perfis, contrato, unidade, produto, saldos de ata, cirurgia, contato e cobrança.
- Nos testes ampliados, login, bcrypt, JWT, RBAC, Express, FastAPI, proxy,
  PostgreSQL, Redis e ponte de notificações são reais. Não há interceptação das
  respostas HTTP de negócio no Playwright.
- As fronteiras controladas substituem somente o Supra, os gatilhos automáticos
  de cron e a entrega SMTP. Os e-mails são renderizados pelo Nodemailer e
  capturados no container em `/tmp/qa-outbox.jsonl`, sem envio externo.
- O preflight exige localhost e a identidade exclusiva do servidor de QA. As
  fronteiras recusam execução fora do banco `nexomed_qa` e host Docker previstos.

## Falhas reproduzidas

| Prioridade | Reprodução e resultado | Código |
| --- | --- | --- |
| Alta — segurança | POST anônimo em `/api/contratos/nexomed-insere-contrato` insere contrato e responde 200; deveria exigir autenticação. As quatro rotas desse router não usam middleware de autenticação. | `app/routes/contratos.js` |
| Alta — segurança | Login com perfil BLOQUEADO, permissões vazias, seguido de GET `/api/titulos` retorna 200 e os 60 títulos fictícios. A proteção do frontend não impede a leitura direta da API. | `app/routes/titulos.js` |
| Alta — funcional | OPME → BIO001 → Saldo Ata → clicar no item existente com valor unitário preenchido. O navegador gera `ReferenceError: casas is not defined` e o modal de edição não abre. Também há referência a `getSaldoAtaCasas` sem definição, impedindo concluir o cálculo mesmo após resolver a primeira referência. | `app/public/js/pages/cirurgias/cirurgias.js` |
| Média — validação | DELETE `/api/vba/agenda_licitacoes/abc`, com chave de API válida, responde 500 porque o identificador inválido chega ao PostgreSQL. Esperado: resposta 4xx para entrada inválida. | `api/routers/vba.py`, `api/services/agenda.py` |

Os quatro arquivos responsáveis foram comparados byte a byte com os respectivos
arquivos do HEAD anterior à movimentação: são **idênticos**. Portanto, os achados
acima são preexistentes, não regressões provocadas pela mudança de diretórios.
As regras de negócio e permissões não foram alteradas nesta etapa de QA.

## Cenários aprovados

- 75 endpoints protegidos rejeitam requisições anônimas. As rotas de contratos
  acima foram verificadas separadamente; não estão incluídas nesse número.
- Login válido, senha incorreta, usuário inexistente/inativo, JWT ausente,
  malformado, expirado ou com assinatura incorreta; permissões de LC, CR e OPME.
- 16 páginas, recursos locais, tema persistido após reload, navegação por perfil,
  primeiro acesso com mudança real da senha e saída por `force_logout`.
- Leituras de usuários, perfis, metas, clientes, títulos, contatos, histórico,
  licitações, itens arrematados, custos, notificações e cadastros OPME.
- Agenda criada no Hub e lida pela API VBA, editada pela API VBA e lida no Hub,
  exclusões nas duas direções e 20 inclusões simultâneas com IDs únicos.
- Datas brasileiras/ISO, horário fracionário do Excel, Unicode, CHAVE bigint
  acima da precisão segura do JavaScript e datas BC sem alteração do dado original.
- CRUD real de contatos, usuários e itens arrematados; histórico de cobrança;
  atualização de perfil e meta; rejeição de e-mail duplicado e campos obrigatórios.
- Navegador: inclusão/edição/exclusão da agenda, alternância Nexomed/BML,
  paginação com 31 agendas e 60 títulos, exportação Excel e abas OPME com dados.
- Agenda em 1024×768 e 390×768; modal acessível dentro da viewport. Capturas
  do dashboard e do modal em 1024×768 também foram inspecionadas visualmente.
- Gzip real nas listagens; SSE sem gzip; publicação FastAPI → NOTIFY PostgreSQL
  → bridge Node → stream HTTP com a notificação recém-criada.
- Cache Redis realmente servido e invalidado em alteração/exclusão de cirurgia;
  preservação de valor zero; rollback de lote com item inválido sem insert parcial.
- JSON malformado retorna 400, corpo acima de 5 MB retorna 413, rota ausente
  retorna 404, Swagger/OpenAPI funcionam pelo mesmo servidor do Hub.
- Redis parado: fallback de leitura para PostgreSQL. PostgreSQL parado: erro
  controlado no Hub e Swagger disponível. Banco reiniciado: consultas retomadas.
- Queda da FastAPI encerra o supervisor/Node com erro, permitindo reinício do
  conjunto. SIGTERM direto no supervisor encerra com código zero e permite reinício.
- `npm run dev` inicia Node e FastAPI e disponibiliza `/docs` em QA.
- Comandos `scheduler:agenda` e `scheduler:cobranca` executam com dados reais de
  QA e e-mails capturados; `scheduler:agenda:friday` inicia e respeita o dia da semana.
  A função da rotina de sexta também foi chamada com `daysToAdd: 3` e
  `isFridayRoutine: true`, gerando o lembrete e o e-mail correspondentes.
  Foram conferidas nove mensagens MIME capturadas, cobrindo boas-vindas,
  agenda diária, cobrança e agenda de segunda-feira.

## Verificações externas somente de leitura

PostgreSQL de produção respondeu ao SELECT de diagnóstico; Supra SGC e SGC2
responderam a SELECT 1; Redis respondeu PONG; SMTP aceitou a verificação de conexão
e autenticação, sem envio de mensagem. Nenhum dado de negócio foi gravado nesses
serviços durante o QA.

Na consulta à API do Heroku: stack `heroku-24`, geração Cedar, buildpacks Python
e Node nessa ordem, processo web `npm start`, um dyno Basic. As variáveis de banco,
JWT, VBA, Redis, Supra e SMTP necessárias estão presentes. Nenhum valor de segredo
foi incluído nos relatórios e o `.env` permaneceu intacto, verificado por SHA-256.

## Limites e evidências

Não foram executadas mutações no Supra, geração real de pedidos, entrega real
de e-mails, reinício de dynos nem deploy. A configuração efetiva de cada tarefa
no painel do Heroku Scheduler não foi consultada. Não houve mudança artificial do
relógio para uma sexta-feira completa. Não foi automatizado Excel/VBA.

O teste de SIGTERM usa o supervisor diretamente. `docker stop` com npm como PID 1
encerrou o container, mas o npm retornou código 1 ao receber SIGTERM; esse caso não
é contabilizado como encerramento limpo do supervisor.

O banco de QA tem massa pequena e fictícia; isso não equivale a ensaio de carga
com volume/distribuição de produção. O navegador usado foi Chrome/Chromium,
sem matriz Firefox/Safari. O runtime gerenciado do Heroku não foi executado nesta
máquina. Não é possível concluir cobertura de todas as combinações de negócio.

Evidências locais, ignoradas pelo Git:

- `playwright-report/staging/index.html`: 80 testes, incluindo as quatro falhas.
- `test-results/staging-results.json`: resultado estruturado da bateria ampliada.
- `test-results/staging/`: screenshots, contextos de erro e traces das falhas.
- `test-results/resilience-results.json`: cinco verificações de recuperação.
- `playwright-report/e2e/index.html`: suíte original de navegador.

Reprodução e comandos: `tests/staging/README.md`. Os testes permanecem disponíveis
para verificar as correções em uma alteração específica, sem misturar permissões
e regras de OPME com a reorganização estrutural.
