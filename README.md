# Hub Nexomed

O Hub Nexomed é o portal de trabalho das equipes financeira, de cobrança,
licitações e OPME da Nexomed. Ele reúne consultas, cadastros e acompanhamento das
operações em uma interface compartilhada, com acesso conforme o perfil de cada
usuário.

O projeto nasceu como **Contas a Receber v5** e passou a reunir outros módulos.
Esse nome ainda aparece no repositório e nos comandos internos.

## Acesso e primeiros passos

1. Acesse o endereço do Hub disponibilizado pela empresa.
2. Entre com o e-mail e a senha da sua conta. No primeiro acesso, siga a orientação
   para definir sua senha.
3. Use o menu lateral para acessar os módulos liberados para o seu perfil.
4. No menu do seu avatar, acesse seu perfil ou encerre a sessão. O botão de tema
   alterna a apresentação clara e escura.

As telas e ações disponíveis dependem das permissões da conta. Uma página de
acesso restrito (`403`) indica que o perfil não permite aquela operação. Para
solicitar acesso ou esclarecer uma permissão, procure o responsável pelo Hub.

## O que você encontra no Hub

| Área | Uso no dia a dia |
| --- | --- |
| Dashboard | Acompanhar indicadores financeiros, gráficos e meta de recebimento. |
| Contas a Receber | Consultar títulos e notas, aplicar filtros e abrir detalhes de produtos, observações, acompanhamento e DANFE, quando disponível. |
| Clientes e cobrança | Consultar clientes, acessar suas notas, manter contatos e registrar o histórico de cobrança com agendamento de retorno. |
| Agenda de Licitações | Consultar e manter pregões, datas, horários e observações, separados por empresa, como Nexomed e BML. |
| Itens Arrematados | Acompanhar contratos, produtos arrematados, quantidades, valores, prazos e status. |
| Cirurgias / OPME | Selecionar um contrato e trabalhar com cirurgias, unidades, saldos de ata, saldos por hospital e banco de códigos. |
| Custos de Produtos | Consultar resumo e histórico de custos, identificar custos pendentes e informar valores manuais nas operações disponíveis. |
| Usuários e perfis | Administrar contas e permissões, quando autorizado. |

## Como trabalhar com as tabelas

As listagens usam um componente comum, baseado no grid de Contas a Receber.
Cada tela habilita os recursos adequados ao seu trabalho:

- **Filtros:** use o funil no cabeçalho da coluna. Datas podem ser selecionadas
  por ano, mês e dia. Remova os filtros para voltar à listagem completa.
- **Ordenação:** clique nos cabeçalhos que oferecem ordenação.
- **Paginação:** escolha a quantidade de registros e navegue pelas páginas,
  quando esses controles estiverem disponíveis.
- **Seleção e soma:** nas tabelas habilitadas, use `Ctrl` (ou `Command` no Mac)
  com clique ou arrasto para selecionar células e consultar contagem, soma e
  média. `Esc` limpa a seleção.
- **Exportação:** nas telas com a ação de exportar, o Excel inclui os registros
  filtrados, inclusive os que estão em outras páginas da listagem.
- **Detalhes:** clique em uma linha nas telas que oferecem esse recurso para
  abrir os detalhes ou selecionar o registro.

Algumas consultas têm comportamento próprio. No modal de Banco de Códigos do
OPME, por exemplo, o cabeçalho permite escolher a coluna pesquisada; a consulta
não possui exportação nem paginação e orienta a refinar buscas muito amplas.

Para incluir ou alterar informações, use os formulários e confirme a gravação.
Os tipos de ação variam por módulo: contratos OPME podem ser desativados e
reativados; contatos de cobrança usam exclusão lógica para preservar o histórico.

## De onde vêm as informações

O Hub consulta o **Supra ERP** para informações como clientes e documentos
fiscais. Dados mantidos pelo portal, como agenda de licitações, contatos,
histórico de cobrança e registros OPME, ficam no **PostgreSQL** usado pelo Hub.
As rotinas de sincronização atualizam os dados integrados conforme o fluxo de
cada módulo; uma consulta no portal não significa que todo o ERP tenha sido
sincronizado naquele instante.

O **Redis** guarda temporariamente algumas consultas para acelerar as telas.
Ele é uma camada de cache; os registros persistentes ficam nos bancos de dados.

O sino reúne notificações conforme as permissões do usuário. Rotinas de agenda
e cobrança também geram lembretes e e-mails de acordo com as configurações e os
agendamentos do ambiente.

## Integração com a planilha VBA

A Agenda de Licitações pode ser utilizada pelo Hub e pela planilha Excel/VBA
integrada. Os dois acessam **a mesma tabela no PostgreSQL**, por meio das APIs
do Hub; não são duas bases que precisam ser copiadas uma para a outra.

Na macro migrada da Agenda:

- **Ler Dados** consulta a API e permite mostrar na planilha o que foi cadastrado
  ou alterado pelo Hub.
- As ações de inclusão, alteração e exclusão enviam as operações à API.
- O Access deixa de ser necessário para esse fluxo da Agenda. Isso não significa
  que outras integrações legadas tenham sido migradas automaticamente.
- A atualização da planilha ocorre quando a macro de leitura é executada;
  ela não recebe alterações automaticamente apenas por estar aberta.

A integração mantém os caminhos existentes em
`/api/vba/agenda_licitacoes`, com os métodos `GET`, `POST`, `PUT` e `DELETE`
(os dois últimos usam `/{chave}`). A autenticação utiliza o cabeçalho
`x-api-key`, configurado pela equipe responsável. Não compartilhe essa chave em
código versionado ou mensagens de suporte.

Essa API foi construída com **FastAPI**, em Python, e roda junto do Hub Node.js.
O Hub recebe as chamadas no mesmo endereço público e as encaminha internamente.
A documentação interativa **Swagger** fica em `/docs` no endereço do Hub;
`/api/docs` também está disponível. As operações executadas pelo Swagger usam
os dados do ambiente acessado e podem gravar ou excluir registros.

A instalação e o contrato completo estão no [guia da API](api/README.md).
As configurações do servidor não preenchem automaticamente as configurações da
macro: a URL e a chave usadas pelo Excel precisam corresponder ao ambiente.

## Execução local — equipe técnica

Requisitos: Node.js 20+ e Python 3.11+ (versão indicada em `.python-version`: 3.12),
além dos acessos aos serviços utilizados pelo ambiente. Preserve o `.env`
existente e solicite as configurações ao responsável; não versione credenciais.

Na raiz do projeto:

```bash
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
npm run dev
```

No Windows, o executável Python fica em `.venv\Scripts\python.exe`.
O comando padrão **`npm run dev` inicia o Hub e a FastAPI juntos**, com reinício
após alterações nos arquivos monitorados. `npm start` inicia ambos sem esse
monitoramento. `npm run start:node` inicia somente a parte Node.

A porta pública padrão é `3001`, podendo ser alterada por `PORT`:

- Hub: `http://localhost:3001`
- Swagger: `http://localhost:3001/docs`

A `.venv` contém as dependências locais da parte Python, assim como
`node_modules` contém as dependências Node. O `requirements.txt` da raiz
encaminha a instalação para `api/requirements.txt`. Essas duas tecnologias
fazem parte do projeto atual.

## Organização e manutenção

```text
app/          Hub Node/Express, rotas, serviços e frontend
  views/      Base EJS, componentes e conteúdo das páginas internas
  public/     CSS, JavaScript, assets e páginas independentes de autenticação/403
api/          FastAPI, endpoints VBA e acesso ao PostgreSQL
scripts/      Inicialização conjunta e ferramentas de instalação
tests/        Testes automatizados
```

Sidebar, navbar e footer são componentes compartilhados. Cada página tem seus
arquivos de CSS e JavaScript, e os grids reutilizam um componente com filtros,
ordenação, paginação e seleção. Essa organização permite manter a apresentação
comum sem repetir a estrutura em todas as telas.

Documentação para quem mantém ou desenvolve o Hub:

- [API, variáveis de ambiente e hospedagem](api/README.md).
- [Base EJS e inclusão de páginas](app/views/README.md).
- [CSS, paleta global e estilos por componente](app/public/css/README.md).
- [Data Grid e seus recursos opcionais](app/public/js/components/data-grid/README.md).
- [Testes de ponta a ponta com Playwright](tests/e2e/README.md).
- [Regras para agentes de IA](.agents/AGENTS.md).

A suíte `npm run test:e2e` usa PostgreSQL e Redis descartáveis, dados fictícios e
as APIs reais do Hub. Supra, e-mail e consulta de municípios usam substitutos de
teste. Seus resultados verificam os cenários cobertos, sem garantir a
configuração ou a disponibilidade dos serviços de produção.

Ao relatar um problema, informe a tela, a ação realizada e a mensagem exibida.
Não envie senhas, chaves de API ou o conteúdo do `.env`.
