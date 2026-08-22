# Hub Nexomed (Contas a Receber v5)

Bem-vindo ao repositório oficial do **Hub Nexomed** (Contas a Receber v5). Este projeto é um portal corporativo de alta performance focado na gestão financeira, licitações, OPME e relacionamento com clientes (Cobrança). 

O sistema foi desenhado para ser uma aplicação leve, responsiva e com uma interface premium, garantindo eficiência operacional e segurança de dados.

---

## 🚀 Stack Tecnológica

- **Backend:** Node.js com Express.js.
- **Bancos de Dados:** PostgreSQL (Banco Local) e SQL Server / mssql (Supra ERP).
- **Autenticação:** JWT (JSON Web Tokens) e senhas encriptadas com `bcryptjs`.
- **Frontend:** Vanilla HTML, CSS e JavaScript puros (Sem frameworks pesados como React ou Angular).
- **Estilização:** Tailwind CSS (via CDN) com configurações e paletas injetadas customizadas.
- **Cache & Performance:** Redis Cloud (Camada em memória) + Compressão de Rede (Gzip).

---

## ⚙️ Arquitetura e Performance

O Hub foi projetado com premissas rigorosas para economizar rede e banco de dados, sendo hospedado no Heroku:
- **Compressão Gzip:** Reduz os payloads gigantes de dados JSON em até 80% antes do tráfego na rede (exceto em rotas de SSE/Notificações para não bloquear streaming).
- **Cache de Memória (Redis):** Toda rota de GET massiva (ex: `/api/titulos`, `/api/opme/cirurgias`) passa pelo Redis antes de ir ao PostgreSQL. O cache possui tempo de vida padrão e é invalidado ativamente após qualquer mutação de dados (POST, PUT, DELETE).
- **Client-Side Data Grids:** O gerenciamento do estado das tabelas (paginação, ordenação, e filtros complexos estilo Excel) ocorre inteiramente no JavaScript (navegador), garantindo respostas instântaneas ao usuário.

---

## 🧩 Módulos do Sistema

### 1. Dashboard e KPIs
- Visão global financeira baseada na data de emissão das notas.
- Cálculos robustos de: **Total Vendido**, **Total Recebido** e **Total em Aberto** (filtrando valores residuais e status pendentes).
- Gráficos adaptativos (Light/Dark Mode) via ApexCharts.
- Acompanhamento de Metas de Recebimento em tempo real via componente Velocímetro.

### 2. Contas a Receber & Data Grids
- **Filtros Avançados:** Filtros dinâmicos por coluna estilo Excel, suportando dados nulos e hierarquia em datas (Ano > Mês > Dia).
- **Cell Selector:** Ferramenta global (`CellSelector`) semelhante ao Excel, que permite selecionar células via `Ctrl+Click` ou `Ctrl+Arrasto` gerando **soma, média e contagem** instântanea em uma barra flutuante.
- Exportação inteligente nativa para arquivos `.xlsx` mantendo o exato cenário filtrado pelo usuário.

### 3. Licitações (Itens Arrematados e Agenda)
- **Itens Arrematados:** Interface limpa e minimalista. Permite a criação de contratos atrelando múltiplos produtos (cálculos em tempo real para o Total Normalizado dependendo da faixa de valor).
- **Agenda de Licitações:** Controle de pregões futuros separados por empresas (ex: Nexomed e BML).
- Interface sem quebras horizontais e adequação visual rigorosa das linhas.

### 4. OPME (Órteses, Próteses e Materiais Especiais)
- Controle de Atas, Contratos, Cirurgias (com mais de 18k registros), Unidades hospitalares e Banco de Códigos.
- Interface dividida por abas navegacionais habilitadas seletivamente após a escolha do contrato master.
- Cálculo virtual e colorido do "Deadline" das atas de contrato (dias restantes para o fim da vigência).

### 5. Clientes e CRM de Cobrança
- Listagem otimizada baseada na View do ERP legado.
- Tela de detalhes dividida em: **Notas Fiscais**, **Agenda de Contatos** e **Histórico (Timeline)**.
- Motor embutido para agendamento do próximo contato forçando a alimentação do CRM.

---

## 🔗 Integrações

O ecossistema não atua isolado. Ele lê ativamente dados do legado e os enriquece:

- **Supra ERP (SQL Server - SGC/SGC2):** 
  - **Somente Leitura (Read-Only):** A imensa maioria do tempo, o Hub atua em modo de leitura extrema do ERP. 
  - **Faturamento (OPME):** O sistema possui integração de escrita CRÍTICA e cirúrgica (`dbo.pedido` e `dbo.pedido_item`) com o Supra ERP para a emissão automática de Pedidos de Venda baseados nas cirurgias do módulo OPME.
  - Sincronização inteligente baseada em *Diff* de campos (cruzando `nf_numero` contra `codigo`).
- **MS Access Legado (OPME):** Script auxiliar Python que realiza o UPSERT de dados vitais do VBA diretamente no PostgreSQL local.
- **E-mails Transacionais (SMTP/Nodemailer):** Envio corporativo (com templates HTML rigorosos da Nexomed) para boas-vindas e relatórios (ex: Resumo diário de cobrança ou agenda de pregões).
- **Integração Temporária VBA (Shadowing):** API em Node protegida por `API_KEY` para alimentar o antigo sistema Access enquanto este não for descontinuado.

---

## ⏰ Cron Jobs e Notificações (SSE)

- **Sumário Diário (Heroku Scheduler):** Tarefas rodadas em nuvem fora do escopo do usuário enviando compilações diárias por e-mail (ex: Licitações do dia seguinte às 08h e 17h, Agenda de Cobrança às 08h).
- **Lembretes Nativos (Node-Cron):** Motor assíncrono acoplado ao servidor disparando alertas ao vivo para o Frontend faltando exatos 10 minutos para o compromisso.
- **Central de Notificações (SSE):** Ícone de sino nativo utilizando *Server-Sent Events* e exibindo as notificações no canto da tela sem a necessidade de refresh ou AJAX polling.

---

## 🔒 Segurança e Controle de Acesso (RBAC)

O sistema possui Roles (Papéis) divididos por departamento e níveis de atuação, ao invés de meros "Admins" booleanos.

- **Níveis Atuais:**
  - `ADMIN` (Acesso Completo e Universal)
  - `CR1`, `CR2`, `CR3`, `CR4` (Contas a Receber)
  - `LC1`, `LC2`, `LC3`, `LC4` (Licitações)
  - `OPME1`, `OPME2`, `OPME3`, `OPME4` (Materiais Especiais)
- **Auth Guard (Client e Server):** As rotas de backend exigem validação minuciosa via middleware. No frontend, um guardião injetado no `<head>` das páginas varre o JWT, esconde itens do menu de forma condicional e bloqueia visualizações indevidas com redirecionamento rápido para páginas de Erro `403`.
- Não existem senhas salvas em texto limpo ou inputs de senha no cadastro: o servidor as gera, criptografa e envia para o e-mail do titular com login provisório.

---

## 🎨 UI/UX (Aesthetics e Design System)

A interface foi projetada para surpreender e reter a atenção do usuário.
- **Tailwind JIT e Cores Marca:** Paleta restrita aos tons `nexo` (Teal/Cyan) e `steel` (Cinza/Grafite).
- **Dark Mode Nativo:** Total suporte aos temas Claro/Escuro (persistido em LocalStorage) mudando dinamicamente até as cores dos gráficos ApexCharts.
- **Microinterações:** Botões e linhas com *Sash/Soft UI* (`hover` elevando elementos sutilmente e realçando em core primária), abolindo fundos chapados.
- **Sidebar Colapsável:** Menu lateral modular agrupado com animação de submenus via chevrons (`rotate(90deg)`) mantendo sempre o foco principal no meio geométrico da tela.
- **Custom Scrollbars e Dropdowns:** Abandono da tag nativa `<select>` e scrollbars do windows em prol de componentes puros estilizados que imitam apps nativos.

---
*Este documento reflete a versão 5 do sistema Contas a Receber e o contexto global do Hub Nexomed.*
