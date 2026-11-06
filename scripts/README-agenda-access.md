# Importacao da Agenda do Access

`import_agenda_access.py` le uma exportacao XLSX da aba `AGENDA_LICITACAO`,
compara com `agenda_licitacoes."AGENDA_LICITACOES"` e gera um plano. Por padrao
usa conexao somente de leitura. Utiliza Settings do Hub; `--heroku-app NOME`
consulta a configuracao atual desse aplicativo sem alterar o `.env`.

O campo `observacoes` da origem corresponde a `observacoes_status`. Datas
DD/MM/AAAA sao convertidas para ISO; uma data literal `0` vira `NULL` e e
registrada no plano. Fracoes de dia sao convertidas em horas com arredondamento
para segundos; vazio continua nulo e zero de hora significa meia-noite.
Zeros de antecedencia, acentos, caixa e conteudo dos textos sao preservados.
Nao aplica correcao automatica de ortografia ou mojibake.

A conciliacao primeiro aproveita a mesma CHAVE quando a identidade da licitacao
e compativel. Nos demais casos procura empresa, numero do pregao, UF e orgao,
ou correspondencia unica de empresa, pregao, UF e data dos lances. As comparacoes
de identidade normalizam acentos, separadores e zeros a esquerda do numero;
os valores gravados continuam sendo os originais normalizados do XLSX.

**Revise o plano antes de aplicar**, especialmente os matches por data quando
os nomes dos orgaos diferem. O script nao e um identificador universal de
licitacoes; o plano torna as escolhas concretas e auditaveis. Correspondencias
multiplas ou concorrentes bloqueiam a aplicacao. Numeros de pregao podem se
repetir entre orgaos, portanto nao devem ser usados sozinhos como chave.

CHAVEs iguais para licitacoes diferentes nao sao sobrescritas. A licitacao nova
recebe uma CHAVE pela sequencia do Hub. Os registros exclusivos do Hub continuam
intactos. Um recibo registra toda a correspondencia CHAVE Access -> CHAVE Hub.
Nao ha DELETE, DDL, notificacoes ou envio de e-mails na importacao.

```bash
mkdir -p test-results/agenda-access-import
.venv/bin/python -m scripts.import_agenda_access \
  --source vba-temp/AGENDA_LICITACAO.xlsx \
  --plan test-results/agenda-access-import/plan.json
```

Revise `summary`, `updates`, `inserts`, `unchanged`, `hub_only_keys`,
`colliding_source_keys`, `ambiguous` e `source.warnings` no JSON. Dados reais,
planos, backups e recibos devem ficar apenas em diretorios ignorados pelo Git.

Para aplicar exatamente o plano revisado no mesmo ambiente:

```bash
.venv/bin/python -m scripts.import_agenda_access \
  --apply test-results/agenda-access-import/plan.json \
  --backup test-results/agenda-access-import/backup.json \
  --receipt test-results/agenda-access-import/receipt.json
```

Inclua o mesmo `--heroku-app NOME` nas duas chamadas se usar Heroku. Os arquivos
de saida precisam ser novos e os diretorios precisam existir. Sao criados com
permissao `0600`, sem sobrescrever backups de execucoes anteriores.

O lote usa uma unica transacao, bloqueia escritas concorrentes na tabela durante
a aplicacao e confere novamente o plano contra o estado real. O backup completo
da tabela e duravel antes de qualquer UPDATE/INSERT. `created_at` dos registros
anteriores e preservado. A verificacao antes do COMMIT confirma que cada linha
da origem corresponde a exatamente um destino, que todos os campos conferem e
que nenhum registro preservado foi alterado. Alteracao no XLSX ou no banco
apos a auditoria invalida o plano.

As CHAVEs de inclusao sao geradas pela sequencia atual, que precisa estar a
frente do maior ID existente. O script nao redefine a sequencia. Como em
qualquer uso normal de sequencias PostgreSQL, uma transacao revertida pode
consumir numeros sem deixar registros; nao se deve reutilizar esses numeros.

Depois da aplicacao, gere uma nova auditoria em outro arquivo. O esperado para
a mesma origem sem novas edicoes e `updates=0` e `inserts=0`. Nao repita uma
aplicacao cujo recibo tenha falhado sem verificar o banco: pode ter havido COMMIT.
O backup nao deve ser restaurado integralmente sem analisar edicoes posteriores.

Testes:

```bash
.venv/bin/python -m unittest discover -s tests/unit -p test_agenda_access_import.py -v
npm run test:e2e -- agenda_access_import.spec.cjs
```

Os testes usam dados ficticios. A integracao e limitada a `nexomed_qa`, criado
pelo executor E2E em PostgreSQL descartavel. Cobrem conciliacao por licitacao,
colisao de CHAVE, preservacao de registros, backup, idempotencia, concorrencia
e rollback de atualizacoes anteriores quando uma insercao falha.
