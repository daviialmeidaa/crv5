# Contexto do Projeto: Contas a Receber v5 (Nexomed)

Este arquivo define as regras e o contexto arquitetural do projeto. **Todos os agentes de IA devem ler e seguir estas diretrizes antes de realizar alterações no código.**

## Stack Tecnológica
- **Backend:** Node.js com Express.js.
- **Bancos de Dados:** PostgreSQL (`pg`) e SQL Server (`mssql`).
- **Autenticação:** JWT (`jsonwebtoken`) e senhas encriptadas com `bcryptjs`.
- **Frontend:** Vanilla HTML, CSS, JavaScript (sem frameworks como React, Vue ou Angular).
- **Estilização:** Tailwind CSS (carregado via CDN) com configurações customizadas injetadas no próprio HTML.

## Regras de Estrutura de Frontend (Obrigatórias)
Todo código de interface deve seguir estritamente o padrão estabelecido na pasta `public/`:

1. **Páginas HTML e Tailwind CDN:**
   - Criadas como arquivos `.html` na raiz da pasta `public/`.
   - Devem sempre importar o script do Tailwind via CDN: `<script src="https://cdn.tailwindcss.com"></script>`.
   - **Crucial:** Devem conter o script de configuração do Tailwind (`tailwind.config`) injetando a paleta de cores própria do projeto antes de renderizar os estilos (veja o padrão no `index.html` ou `dashboard.html`).
   - A fonte oficial do projeto é a **Inter** (do Google Fonts), que deve ser importada no `<head>`.

2. **Paleta de Cores e Tema (Tailwind Config):**
   - O projeto não utiliza cores genéricas do Tailwind para sua identidade.
   - **`nexo`**: Tons de Teal/Cyan (ex: `nexo-500: '#0097A7'`, `nexo-600: '#00838F'`) - Utilizados para marca, botões primários e destaques (accent).
   - **`steel`**: Tons de Cinza/Grafite (ex: `steel-800: '#1f2937'`, `steel-900: '#111827'`) - Utilizados para fundos estruturais, painéis, sidebar e tipografia.
   - As fontes devem usar a classe `font-sans` configurada para priorizar a fonte 'Inter'.

3. **Suporte a Dark Mode:**
   - A configuração do Tailwind exige `darkMode: 'class'`.
   - O suporte ao tema escuro é obrigatório em todas as páginas.
   - Utilize o prefixo `dark:` (ex: `bg-white dark:bg-steel-800`, `text-steel-800 dark:text-gray-100`).
   - A preferência do tema do usuário é salva no `localStorage` sob a chave `'theme'`.

4. **Estética, Animações e Micro-interações:**
   - Priorize uma interface *premium*, limpa e dinâmica (UI/UX).
   - Elementos interativos devem ter transições suaves utilizando classes utilitárias (ex: `transition-all duration-200`).
   - Efeitos de `hover`, `focus` em inputs (ex: *glow* suave com cor primária) e animações de entrada (ex: *fade-in-up*) são essenciais e podem ser definidos em blocos `<style>` locais quando não forem facilmente cobertos pelo Tailwind.

5. **Organização de Arquivos Frontend:**
   - **JavaScript (`public/js/`):** Arquivos modularizados por responsabilidade da página (ex: `dashboard.js`, `theme.js`). Não misture regras de páginas diferentes no mesmo arquivo.
   - **Imagens/Mídias (`public/assets/`):** Organizadas na pasta de assets.
   - **CSS (`public/css/`):** Usar primariamente para estilos globais que realmente não possam ser resolvidos via utilitários do Tailwind (o que é raro neste projeto).

Sempre que um agente criar ou modificar uma página web, ele deve inspecionar `public/index.html` ou `public/dashboard.html` como referência viva de estruturação.

## Arquitetura de Tabelas (Data Grids) e Filtros
Quando o projeto exigir tabelas complexas (com paginação, ordenação multifacetada e filtros dinâmicos com checkboxes):
- **Estágio Atual (Mock/Protótipo):** A arquitetura é implementada em **Client-Side**. Isso significa que todo o gerenciamento de estado (Array de dados brutos, filtragem, interseção, ordenação e corte de paginação) ocorre inteiramente no JavaScript do navegador em memória, utilizando Vanilla JS puro.
- **Transição Futura (Produção em Larga Escala):** Quando a base de dados crescer consideravelmente, os agentes de IA devem auxiliar a migrar essa lógica para **Server-Side**. Ou seja, as interações de filtro, ordenação e paginação no frontend passarão a enviar parâmetros (query strings) nas requisições para a API Node.js. O backend será o responsável por executar a lógica usando SQL dinâmico (`LIMIT`/`OFFSET` e condições de `WHERE`).
