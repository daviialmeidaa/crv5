# Testes do Hub com banco real

Esta suíte usa o navegador como um usuário, executa as rotas Express e FastAPI
originais e confere as gravações diretamente no PostgreSQL. As respostas das
APIs do Hub não são interceptadas. Redis também é real, permitindo detectar
listas desatualizadas depois de criar, editar ou excluir registros.

## Executar

Requisitos: Docker em execução, dependências npm instaladas e o Python da
FastAPI preparado conforme `api/README.md`.

```bash
npm ci
npx playwright install chromium
npm run test:e2e
```

Para usar o Chrome instalado no Linux:

```bash
E2E_CHROMIUM_PATH=/usr/bin/google-chrome npm run test:e2e
```

Para executar uma parte da suíte:

```bash
npm run test:e2e -- opme.spec.cjs
npm run test:e2e -- api.spec.cjs --grep lotes
```

O comando cria containers descartáveis de PostgreSQL 15 e Redis 7 em portas
locais livres, carrega o snapshot de estrutura de `support/schema.sql` e insere
somente dados fictícios. Em seguida inicia `scripts/start_hub.js`, incluindo a
FastAPI. Ao terminar, encerra os processos e remove os containers da execução.
O `.env` é preservado; suas configurações são substituídas apenas no ambiente
dos processos filhos. As credenciais de QA são geradas a cada execução.

Os relatórios ficam em `test-results/e2e/`, ignorado pelo Git:

- `results.json`: resultado de cada cenário.
- `hub.log`: logs dos servidores; os testes negativos provocam erros SQL de propósito.
- `artifacts/`: screenshots e traces dos cenários que falharem.
- `mailbox.jsonl`: e-mails capturados localmente, sem envio.
- `external.jsonl`: consultas feitas ao adaptador do Supra.

## Cobertura

| Fluxo | Verificações |
|---|---|
| Autenticação | Login real, senha incorreta, conta inativa, permissões e primeiro acesso |
| Dashboard e perfil pessoal | Salvar/remover meta; editar nome e conferir após novo login |
| Usuários e perfis | Criar, editar, excluir; hash de senha, boas-vindas e permissões persistidas |
| Agenda | CRUD pelas telas das duas empresas; leitura cruzada Hub/FastAPI e horas do Excel |
| Itens arrematados | CRUD nas duas empresas, UF/município, adicionar produto e integração com contratos |
| VBA Itens Arrematados | CRUD por empresa, UTF-8, bigint, zeros/decimais, status, PUT parcial, cache, concorrência do resumo e rollback de inclusão/alteração |
| Clientes | Contatos, edição, exclusão lógica e histórico de cobrança preservado |
| Custos | Salvar pela célula, calcular total e reler sem cache antigo |
| OPME | Contratos ativos/inativos, unidades, saldos, cirurgia com vários produtos, valor zero, observações e exclusão |
| Transações | Rollback de cirurgia e 24 requisições concorrentes por tipo de saldo, incluindo lotes inválidos |
| Notificações | FastAPI → PostgreSQL LISTEN/NOTIFY → SSE do Hub; marcação de leitura |
| Scripts | Sincronização de títulos pelo botão do Hub; rotinas de agenda e cobrança, incluindo templates de e-mail |

As verificações de persistência usam registros identificados como QA. As
operações disponíveis em cada tela são respeitadas: contratos OPME são
desativados/reativados e contatos têm exclusão lógica, por exemplo.

## Limites das integrações

Supra, SMTP e a consulta de municípios do IBGE usam fixtures. O adaptador bloqueia
comandos de escrita no Supra; nenhuma operação é feita no ERP real, nenhum e-mail
é enviado e nenhum aplicativo Heroku é reiniciado. Os agendadores automáticos
ficam desligados; os testes invocam diretamente as rotinas de agenda e cobrança.

O snapshot contém a estrutura do PostgreSQL local, incluindo tipos, sequências,
índices e constraints, sem registros. A suíte não comprova disponibilidade,
credenciais ou compatibilidade de uma estrutura diferente em produção, nem
valida geração de pedidos reais no Supra ou execução de macros dentro do Excel.

Opcionalmente, `E2E_CDN_CACHE` pode apontar para um cache de recursos estáticos,
com arquivos nomeados pelo SHA-256 da URL (`.json` com metadados e `.bin` com o
conteúdo). Ele não participa das requisições de API do Hub.
