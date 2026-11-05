# Validação da reorganização do Hub

A reorganização separa o Hub em `app/` e a FastAPI em `api/`. Os serviços,
routers, middleware e arquivos de banco foram comparados com os originais por
hash: o conteúdo das regras de negócio permaneceu igual. O `.env` da raiz
permaneceu intacto.

Resultado da execução completa: **77 testes aprovados** — 23 unitários Node,
27 Python/FastAPI (incluindo PostgreSQL descartável) e 27 Playwright. A imagem
Docker também foi construída e executada com sucesso em ambiente isolado.

## Cobertura

- Node: recursos físicos das 16 páginas, resolução dos imports, compilação dos
  scripts, compatibilidade dos scripts antigos, proxy HTTP, falhas sem repetição
  de POST, seleção de porta e ponte de notificações.
- FastAPI: autenticação dos quatro métodos, Swagger, OpenAPI, corpo das respostas,
  conversões de datas/horas do VBA, bigint, notificações e respostas 404.
- PostgreSQL descartável: inclusão com chave gerada, leitura, filtro por empresa,
  alteração, exclusão, notificações e data histórica BC.
- Playwright: as 16 páginas, recursos locais, alternância de tema, URLs antigas,
  preservação das rotas, login, permissões, primeiro acesso, agenda (criar, editar,
  excluir e alternar empresa), clientes (buscar e abrir detalhe), cadastro,
  navegação nas abas de OPME, callback de exclusão de Itens Arrematados e Swagger.
- Docker: build com dependências de produção e inicialização conjunta de Node e
  FastAPI; páginas, documentação, scripts e assets respondem no container.

O manifesto `tests/support/routes-before.json` registra as rotas anteriores à
movimentação. A suíte confirma que nenhuma foi removida e que as entradas de
API preservaram caminhos e métodos.

## Ajustes de caminhos e callbacks encontrados na validação

1. A rota existente `/cadastro_usuario` aponta para o HTML organizado da página.
   Uma declaração duplicada introduzida na movimentação foi removida.
2. O HTML de cadastro incluía `/js/auth.js`, arquivo que já não existia. A página
   já utiliza `auth_guard.js`; a referência quebrada foi removida.
3. O HTML de Itens Arrematados referenciava `IA.deleteFromModal`, que já existia
   internamente mas não era exposto. O callback foi adicionado à interface do
   módulo; a lógica de exclusão existente permanece a mesma.

## Limites da verificação

Os testes da suíte inicial de navegador usam respostas de negócio simuladas e serviços externos
bloqueados. Os testes de banco usam exclusivamente PostgreSQL descartável. Não
foram feitas gravações nos bancos reais, envio de e-mails, geração de pedidos
no Supra ou disparo das rotinas agendadas em produção. Essas operações não são
atestadas por esta suíte como transações reais ponta a ponta.

Os testes cobrem os cenários descritos; seu resultado não significa que todas as
combinações de dados e ações possíveis tenham sido executadas. As instruções
para repetir a validação estão no README da raiz. A homologação adicional com
imagem de produção, PostgreSQL e Redis reais e navegador sem mocks está descrita
em `QA_PRODUCAO.md`; ela inclui falhas preexistentes reproduzidas depois desta suíte inicial.
