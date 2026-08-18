# Regras de Criação de Pedido - Supra ERP

Este documento lista os requisitos técnicos e as colunas vitais da estrutura do banco de dados (SQL Server) do Supra ERP para a criação de um pedido (`dbo.pedido`), com base na análise da view `bio_pedidos` e do esquema interno do banco.

---

## 1. Estrutura Obrigatória para Criação de Pedido
Para que o Supra reconheça um pedido, o processo de injeção (via API ou Tabela Staging) exigiria alimentar um conjunto interligado de tabelas:

### Tabela Pai: `dbo.pedido` (Cabeçalho do Pedido)
Esta tabela é o coração do pedido. Os campos obrigatórios/essenciais detectados são:
- **`clifor_codigo`**: ID (Foreign Key) apontando para o cliente na tabela `cliente_fornecedor`.
- **`tipoped_codigo`**: ID do Tipo de Pedido (ex: Venda, Remessa Consignação).
- **`vend_codigo`**: ID do Vendedor interno responsável pela conta.
- **`condpg_codigo`**: ID da Condição de Pagamento (ex: 30 Dias).
- **`cob_codigo`**: ID da Forma de Cobrança (ex: Depósito BB).
- **`id_situacao`**: Flag de estado do pedido (geralmente `1` para CADASTRADO).

### Tabela Filha: `dbo.pedido_item` (Produtos)
Para cada produto incluído no pedido, deve-se inserir uma linha associando-a ao cabeçalho.
- **`ped_codigo`**: ID do pedido gerado em `dbo.pedido`.
- **`prod_codigo`**: ID interno do produto na tabela `produto`.
- **`quantidade_comercializacao`**: Quantidade total do item.
- **`valor_unitario_comercializacao`**: Preço unitário fechado.

### Tabela de Rastreabilidade: `dbo.pedido_item_lote`
Muitos produtos de OPME exigem controle de lote de entrada e saída.
- Amarra o lote físico (`lote_numero`) à linha exata do item (`pedit_codigo`).

### Tabela de Auditoria: `dbo.pedido_follow_up`
- Registra no diário do pedido o evento "Cadastrado" e vincula ao ID do Usuário (`usu_codigo`).

---

## 2. Análise de Campos Específicos Solicitados

Abaixo está a resposta técnica do levantamento das 3 variáveis de negócio solicitadas:

### A) Observações (Blocos de Texto)
**Pergunta:** *Conseguiríamos enviar um bloco de texto com observações?*

**Resposta:** **SIM**. A tabela `dbo.pedido` possui três colunas dedicadas nativamente a isso. O banco de dados as mapeia com o tipo de dado `ntext` (que suporta blocos massivos de texto / mais de 1 bilhão de caracteres).
* **Campos Encontrados:**
  - `observacao` (Observação Geral do Pedido)
  - `observacao_interna` (Anotações restritas)
  - `observacao_nota_fiscal` (Mensagens que saem no XML/Danfe)

### B) Valor de Empenho
**Pergunta:** *Existe um campo específico para inserir o valor de empenho?*

**Resposta:** **SIM**. O Supra suporta controle financeiro governamental completo para pedidos gerados através de atas ou pregões públicos. Existe um campo exato para alocar o valor pecuniário (dinheiro) do empenho, além de colunas para o número oficial da ordem.
* **Campos Encontrados:**
  - `empenho_valor_empenho` (Tipo: `money` / Numérico financeiro direto)
  - `id_pedido_empenho` (Flag: "Pedido" vs "Empenho")
  - Outros de apoio: `numero_empenho_compra_publica`, `empenho_numero_ordem_compra`.

### C) Contato na Raiz do Pedido
**Pergunta:** *Na raiz principal do pedido, existe a possibilidade de inserir um contato?*

**Resposta:** **SIM**. Existe um campo explícito na "capa" (`dbo.pedido`) para indicar com quem ocorreu o contato.
* **Campo Encontrado:**
  - `nome_contato` (Tipo: `nvarchar(40)`). Permite salvar um texto de até 40 caracteres com o nome da pessoa na ponta (comprador, enfermeiro, etc).

---

## 3. Diretriz de Segurança (Lembrete)
Conforme as restrições da arquitetura atual (`AGENTS.md`), o Hub não possui permissão para executar comandos `INSERT` direto neste banco. Para que o envio dessas informações ocorra do Hub para o Supra, deve-se planejar a construção de uma **Tabela de Staging** ou utilizar uma **API nativa do ERP**.
