# Homologação com bancos reais descartáveis

Esta bateria faz gravações e simula indisponibilidade. Use somente os containers
de QA abaixo. Ela não carrega o `.env` real na imagem e não possui credenciais de
produção. `seed.py` recria os cinco schemas no banco fixo `nexomed_qa`, porta local
6778; esse banco deve ser exclusivo destes testes.

Pré-requisitos: Docker, dependências Node de desenvolvimento, Chrome/Chromium e
Python com `api/requirements-dev.txt`. Execute a partir da raiz do repositório.

```bash
docker build -t nexomed-refactoring:production-qa .
docker network create nexomed-qa-access
docker run -d --name nexomed-qa-db --network nexomed-qa-access -p 127.0.0.1:6778:5432 -e POSTGRES_PASSWORD=qa-only -e POSTGRES_DB=nexomed_qa postgres:15-alpine
docker run -d --name nexomed-qa-redis --network nexomed-qa-access redis:7-alpine
docker exec nexomed-qa-db pg_isready -U postgres -d nexomed_qa
```

Aguarde `pg_isready` indicar que o banco aceita conexões. Em seguida:

```bash
.venv/bin/python tests/staging/seed.py
docker run -d --name nexomed-qa-app --network nexomed-qa-access -p 127.0.0.1:3118:3000 \
  --mount type=bind,src="$PWD/tests/staging/boundaries.cjs",dst=/app/tests/staging/boundaries.cjs,readonly \
  -e NODE_ENV=production -e QA_ISOLATED=1 \
  -e NODE_OPTIONS=--require=/app/tests/staging/boundaries.cjs \
  -e DATABASE_URL= -e PG_HOST=nexomed-qa-db -e PG_PORT=5432 \
  -e PG_USER=postgres -e PG_PASSWORD=qa-only -e PG_DATABASE=nexomed_qa \
  -e REDISCLOUD_URL=redis://nexomed-qa-redis:6379 \
  -e JWT_SECRET=qa-only-signing-key -e VBA_API_KEY=test-key \
  nexomed-refactoring:production-qa
```

O PostgreSQL usa armazenamento descartável do Docker que persiste entre stop/start
para o teste de recuperação. Não utilize tmpfs para o diretório de dados.

Após `/docs` estar disponível em `http://127.0.0.1:3118`:

```bash
QA_BASE_URL=http://127.0.0.1:3118 npm run test:staging
npm run test:staging:report
```

As quatro falhas documentadas em `docs/QA_PRODUCAO.md` são testes normais que
reprovam; não estão ocultas com skip, retries ou marcação de falha esperada.
A suíte roda com um worker e não simula respostas HTTP de negócio.

Para testar falhas de infraestrutura, **fora de uma execução da suíte**:

```bash
QA_BASE_URL=http://127.0.0.1:3118 node tests/staging/resilience.cjs
```

O script opera exclusivamente os três containers nomeados acima. Não o execute
em paralelo com navegador, seed ou Scheduler. Os testes de navegador também
precisam de uma massa nova a cada execução: pare o app, execute `seed.py`, limpe
somente o Redis de QA e inicie o app antes de repetir. Isso restaura a senha do
usuário de primeiro acesso e evita cache de fixtures anteriores.

```bash
docker stop nexomed-qa-app
.venv/bin/python tests/staging/seed.py
docker exec nexomed-qa-redis redis-cli FLUSHDB
docker start nexomed-qa-app
```

As rotinas de e-mail podem ser verificadas separadamente no mesmo ambiente:

```bash
docker exec nexomed-qa-app npm run scheduler:agenda
docker exec nexomed-qa-app npm run scheduler:cobranca
docker exec nexomed-qa-app npm run scheduler:agenda:friday
```

O preload captura as mensagens em `/tmp/qa-outbox.jsonl` no container. Ele desativa
os agendamentos automáticos, mas permite a execução explícita dos comandos acima.
Nenhuma mensagem SMTP é entregue e nenhuma escrita no Supra é executada.

Relatórios e traces ficam em `playwright-report/staging` e `test-results/staging`.
Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` caso seu navegador esteja em outro caminho.

Ao terminar, remova apenas os recursos descartáveis:

```bash
docker rm -fv nexomed-qa-app nexomed-qa-db nexomed-qa-redis
docker network rm nexomed-qa-access
```
