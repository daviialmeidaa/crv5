# Agenda de Licitações — Excel usando somente a API do Hub

O módulo [vba_agenda_licitacoes.vba](../vba_agenda_licitacoes.vba) substitui as
conexões do módulo da agenda com o Access por chamadas HTTP ao Hub. O PostgreSQL
do Hub passa a ser a fonte dos dados para os dois sistemas.

| Macro existente / botão | Comunicação com o Hub |
| --- | --- |
| `read_Database` / Ler Dados | GET `/api/vba/agenda_licitacoes` |
| `insert_Database` | POST no mesmo caminho, sem `chave`; grava na coluna A a `CHAVE` retornada |
| `update_Database` | PUT `/api/vba/agenda_licitacoes/{chave}` |
| `Delete_BML` | DELETE `/api/vba/agenda_licitacoes/{chave}` |
| `Delete_Form_BML` | Continua abrindo o formulário `Shield` |

Todos os pedidos usam o header `x-api-key`, como a integração anterior.

## O que permanece na pasta de trabalho

- Os nomes públicos das macros permanecem iguais; os botões existentes podem
  continuar apontando para eles.
- `adjusting_Date` continua sendo chamado após a leitura, com as seleções
  originais de `A3:Q5000` e a ativação de `A5000`. A ordenação final passa a ser
  feita por `OrganizaAgendaPorChave`, usando a CHAVE da coluna A em ordem
  numérica crescente: o maior ID fica por último. Isso também se aplica à
  atualização. Inclusão e exclusão recarregam a mesma leitura ordenada.
- A classificação move o intervalo A:Q de cada registro em conjunto, excluindo
  os cabeçalhos das linhas 1 e 2. `OrganizaDataLances` não é mais chamado por
  este módulo; seu código em outros módulos da pasta de trabalho permanece.
- `SanitizeJSON` é idêntica à função fornecida: escapa barras, substitui aspas
  duplas por apóstrofos e converte quebras de linha e tabs em espaços.
- O mapeamento das colunas é o mesmo da leitura anterior (A:O). A leitura da API
  não escreve nem apaga P:Q; não atribui fórmulas nem muda sua lógica.
- A escrita continua lendo a antecedência da coluna P, calculada/preparada pela
  planilha como antes. O GET também retorna `antecedencia`, mas a macro não a
  sobrepõe em P.
- Permanecem a cor verde após atualização, o repintar na leitura, a ordenação,
  a proteção da aba e o movimento de exclusão de linha da macro anterior.
- Datas ISO recebidas são convertidas por `DateSerial` para datas do Excel,
  preservando o dia da agenda. Horários são convertidos em frações de dia,
  inclusive segundos fracionários. Nulos retornam células vazias.
- Datas históricas fora do intervalo suportado pelo VBA (anos 100 a 9999) são
  recebidas como nulas e aparecem vazias. Essa adaptação é feita no GET, sem
  alterar o valor original no PostgreSQL.
- A coluna A guarda a chave como texto para preservar todos os dígitos.

`Ler Dados` prepara a resposta antes de substituir as células. Remove constantes
antigas de A:O para que registros excluídos pelo Hub não continuem aparecendo;
células com fórmulas não são limpas nessa etapa. Depois chama a preparação de
datas existente e ordena a planilha pela CHAVE crescente. Os dados retornados são um retrato atual
do banco: não há mescla com Access nem leitura em cache.

## Instalar na planilha existente (Excel para Windows)

1. No editor VBA (`Alt+F11`), substitua o conteúdo do módulo que contém essas
   macros pelo conteúdo de `vba_agenda_licitacoes.vba`. Não mantenha duas cópias
   das mesmas macros em módulos diferentes. O arquivo está em UTF-8; copiar e
   colar pelo editor preserva o texto.
2. Se a pasta de trabalho ainda não possui `JsonConverter`, importe
   [vendor/VBA-JSON/JsonConverter.bas](vendor/VBA-JSON/JsonConverter.bas), em
   **Arquivo → Importar arquivo**.
3. Em **Ferramentas → Referências**, habilite **Microsoft Scripting Runtime**,
   utilizada pelo parser. A comunicação HTTP continua por late binding com
   `WinHttp.WinHttpRequest.5.1`; este módulo não usa ADODB.
4. Preserve os outros módulos, fórmulas e o formulário `Shield`. Execute
   **Depurar → Compilar VBAProject** e salve a pasta de trabalho com macros.

O endereço de produção e a chave existentes foram mantidos e centralizados nas
constantes `AGENDA_API_URL` e `AGENDA_API_KEY`. Para testar localmente, altere
somente `AGENDA_API_URL` na cópia de teste da planilha para:

```text
http://localhost:3001/api/vba/agenda_licitacoes
```

Inicie o Hub com `npm run dev`; o Swagger está em `http://localhost:3001/docs`.
O GET e a geração automática de chave precisam estar publicados no servidor
antes de usar esta versão da macro com o endereço de produção.

## Fluxo de conferência no Excel

1. Pressione **Ler Dados**. Confira campos, datas, horas e fórmulas existentes,
   com a coluna A em ordem crescente e o maior ID na última linha de dados.
2. Crie um pregão no Hub e pressione **Ler Dados** novamente: ele deve aparecer
   na planilha com a mesma chave.
3. Inclua uma linha pela macro de inclusão: a API gera a chave, a macro a guarda
   em A e recarrega os dados; o registro deve aparecer no Hub.
4. Altere um registro pelo Hub e releia na planilha. Faça também o inverso,
   usando a macro de atualização e recarregando a agenda no Hub.
5. Exclua um registro de teste por uma das interfaces e atualize a outra.

Falhas HTTP e de rede agora interrompem o lote e informam a linha e quantas
operações já foram confirmadas. Uma operação confirmada não é desfeita se a
próxima falhar. Não há repetição automática de POST: se a rede cair após o
servidor gravar, releia e confira os dados antes de repetir a inclusão.

PUT mantém o contrato anterior de substituir todos os campos; em alterações
simultâneas do mesmo registro, prevalece a última gravação. Use **Ler Dados**
antes de editar para trabalhar com o estado atual do Hub.

Esta mudança usa os dados já presentes no Hub. Não importa automaticamente
eventuais registros que existam somente no arquivo Access.

## Dependência

Parser incluído sem alterações: [VBA-JSON v2.3.1](https://github.com/VBA-tools/VBA-JSON/releases/tag/v2.3.1),
com [licença MIT](vendor/VBA-JSON/LICENSE) e avisos originais no arquivo.
