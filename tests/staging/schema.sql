-- Estrutura consultada em modo somente leitura; sem dados de producao.
CREATE SCHEMA IF NOT EXISTS "agenda_licitacoes";
CREATE SCHEMA IF NOT EXISTS "financeiro";
CREATE SCHEMA IF NOT EXISTS "itens_arrematados";
CREATE SCHEMA IF NOT EXISTS "opme";
CREATE SCHEMA IF NOT EXISTS "public";
CREATE SEQUENCE IF NOT EXISTS "agenda_licitacoes"."AGENDA_LICITACOES_CHAVE_seq";
CREATE SEQUENCE IF NOT EXISTS "financeiro"."ferramenta_custo_id_seq";
CREATE SEQUENCE IF NOT EXISTS "financeiro"."produtos_aliquotas_id_seq";
CREATE SEQUENCE IF NOT EXISTS "financeiro"."r_dre_id_seq";
CREATE SEQUENCE IF NOT EXISTS "financeiro"."vendas_custos_id_seq";
CREATE SEQUENCE IF NOT EXISTS "itens_arrematados"."IA_BML_CHAVE_seq";
CREATE SEQUENCE IF NOT EXISTS "itens_arrematados"."IA_NEXOMED_CHAVE_seq";
CREATE SEQUENCE IF NOT EXISTS "itens_arrematados"."UNIQUE_TBL_CHAVE_seq";
CREATE SEQUENCE IF NOT EXISTS "opme"."bancocodigos_id_seq";
CREATE SEQUENCE IF NOT EXISTS "opme"."cirurgias_id_seq";
CREATE SEQUENCE IF NOT EXISTS "opme"."contratos_id_seq";
CREATE SEQUENCE IF NOT EXISTS "opme"."observacoes_id_seq";
CREATE SEQUENCE IF NOT EXISTS "opme"."saldoata_id_seq";
CREATE SEQUENCE IF NOT EXISTS "opme"."saldoatahospital_id_seq";
CREATE SEQUENCE IF NOT EXISTS "opme"."supra_logs_id_seq";
CREATE SEQUENCE IF NOT EXISTS "opme"."unidades_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."agenda_contatos_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."historico_cobranca_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."metas_recebimento_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."notifications_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."titulos_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."users_id_seq";
CREATE TABLE "agenda_licitacoes"."AGENDA_LICITACOES" ("CHAVE" bigint DEFAULT nextval('agenda_licitacoes."AGENDA_LICITACOES_CHAVE_seq"'::regclass) NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"data_limite" date,
"hora_limite" time without time zone,
"data_lances" date,
"hora_lances" time without time zone,
"modalidade" character varying,
"pregao" character varying,
"orgao" character varying,
"uf" character varying,
"categoria" character varying,
"objeto" character varying,
"portal" character varying,
"empresa" character varying,
"data_cadastro" date,
"antecedencia" integer,
"observacoes_status" character varying);
CREATE TABLE "financeiro"."ferramenta_custo" ("id" integer DEFAULT nextval('financeiro.ferramenta_custo_id_seq'::regclass) NOT NULL,
"codigo_produto" character varying(50),
"produto" character varying(255),
"lote" character varying(50),
"custo_unitario_desconto" numeric(15,4));
CREATE TABLE "financeiro"."produtos_aliquotas" ("id" integer DEFAULT nextval('financeiro.produtos_aliquotas_id_seq'::regclass) NOT NULL,
"codigo_produto" character varying(50),
"produto" character varying(255),
"ncm" character varying(50),
"pis_aliquota" numeric(5,2),
"cofins_aliquota" numeric(5,2),
"icms_aliquota" numeric(5,2));
CREATE TABLE "financeiro"."r_dre" ("id" integer DEFAULT nextval('financeiro.r_dre_id_seq'::regclass) NOT NULL,
"empresa" character varying(50),
"data_emissao" timestamp without time zone,
"numero_nota" character varying(50),
"tipo_nota" character varying(100),
"codigo_cliente" character varying(50),
"cliente" character varying(255),
"classificacao_cliente" character varying(100),
"estado" character varying(50),
"ncm" character varying(100),
"codigo_produto" character varying(100),
"produto" character varying(255),
"classificacao_produto" character varying(100),
"lote" character varying(200),
"unidade" character varying(50),
"quantidade" numeric(15,4),
"valor_unitario" numeric(15,4),
"valor_total" numeric(15,4),
"custo_unitario" numeric(15,4),
"custo_total" numeric(15,4),
"custo_engine_level" integer,
"custo_engine_source" character varying(100),
"frete_venda_unitario" numeric(15,4),
"pis_aliquota" numeric(5,2),
"pis_unitario" numeric(15,4),
"cofins_aliquota" numeric(5,2),
"cofins_unitario" numeric(15,4),
"icms_aliquota" numeric(5,2),
"icms_unitario" numeric(15,4),
"receita_liquida_unitaria" numeric(15,4),
"receita_liquida_total" numeric(15,4),
"cmv_unitario" numeric(15,4),
"cmv_total" numeric(15,4),
"margem_contribuicao_unitaria" numeric(15,4),
"margem_contribuicao_total" numeric(15,4),
"criado_em" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
"atualizado_em" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
"fabricante" character varying(255));
CREATE TABLE "financeiro"."vendas_custos" ("id" integer DEFAULT nextval('financeiro.vendas_custos_id_seq'::regclass) NOT NULL,
"empresa" character varying(20) NOT NULL,
"nota_fiscal" integer NOT NULL,
"codigo_cliente" integer,
"cliente" character varying(255),
"cidade" character varying(100),
"uf" character varying(50),
"data_emissao" date,
"tipo_nota" character varying(100),
"cod_produto" character varying(100),
"produto" character varying(255),
"lote" character varying(200),
"classificacao" character varying(100),
"fabricante" character varying(100),
"unidade" character varying(50),
"quantidade" numeric(15,4) DEFAULT 0,
"valor_unitario" numeric(15,4) DEFAULT 0,
"valor_total" numeric(15,4) DEFAULT 0,
"custo_unitario" numeric(15,4) DEFAULT 0,
"custo_total" numeric(15,4) DEFAULT 0,
"created_at" timestamp without time zone DEFAULT now(),
"updated_at" timestamp without time zone DEFAULT now());
CREATE TABLE "itens_arrematados"."IA_BML" ("CHAVE" bigint DEFAULT nextval('itens_arrematados."IA_BML_CHAVE_seq"'::regclass) NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"COD_CONTRATO_CONCAT" character varying,
"COD_CONTRATO" integer,
"ORGAO" character varying,
"MUNICIPIO" character varying,
"UF" character varying,
"PARTICIPANTE" character varying,
"EDITAL" character varying,
"DATA_PREGAO" date,
"TIPO_CONTRATO" character varying,
"CLASSIFICACAO" character varying,
"LOTE_ITEM" character varying,
"MATERIAL" character varying,
"QTDE" integer,
"UNIDADE" character varying,
"FORNECEDOR" character varying,
"DESCRICAO_DATABASE" character varying,
"COD_SUPRA" integer,
"NOME_SUPRA" character varying,
"VALOR_UNITARIO" numeric,
"VALOR_TOTAL" numeric,
"TOTAL_NORMALIZADO" character varying,
"DATA_PROPOSTA" date,
"COD_STATUS" character varying,
"SITUACAO_STATUS" character varying,
"DATA_ADJUDICACAO" character varying,
"DATA_INICIO" character varying,
"DATA_TERMINO" character varying,
"VIGENCIA" character varying,
"DATA_EMPENHO" character varying,
"INSTRUMENTAL" character varying,
"INSTRUMENTADOR" character varying,
"LOCAL_ENTREGA" character varying,
"PRAZO_ENTREGA" character varying,
"DETALHAMENTO" character varying,
"CODIGO_STATUS" integer);
CREATE TABLE "itens_arrematados"."IA_NEXOMED" ("CHAVE" bigint DEFAULT nextval('itens_arrematados."IA_NEXOMED_CHAVE_seq"'::regclass) NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"COD_CONTRATO_CONCAT" character varying,
"COD_CONTRATO" integer,
"ORGAO" character varying,
"MUNICIPIO" character varying,
"UF" character varying,
"PARTICIPANTE" character varying,
"EDITAL" character varying,
"DATA_PREGAO" date,
"TIPO_CONTRATO" character varying,
"CLASSIFICACAO" character varying,
"LOTE_ITEM" character varying,
"MATERIAL" character varying,
"QTDE" integer,
"UNIDADE" character varying,
"FORNECEDOR" character varying,
"DESCRICAO_DATABASE" character varying,
"COD_SUPRA" integer,
"NOME_SUPRA" character varying,
"VALOR_UNITARIO" numeric,
"VALOR_TOTAL" numeric,
"TOTAL_NORMALIZADO" character varying,
"DATA_PROPOSTA" date,
"COD_STATUS" character varying,
"SITUACAO_STATUS" character varying,
"DATA_ADJUDICACAO" character varying,
"DATA_INICIO" character varying,
"DATA_TERMINO" character varying,
"VIGENCIA" character varying,
"DATA_EMPENHO" character varying,
"INSTRUMENTAL" character varying,
"INSTRUMENTADOR" character varying,
"LOCAL_ENTREGA" character varying,
"PRAZO_ENTREGA" character varying,
"DETALHAMENTO" character varying,
"CODIGO_STATUS" integer);
CREATE TABLE "itens_arrematados"."UNIQUE_TBL" ("CHAVE" bigint DEFAULT nextval('itens_arrematados."UNIQUE_TBL_CHAVE_seq"'::regclass) NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"COD_CONTRATO_CONCAT" character varying,
"EDITAL" character varying,
"TIPO_CONTRATO" character varying,
"CLASSIFICACAO" character varying);
CREATE TABLE "opme"."bancocodigos" ("id" integer DEFAULT nextval('opme.bancocodigos_id_seq'::regclass) NOT NULL,
"contrato" text,
"cod_bio" integer,
"cod_fab" text,
"produto" text,
"descricao_personalizada" text,
"classificacao" text,
"item_ata" text);
CREATE TABLE "opme"."cirurgias" ("id" integer DEFAULT nextval('opme.cirurgias_id_seq'::regclass) NOT NULL,
"contrato" text,
"acao" text,
"paciente" text,
"local_cirurgia" text,
"cod_cliente" integer,
"data_cirurgia" timestamp without time zone,
"cod_bio" integer,
"classificacao" text,
"produto" text,
"descricao_personalizada" text,
"quantidade_utilizada" integer,
"lote" text,
"prontuario" text,
"medico" text,
"crm" text,
"valor_unitario" double precision,
"valor_total" double precision,
"item_pregao" text,
"empenho" text,
"autorizacao" text,
"pedido" integer,
"retorno_consignacao" text,
"status_expedicao" text,
"autorizacao_opme" text,
"nota_fiscal" text,
"modalidade" character varying(50) DEFAULT 'Venda'::character varying);
CREATE TABLE "opme"."contratos" ("id" integer DEFAULT nextval('opme.contratos_id_seq'::regclass) NOT NULL,
"id_contrato" text NOT NULL,
"material" text,
"cod_cliente" integer,
"cliente" text,
"uf" text,
"pregao" text,
"total_ata" double precision,
"inicio_ata" timestamp without time zone,
"termino_ata" timestamp without time zone,
"inativo" boolean DEFAULT false,
"empresa" character varying(255),
"descricao_detalhada" boolean DEFAULT false,
"decimais" boolean DEFAULT false,
"casas" integer DEFAULT 2);
CREATE TABLE "opme"."observacoes" ("id" integer DEFAULT nextval('opme.observacoes_id_seq'::regclass) NOT NULL,
"contrato" character varying(255),
"cirurgia" character varying(255),
"observacao" text);
CREATE TABLE "opme"."saldoata" ("id" integer DEFAULT nextval('opme.saldoata_id_seq'::regclass) NOT NULL,
"contrato" text,
"item_ata" text,
"descricao_item" text,
"quantidade_ata" integer,
"valor_unitario" double precision,
"valor_total" double precision,
"quantidade_utilizada" integer,
"saldo" integer);
CREATE TABLE "opme"."saldoatahospital" ("id" integer DEFAULT nextval('opme.saldoatahospital_id_seq'::regclass) NOT NULL,
"contrato" text,
"unidade" text,
"item_ata" text,
"descricao_item" text,
"quantidade_ata" integer,
"valor_unitario" double precision,
"valor_total" double precision,
"quantidade_utilizada" integer,
"saldo" integer);
CREATE TABLE "opme"."supra_logs" ("id" integer DEFAULT nextval('opme.supra_logs_id_seq'::regclass) NOT NULL,
"banco" character varying(50) NOT NULL,
"metodo" character varying(50) NOT NULL,
"tabela" character varying(100) NOT NULL,
"log" text NOT NULL,
"data_criacao" timestamp without time zone DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "opme"."unidades" ("id" integer DEFAULT nextval('opme.unidades_id_seq'::regclass) NOT NULL,
"contrato" text,
"cod_cliente" integer,
"hospital" text,
"sigla" text,
"ir" boolean DEFAULT false,
"observacoes" text,
"aliquota" double precision DEFAULT 0);
CREATE TABLE "public"."agenda_contatos" ("id" integer DEFAULT nextval('agenda_contatos_id_seq'::regclass) NOT NULL,
"codigo_cliente" character varying(50) NOT NULL,
"nome_contato" character varying(255) NOT NULL,
"cargo_contato" character varying(100),
"telefone_contato" character varying(50),
"email_contato" character varying(100),
"observacao" text,
"ativo" boolean DEFAULT true,
"created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "public"."contratos" ("codigo_contrato" character varying(255) NOT NULL,
"empresa" character varying(255),
"edital" character varying(255),
"tipo_contrato" character varying(255),
"classificacao" character varying(255),
"created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "public"."historico_cobranca" ("id" integer DEFAULT nextval('historico_cobranca_id_seq'::regclass) NOT NULL,
"codigo_cliente" character varying(50) NOT NULL,
"agenda_contato_id" integer,
"tipo_contato" character varying(50),
"resultado_contato" character varying(50),
"descritivo_contato" text,
"agendamento_data_contato" date,
"agendamento_hora_contato" time without time zone,
"agendamento_tipo_retorno_contato" character varying(50),
"agendamento_nota_contato" text,
"created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
"created_by" integer,
"has_agendamento" boolean DEFAULT false);
CREATE TABLE "public"."metas_recebimento" ("id" integer DEFAULT nextval('metas_recebimento_id_seq'::regclass) NOT NULL,
"valor_meta" numeric(15,2) DEFAULT 0 NOT NULL,
"updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "public"."notification_reads" ("user_id" integer NOT NULL,
"notification_id" integer NOT NULL,
"read_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "public"."notifications" ("id" integer DEFAULT nextval('notifications_id_seq'::regclass) NOT NULL,
"module" character varying(50) NOT NULL,
"action" character varying(20) NOT NULL,
"message" text NOT NULL,
"created_by" integer,
"created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "public"."roles" ("name" character varying(50) NOT NULL,
"permissions" jsonb NOT NULL,
"is_system" boolean DEFAULT false,
"created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "public"."titulos" ("id" integer DEFAULT nextval('titulos_id_seq'::regclass) NOT NULL,
"empresa" character varying(50) NOT NULL,
"nota" character varying(50),
"documento" character varying(50) NOT NULL,
"cod_cliente" character varying(50),
"cliente" character varying(255),
"esfera" character varying(50),
"uf" character varying(5),
"contrato" character varying(255),
"empenho" character varying(255),
"valor_nota" numeric(15,2),
"boleto_emitido" character varying(10) DEFAULT 'Não'::character varying,
"valor_deposito" numeric(15,2),
"data_emissao" date,
"data_vencimento" date,
"data_pagamento" date,
"status" character varying(50) DEFAULT 'Pendente'::character varying,
"banco" character varying(255),
"retem_ir" character varying(5) DEFAULT 'Não'::character varying,
"origem" character varying(20) DEFAULT 'supra'::character varying,
"created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "public"."titulos_bkp_seguranca" ("id" integer,
"empresa" character varying(50),
"nota" character varying(50),
"documento" character varying(50),
"cod_cliente" character varying(50),
"cliente" character varying(255),
"esfera" character varying(50),
"uf" character varying(5),
"contrato" character varying(255),
"empenho" character varying(255),
"valor_nota" numeric(15,2),
"boleto_emitido" character varying(10),
"valor_deposito" numeric(15,2),
"data_emissao" date,
"data_vencimento" date,
"data_pagamento" date,
"status" character varying(50),
"banco" character varying(255),
"retem_ir" character varying(5),
"origem" character varying(20),
"created_at" timestamp without time zone,
"updated_at" timestamp without time zone);
CREATE TABLE "public"."users" ("id" integer DEFAULT nextval('users_id_seq'::regclass) NOT NULL,
"nome" character varying(255) NOT NULL,
"email" character varying(255) NOT NULL,
"password_hash" character varying(255) NOT NULL,
"first_access" boolean DEFAULT true,
"is_active" boolean DEFAULT true,
"created_at" timestamp without time zone DEFAULT now(),
"avatar_url" character varying(255),
"role" character varying(50) DEFAULT 'CR1'::character varying NOT NULL);
ALTER TABLE "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);
ALTER TABLE "opme"."supra_logs" ADD CONSTRAINT "supra_logs_pkey" PRIMARY KEY (id);
ALTER TABLE "opme"."contratos" ADD CONSTRAINT "contratos_pkey" PRIMARY KEY (id);
ALTER TABLE "opme"."cirurgias" ADD CONSTRAINT "cirurgias_pkey" PRIMARY KEY (id);
ALTER TABLE "financeiro"."vendas_custos" ADD CONSTRAINT "vendas_custos_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id);
ALTER TABLE "financeiro"."r_dre" ADD CONSTRAINT "r_dre_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."metas_recebimento" ADD CONSTRAINT "metas_recebimento_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."titulos" ADD CONSTRAINT "titulos_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."roles" ADD CONSTRAINT "roles_pkey" PRIMARY KEY (name);
ALTER TABLE "opme"."observacoes" ADD CONSTRAINT "observacoes_pkey" PRIMARY KEY (id);
ALTER TABLE "financeiro"."ferramenta_custo" ADD CONSTRAINT "ferramenta_custo_pkey" PRIMARY KEY (id);
ALTER TABLE "financeiro"."produtos_aliquotas" ADD CONSTRAINT "produtos_aliquotas_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."contratos" ADD CONSTRAINT "contratos_pkey" PRIMARY KEY (codigo_contrato);
ALTER TABLE "public"."notification_reads" ADD CONSTRAINT "notification_reads_pkey" PRIMARY KEY (user_id, notification_id);
ALTER TABLE "public"."agenda_contatos" ADD CONSTRAINT "agenda_contatos_pkey" PRIMARY KEY (id);
ALTER TABLE "agenda_licitacoes"."AGENDA_LICITACOES" ADD CONSTRAINT "AGENDA_LICITACOES_pkey" PRIMARY KEY ("CHAVE");
ALTER TABLE "public"."historico_cobranca" ADD CONSTRAINT "historico_cobranca_pkey" PRIMARY KEY (id);
ALTER TABLE "itens_arrematados"."IA_NEXOMED" ADD CONSTRAINT "IA_NEXOMED_pkey" PRIMARY KEY ("CHAVE");
ALTER TABLE "itens_arrematados"."IA_BML" ADD CONSTRAINT "IA_BML_pkey" PRIMARY KEY ("CHAVE");
ALTER TABLE "itens_arrematados"."UNIQUE_TBL" ADD CONSTRAINT "UNIQUE_TBL_pkey" PRIMARY KEY ("CHAVE");
ALTER TABLE "opme"."saldoatahospital" ADD CONSTRAINT "saldoatahospital_pkey" PRIMARY KEY (id);
ALTER TABLE "opme"."saldoata" ADD CONSTRAINT "saldoata_pkey" PRIMARY KEY (id);
ALTER TABLE "opme"."bancocodigos" ADD CONSTRAINT "bancocodigos_pkey" PRIMARY KEY (id);
ALTER TABLE "opme"."unidades" ADD CONSTRAINT "unidades_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."users" ADD CONSTRAINT "users_email_key" UNIQUE (email);
ALTER TABLE "opme"."observacoes" ADD CONSTRAINT "observacoes_cirurgia_key" UNIQUE (cirurgia);
ALTER TABLE "public"."titulos" ADD CONSTRAINT "titulos_empresa_documento_key" UNIQUE (empresa, documento);
ALTER TABLE "public"."notification_reads" ADD CONSTRAINT "notification_reads_notification_id_fkey" FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE;
ALTER TABLE "public"."notification_reads" ADD CONSTRAINT "notification_reads_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "public"."historico_cobranca" ADD CONSTRAINT "historico_cobranca_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE "public"."historico_cobranca" ADD CONSTRAINT "historico_cobranca_agenda_contato_id_fkey" FOREIGN KEY (agenda_contato_id) REFERENCES agenda_contatos(id) ON DELETE SET NULL;
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
