# CSS do Hub

```text
css/
  global.css                   Paleta, fontes e estados semânticos
  shared/layout.css            Compatibilidade com o caminho anterior do layout
  components/
    sidebar.css                Sidebar e estado recolhido
    navbar.css                 Estrutura e alturas da navbar
    navbar/profile-menu.css    Avatar e apresentação do perfil
    navbar/theme-toggle.css    Botão de alternância de tema
    navbar/notifications.css   Painel de notificações
    footer.css                 Rodapé e variação de espaçamento
    auth-card.css              Superfícies e animações de login/primeiro acesso
    badges.css                 Badges gerais e indicadores financeiros
    buttons.css                Tratamento dos botões de entrada
    cell-selector.css          Barra de seleção e soma das células
    data-grid.css              Colunas fixas e apresentação dos filtros
    datepicker.css             Apresentação do calendário
    forms.css                  Tratamentos compartilhados dos inputs
    modal.css                  Animação compartilhada dos modais
    notifications.css          Compatibilidade com o caminho anterior
    scrollbar.css              Barras de rolagem compartilhadas
    tabs.css                   Apresentação das abas do módulo de custos
    timepicker.css             Apresentação do seletor de horário
    toast.css                  Notificação transitória
  pages/<pagina>/<pagina>.css   Ajustes exclusivos de cada página
```

Cada página possui `data-page="nome_da_pagina"` no elemento `<html>` e carrega seu
próprio CSS, mesmo quando ainda não precisa de sobrescritas específicas.
A base EJS carrega os componentes estruturais nas páginas internas. Os parciais
`views/pages/<pagina>/head.ejs` carregam os componentes utilizados pelo conteúdo
de cada página. Login, primeiro acesso e 403 continuam com HTML independente.

## Paleta e estados

As cores de marca `nexo`/`steel` e os estados `success`, `alert`, `danger`, `info`
e `neutral` são definidos em **global.css**. Os sufixos `strong`, `soft` e `text`
preservam as variações existentes. Gradientes e cores de badges também ficam
nessa base, incluindo suas variações em `.dark`.

Use essas variáveis em novos estilos:

```css
.meu-indicador {
    color: var(--color-success);
    border-color: var(--color-success-strong);
}
```

A configuração compartilhada `/js/shared/tailwind.config.js` lê a paleta do CSS.
Assim, as utilidades Tailwind (`bg-success`, `text-danger`, `bg-alert/10`, etc.)
utilizam a mesma fonte de cores, sem repetir valores em cada HTML.

Badges existentes usam `badge badge-success`, `badge badge-alert` e os demais
estados. `badge-warning` permanece como alias de `badge-alert`. Os indicadores
financeiros compactos usam `status-badge status-badge-success` e suas variações.

## Ordem e responsabilidades

1. Carregar `global.css` antes do CDN do Tailwind e de `tailwind.config.js`.
2. Carregar o CSS compartilhado e o dos componentes utilizados pela página.
3. Carregar o CSS da página por último para seus ajustes específicos.
4. Carregar os scripts dos componentes antes dos controllers que os utilizam.

O Tailwind continua responsável pelas classes utilitárias presentes nos HTMLs e
templates. A organização não exige compilador CSS, bundler ou novas dependências.
A tipografia e as diferenças visuais atuais entre páginas foram preservadas.

Estilos estáticos pertencem ao CSS. O JavaScript continua responsável pelos
estados e valores calculados: permissões, abertura/fechamento, coordenadas de
popups, progresso, dimensões medidas e estilos gerados pelas bibliotecas de gráficos.
Prefira classes de estado ou propriedades CSS customizadas para novas interações.

Os seletores `:root[data-page="..."]` delimitam ajustes de uma página e preservam
a prioridade dos antigos estilos inline em relação às utilidades do Tailwind.
Não adicione seletores específicos de uma página a um componente compartilhado,
exceto quando necessários para manter uma variação já existente documentada.

Esta etapa separa apresentação e comportamento. Seleção, filtros, ordenação,
paginação e requisições dos grids continuam nos controllers atuais; a extração
de um componente JavaScript de data grid será uma etapa posterior.
