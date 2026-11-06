# Codificacao dos textos da Agenda

`fix_agenda_encoding.py` audita os nove campos textuais da tabela
`agenda_licitacoes."AGENDA_LICITACOES"`. Por padrao a conexao e somente leitura.
Usa a configuracao existente do Hub; `--heroku-app NOME` consulta as credenciais
atuais desse aplicativo usando `HEROKU_API_KEY`, sem modificar o `.env`.

Execute da raiz, guardando os artefatos privados em diretorio ignorado pelo Git:

```bash
mkdir -p test-results/agenda-encoding
.venv/bin/python -m scripts.fix_agenda_encoding \
  --report test-results/agenda-encoding/plan.json
```

Revise `changes`: cada entrada informa CHAVE, campo, valor original e proposto.
A conversao inversa Latin-1/Windows-1252 para UTF-8 e estrita. Nao remove acentos,
nao padroniza caixa, nao corrige ortografia, nem modifica datas ou identificadores.
Texto misto, caracteres substituidos e casos sem conversao segura ficam em
`review` quando detectados; exigem analise manual. A auditoria nao garante detectar
toda forma possivel de corrupcao historica ou recuperar caracteres perdidos.

Para aplicar o plano revisado no mesmo ambiente:

```bash
.venv/bin/python -m scripts.fix_agenda_encoding \
  --apply test-results/agenda-encoding/plan.json \
  --backup test-results/agenda-encoding/backup.json
```

Inclua o mesmo `--heroku-app NOME` nas duas chamadas se usar Heroku.
Plano e backup sao criados com permissao `0600`, sem sobrescrever arquivos.
O backup fica gravado antes de qualquer UPDATE. O lote usa uma unica transacao,
valida o nome do banco e compara cada valor atual com o original do plano.
Qualquer divergencia desfaz o lote inteiro. Guarde o backup para eventual
restauracao manual dos campos, comparando antes com os valores corrigidos para
preservar edicoes posteriores. Repita a auditoria com outro arquivo apos aplicar.
O script nao envia notificacoes nem e-mails e nao altera a configuracao do servidor.

Na macro temporaria, `AgendaUtf8Bytes` envia JSON como bytes UTF-8 sem BOM e
`AgendaUtf8Text` le `ResponseBody` com UTF-8 explicito, usando `ADODB.Stream`
com late binding. Copie as funcoes junto de `AgendaRequest` para o modulo da
planilha. Isso nao corrige automaticamente celulas ou registros ja corrompidos.
Depois da manutencao, execute **Ler Dados** antes de reenviar linhas antigas.
Preserve a chave e as demais rotinas existentes da pasta de trabalho.

Validacao da macro exige Excel/Windows: ler os acentos, incluir e alterar um
registro de teste em ambiente isolado, reler pelo Hub e pela planilha e excluir
o registro de teste. A execucao Python/Node no Linux nao valida COM nem VBA.
