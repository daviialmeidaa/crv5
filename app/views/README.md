# Base das páginas internas

O Express renderiza `layouts/base.ejs` usando o EJS. A base inclui sidebar,
navbar, conteúdo da página e footer no servidor: o navegador recebe o HTML
completo, sem buscar fragmentos de layout por AJAX.

```text
views/
  layouts/base.ejs
  components/
    sidebar.ejs
    navbar.ejs
    navbar/profile-menu.ejs
    navbar/theme-toggle.ejs
    navbar/notifications.ejs
    footer.ejs
  pages/<pagina>/
    head.ejs       Bibliotecas e estilos exclusivos da página
    index.ejs      Conteúdo entre a navbar e o footer
    tail.ejs       Diálogos, bibliotecas e controllers específicos
```

Cada componente estrutural tem um CSS em `public/css/components/` e um JS em
`public/js/components/`. Os subcomponentes da navbar ficam em `navbar/` nessas
duas pastas. `js/shared/layout.js` inicializa sidebar, navbar e footer;
`js/shared/session.js` fornece a leitura do usuário e das permissões da interface.
O modal global usado pelos controllers fica em `js/components/modal.js`.

As regras existentes de permissões, notificações/SSE, avatar, logout, tema e
estado recolhido da sidebar foram mantidas. Ocultar links na interface não
substitui a autorização dos endpoints no backend.

`config/pageViews.js` define título, heading, item/grupo ativo da navegação e as
variações de altura/espaçamento que já existiam. As páginas não repetem markup
de sidebar, navbar ou footer. Alterações nesses elementos devem ser feitas no
respectivo componente.

Login, primeiro acesso e 403 permanecem em `public/html/`, sem usar a base.
Recuperação/troca de senha também deve usar uma página independente.

## Adicionar uma página interna

1. Criar `pages/<nome>/head.ejs`, `index.ejs` e `tail.ejs`.
2. Registrar os metadados em `config/pageViews.js`.
3. Criar o CSS em `public/css/pages/<nome>/<nome>.css` e o controller, se necessário,
   em `public/js/pages/<nome>/`. Referenciá-los nos parciais `head` e `tail`.
4. Registrar o caminho público em `config/publicPaths.js` e a rota no Express,
   chamando `sendPage(res, '<nome>')`, do serviço `pageRenderer`.
5. Aplicar as permissões de página e API conforme o módulo.

Os nomes dos templates são definidos pelo servidor. Nunca passar `req.query`,
`req.body` ou um caminho fornecido pelo usuário para `res.render`/`include`.
Os valores textuais usam `<%= valor %>` (escape HTML). `<%- include(...) %>`
serve para incluir os parciais confiáveis do repositório.

As URLs anteriores, incluindo `/<pagina>.html` e
`/html/<pagina>/index.html`, continuam sendo renderizadas pelo Express.
Os templates não são servidos como arquivos públicos.

O comando permanece `npm run dev`, sem etapa de build. O EJS é instalado pelo
`npm ci`; não são necessárias novas variáveis de ambiente. O Express mantém o
cache de templates em produção e relê os templates no desenvolvimento.
