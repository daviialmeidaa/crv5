# API do Hub Nexomed

A FastAPI roda no mesmo servidor do Hub. O Node continua recebendo as chamadas
externas, preservando o domínio, a porta e os caminhos usados pela planilha.
A FastAPI escuta somente em loopback, sem publicar uma segunda porta. A inicialização
tenta `127.0.0.1:8000`; se a porta estiver ocupada, escolhe outra porta interna livre
e configura automaticamente o proxy do Hub. Outros serviços não são encerrados.

```text
Planilha VBA / Swagger → Hub Node → FastAPI → PostgreSQL
                              ↑                 │
                         evento refresh ← LISTEN/NOTIFY
```

## Instalação e execução

Na raiz do repositório, com Node 20+ e Python 3.11+ (3.12 recomendado):

```bash
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
npm run dev
```

No Windows, use `.venv\Scripts\python.exe` nos comandos Python.
`npm run dev` é o comando padrão local: encontra o Python da `.venv` automaticamente
e reinicia os dois serviços quando arquivos JS/Python mudam. `npm start` inicia os
mesmos serviços sem observar alterações nos arquivos. O supervisor encerra ambos
ao receber SIGINT/SIGTERM ou se um processo falhar; o gerenciador do servidor
(Docker, systemd, Heroku etc.) pode então reiniciar o serviço inteiro.

O `.env` existente é lido pelos dois serviços e não é modificado.

| Configuração | Uso |
| --- | --- |
| `PORT` | Porta pública do Hub; padrão `3001`. |
| `VBA_API_KEY` | Mesma chave atual da planilha. |
| `DATABASE_URL` | Quando definida, tem prioridade e usa SSL como o Node atual. |
| `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE` | Mesmas configurações PostgreSQL do Hub quando não há `DATABASE_URL`. |
| `FASTAPI_PORT` | Opcional; fixa uma porta interna. Sem configuração, tenta `8000` e seleciona outra livre se necessário. |
| `FASTAPI_PYTHON` | Opcional; caminho do Python com as dependências instaladas. |
| `FASTAPI_URL` | Opcional; endereço HTTP local, correspondente à porta configurada. O supervisor transmite o destino selecionado ao Node. |

Se `FASTAPI_PORT` ou `FASTAPI_URL` for definido explicitamente e a porta estiver
ocupada, a inicialização informa o conflito. A seleção automática se aplica quando
não há porta/endereço explícito. Não é necessário alterar o `.env` para o uso padrão.

Para executar os processos manualmente, em terminais separados:

```bash
.venv/bin/python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
npm run start:node
```

## Swagger e contrato VBA

Swagger: `http://localhost:3001/docs` (o endereço `/api/docs` também funciona).
OpenAPI: `http://localhost:3001/api/openapi.json`.
Substitua a porta pelo `PORT` configurado no servidor. Use **Authorize** e informe
a chave atual, sem prefixo `Bearer`. A documentação não inclui a chave real.
O Swagger usa os endpoints reais: os botões de execução fazem gravações.

| Método | Caminho público preservado | Sucesso |
| --- | --- | --- |
| GET | `/api/vba/agenda_licitacoes` | `200`, lista atual de registros do Hub |
| POST | `/api/vba/agenda_licitacoes` | `201`, registro criado |
| PUT | `/api/vba/agenda_licitacoes/{chave}` | `200`, registro atualizado |
| DELETE | `/api/vba/agenda_licitacoes/{chave}` | `200`, mensagem original |

Header obrigatório: `x-api-key`. Chave ausente/vazia retorna `401`, chave incorreta
retorna `403`. Os erros mantêm o objeto `{"error": "..."}` e os textos anteriores.
PUT/DELETE sem registro retornam `404`; falhas de banco retornam `500`.
O proxy retorna `502` se a FastAPI ficar indisponível e não repete gravações.

GET lê a mesma tabela usada pela interface do Hub e usa `Cache-Control: no-store`.
Retorna um array (inclusive `[]` para agenda vazia), com `CHAVE` como string,
datas ISO e os demais campos do registro. Aceita `?empresa=NEXOMED` ou `?empresa=BML`
como filtro opcional, sem distinguir maiúsculas/minúsculas. Sem filtro, retorna
todas as empresas, ordenando por data de lances decrescente, hora crescente e chave
decrescente, com datas/horas nulas ao final.
Datas históricas fora do intervalo `0100-01-01` a `9999-12-31` (incluindo BC e
infinidades) retornam `null` no GET para compatibilidade com o VBA. O registro
continua na lista e o valor original no banco não é modificado.

Campos do POST: `chave` (opcional), `empresa`, `pregao`, `modalidade`, `orgao`, `uf`,
`categoria`, `objeto`, `portal`, `observacoes_status`, `data_cadastro`,
`data_limite`, `hora_limite`, `data_lances`, `hora_lances`, `antecedencia`.
PUT usa os mesmos campos exceto `chave`, que vem do caminho.
Ao omitir `chave` no POST, o PostgreSQL gera o identificador com a mesma sequência
usada pelas inclusões do Hub. A resposta mantém `CHAVE` e deve ser guardada pela
planilha. Chamadas que enviam uma chave explícita continuam usando o contrato
anterior; enviar `null`/vazio não equivale a omitir o campo.

Compatibilidades mantidas:

- PUT substitui todos os campos anteriores; campos omitidos viram nulos.
- Datas aceitam a conversão permissiva DD/MM/AAAA do código original.
- Horas aceitam texto com dois-pontos ou fração de dia do Excel, inclusive vírgula.
  O zero numérico vira nulo; a string `"0"` vira `00:00:00`, como antes.
- `antecedencia` vazia/omitida vira nula e o zero é preservado.
- `CHAVE` bigint retorna como string; datas retornam no formato ISO do Node,
  considerando `America/Sao_Paulo`; timestamps mantêm precisão de milissegundos.
- POST registra notificação. PUT notifica somente quando data/hora de lances
  muda. DELETE não registra notificação nem emite refresh.
- Falha no registro da notificação não desfaz a alteração da agenda.
- Os modelos no Swagger documentam o contrato; não introduzem validações de
  tipos obrigatórios que rejeitariam payloads anteriormente aceitos.

A planilha VBA continua consumindo os mesmos endpoints públicos, independentemente
da organização interna dos arquivos da API.

Nenhuma migração de tabelas é necessária. A API escreve apenas nas tabelas
PostgreSQL já utilizadas pelo legado. O refresh atravessa os processos pelo canal
PostgreSQL `hub_notifications_refresh`, recebido pelo Node e entregue ao SSE
existente. Isso consome uma conexão PostgreSQL dedicada adicional no Hub e um
pool de até 10 conexões na FastAPI.

## Organização e novos endpoints

Toda a aplicação Python e suas dependências ficam em `api/`. O arquivo
`requirements.txt` da raiz contém `-r api/requirements.txt` para manter a
instalação pelo Heroku e pelos comandos existentes. O `.env` continua na raiz.

- `main.py`: aplicação, ciclo de vida, tratamento de erros e inclusão de routers.
- `config.py`, `database.py`, `security.py`: configuração, PostgreSQL e autenticação.
- `routers/vba.py`: caminhos HTTP existentes.
- `services/agenda.py`: lógica migrada da agenda.
- `compat.py`: conversões/serialização que reproduzem o JavaScript original.
- `schemas.py`: documentação dos corpos de requisição no OpenAPI.

Novos módulos podem adicionar seu próprio router/service e ser registrados em
`main.py`. Para expor um novo prefixo pela porta pública, monte-o no Node usando
`createFastapiProxy`. A rota normal da interface `/api/agenda_licitacoes` continua
no Node; a migração atual cobre somente a integração `/api/vba`.

## Docker e servidor

O Dockerfile instala Node e Python e usa `npm start`. O Compose publica somente
a porta `3000` do Hub; a FastAPI fica no mesmo container, em loopback.

```bash
docker compose up --build
```

O Compose existente mantém um PostgreSQL local em volume persistente. Essa opção
usa `PG_*` e não copia automaticamente a base remota nem cria seu esquema.
Em um servidor existente, mantenha as mesmas variáveis de banco e a chave VBA
e substitua o processo de inicialização por `npm start` após instalar Python.

O `Procfile` continua usando `web: npm start`. Caso o servidor seja Heroku com
buildpacks, configure também o buildpack Python antes do Node para que ambos
os runtimes e `requirements.txt` sejam instalados. Esta alteração não configura
nem publica a aplicação remota.

Referências: [FastAPI — autenticação por API key](https://fastapi.tiangolo.com/reference/security/),
[Psycopg — pools](https://www.psycopg.org/psycopg3/docs/advanced/pool.html),
[Psycopg — transações e autocommit](https://www.psycopg.org/psycopg3/docs/basic/transactions.html).
