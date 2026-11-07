-- Snapshot somente de estrutura do PostgreSQL local (15.18), sem registros.
-- Usado exclusivamente no banco descartavel da suite E2E.
CREATE SCHEMA agenda_licitacoes;
CREATE SCHEMA financeiro;
CREATE SCHEMA itens_arrematados;
CREATE SCHEMA opme;
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE agenda_licitacoes."AGENDA_LICITACOES" (
    "CHAVE" bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    data_limite date,
    hora_limite time without time zone,
    data_lances date,
    hora_lances time without time zone,
    modalidade character varying,
    pregao character varying,
    orgao character varying,
    uf character varying,
    categoria character varying,
    objeto character varying,
    portal character varying,
    empresa character varying,
    data_cadastro date,
    antecedencia integer,
    observacoes_status character varying
);

CREATE SEQUENCE agenda_licitacoes."AGENDA_LICITACOES_CHAVE_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE agenda_licitacoes."AGENDA_LICITACOES_CHAVE_seq" OWNED BY agenda_licitacoes."AGENDA_LICITACOES"."CHAVE";

CREATE TABLE financeiro.vendas_custos (
    id integer NOT NULL,
    empresa character varying(20) NOT NULL,
    nota_fiscal integer NOT NULL,
    codigo_cliente integer,
    cliente character varying(255),
    cidade character varying(100),
    uf character varying(50),
    data_emissao date,
    tipo_nota character varying(100),
    cod_produto character varying(100),
    produto character varying(255),
    lote character varying(200),
    classificacao character varying(100),
    fabricante character varying(100),
    unidade character varying(50),
    quantidade numeric(15,4) DEFAULT 0,
    valor_unitario numeric(15,4) DEFAULT 0,
    valor_total numeric(15,4) DEFAULT 0,
    custo_unitario numeric(15,4) DEFAULT 0,
    custo_total numeric(15,4) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE financeiro.vendas_custos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE financeiro.vendas_custos_id_seq OWNED BY financeiro.vendas_custos.id;

CREATE TABLE itens_arrematados."IA_BML" (
    "CHAVE" bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
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
    "CODIGO_STATUS" integer
);

CREATE SEQUENCE itens_arrematados."IA_BML_CHAVE_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE itens_arrematados."IA_BML_CHAVE_seq" OWNED BY itens_arrematados."IA_BML"."CHAVE";

CREATE TABLE itens_arrematados."IA_NEXOMED" (
    "CHAVE" bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
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
    "CODIGO_STATUS" integer
);

CREATE SEQUENCE itens_arrematados."IA_NEXOMED_CHAVE_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE itens_arrematados."IA_NEXOMED_CHAVE_seq" OWNED BY itens_arrematados."IA_NEXOMED"."CHAVE";

-- Espelha a terceira tabela legada, confirmada no catalogo de producao.
CREATE TABLE itens_arrematados."UNIQUE_TBL" (
    "CHAVE" bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "COD_CONTRATO_CONCAT" character varying,
    "EDITAL" character varying,
    "TIPO_CONTRATO" character varying,
    "CLASSIFICACAO" character varying
);

CREATE TABLE opme.bancocodigos (
    id integer NOT NULL,
    contrato text,
    cod_bio integer,
    cod_fab text,
    produto text,
    descricao_personalizada text,
    classificacao text,
    item_ata text
);

CREATE SEQUENCE opme.bancocodigos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE opme.bancocodigos_id_seq OWNED BY opme.bancocodigos.id;

CREATE TABLE opme.cirurgias (
    id integer NOT NULL,
    contrato text,
    acao text,
    paciente text,
    local_cirurgia text,
    cod_cliente integer,
    data_cirurgia timestamp without time zone,
    cod_bio integer,
    classificacao text,
    produto text,
    descricao_personalizada text,
    quantidade_utilizada integer,
    lote text,
    prontuario text,
    medico text,
    crm text,
    valor_unitario double precision,
    valor_total double precision,
    item_pregao text,
    empenho text,
    autorizacao text,
    pedido integer,
    retorno_consignacao text,
    status_expedicao text,
    autorizacao_opme text,
    nota_fiscal text,
    modalidade character varying(50) DEFAULT 'Venda'::character varying
);

CREATE SEQUENCE opme.cirurgias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE opme.cirurgias_id_seq OWNED BY opme.cirurgias.id;

CREATE TABLE opme.contratos (
    id integer NOT NULL,
    id_contrato text NOT NULL,
    material text,
    cod_cliente integer,
    cliente text,
    uf text,
    pregao text,
    total_ata double precision,
    inicio_ata timestamp without time zone,
    termino_ata timestamp without time zone,
    inativo boolean DEFAULT false,
    empresa character varying(255),
    descricao_detalhada boolean DEFAULT false,
    decimais boolean DEFAULT false,
    casas integer DEFAULT 2
);

CREATE SEQUENCE opme.contratos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE opme.contratos_id_seq OWNED BY opme.contratos.id;

CREATE TABLE opme.observacoes (
    id integer NOT NULL,
    contrato character varying(255),
    cirurgia character varying(255),
    observacao text
);

CREATE SEQUENCE opme.observacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE opme.observacoes_id_seq OWNED BY opme.observacoes.id;

CREATE TABLE opme.saldoata (
    id integer NOT NULL,
    contrato text,
    item_ata text,
    descricao_item text,
    quantidade_ata integer,
    valor_unitario double precision,
    valor_total double precision,
    quantidade_utilizada integer,
    saldo integer
);

CREATE SEQUENCE opme.saldoata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE opme.saldoata_id_seq OWNED BY opme.saldoata.id;

CREATE TABLE opme.saldoatahospital (
    id integer NOT NULL,
    contrato text,
    unidade text,
    item_ata text,
    descricao_item text,
    quantidade_ata integer,
    valor_unitario double precision,
    valor_total double precision,
    quantidade_utilizada integer,
    saldo integer
);

CREATE SEQUENCE opme.saldoatahospital_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE opme.saldoatahospital_id_seq OWNED BY opme.saldoatahospital.id;

CREATE TABLE opme.supra_logs (
    id integer NOT NULL,
    banco character varying(50) NOT NULL,
    metodo character varying(50) NOT NULL,
    tabela character varying(100) NOT NULL,
    log text NOT NULL,
    data_criacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE opme.supra_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE opme.supra_logs_id_seq OWNED BY opme.supra_logs.id;

CREATE TABLE opme.unidades (
    id integer NOT NULL,
    contrato text,
    cod_cliente integer,
    hospital text,
    sigla text,
    ir boolean DEFAULT false,
    observacoes text,
    aliquota double precision DEFAULT 0
);

CREATE SEQUENCE opme.unidades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE opme.unidades_id_seq OWNED BY opme.unidades.id;

CREATE TABLE public.agenda_contatos (
    id integer NOT NULL,
    codigo_cliente character varying(50) NOT NULL,
    nome_contato character varying(255) NOT NULL,
    cargo_contato character varying(100),
    telefone_contato character varying(50),
    email_contato character varying(100),
    observacao text,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.agenda_contatos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.agenda_contatos_id_seq OWNED BY public.agenda_contatos.id;

CREATE TABLE public.contratos (
    codigo_contrato character varying(255) NOT NULL,
    empresa character varying(255),
    edital character varying(255),
    tipo_contrato character varying(255),
    classificacao character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.historico_cobranca (
    id integer NOT NULL,
    codigo_cliente character varying(50) NOT NULL,
    agenda_contato_id integer,
    tipo_contato character varying(50),
    resultado_contato character varying(50),
    descritivo_contato text,
    agendamento_data_contato date,
    agendamento_hora_contato time without time zone,
    agendamento_tipo_retorno_contato character varying(50),
    agendamento_nota_contato text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    has_agendamento boolean DEFAULT false
);

CREATE SEQUENCE public.historico_cobranca_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.historico_cobranca_id_seq OWNED BY public.historico_cobranca.id;

CREATE TABLE public.metas_recebimento (
    id integer NOT NULL,
    valor_meta numeric(15,2) DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.metas_recebimento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.metas_recebimento_id_seq OWNED BY public.metas_recebimento.id;

CREATE TABLE public.notification_reads (
    user_id integer NOT NULL,
    notification_id integer NOT NULL,
    read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.notifications (
    id integer NOT NULL,
    module character varying(50) NOT NULL,
    action character varying(20) NOT NULL,
    message text NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;

CREATE TABLE public.roles (
    name character varying(50) NOT NULL,
    permissions jsonb NOT NULL,
    is_system boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.titulos (
    id integer NOT NULL,
    empresa character varying(50) NOT NULL,
    nota character varying(50),
    documento character varying(50) NOT NULL,
    cod_cliente character varying(50),
    cliente character varying(255),
    esfera character varying(50),
    uf character varying(5),
    contrato character varying(255),
    empenho character varying(255),
    valor_nota numeric(15,2),
    boleto_emitido character varying(10) DEFAULT 'Não'::character varying,
    valor_deposito numeric(15,2),
    data_emissao date,
    data_vencimento date,
    data_pagamento date,
    status character varying(50) DEFAULT 'Pendente'::character varying,
    banco character varying(255),
    retem_ir character varying(5) DEFAULT 'Não'::character varying,
    origem character varying(20) DEFAULT 'supra'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.titulos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.titulos_id_seq OWNED BY public.titulos.id;

CREATE TABLE public.users (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_access boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    avatar_url character varying(255),
    role character varying(50) DEFAULT 'CR1'::character varying NOT NULL
);

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

ALTER TABLE ONLY agenda_licitacoes."AGENDA_LICITACOES" ALTER COLUMN "CHAVE" SET DEFAULT nextval('agenda_licitacoes."AGENDA_LICITACOES_CHAVE_seq"'::regclass);

ALTER TABLE ONLY financeiro.vendas_custos ALTER COLUMN id SET DEFAULT nextval('financeiro.vendas_custos_id_seq'::regclass);

ALTER TABLE ONLY itens_arrematados."IA_BML" ALTER COLUMN "CHAVE" SET DEFAULT nextval('itens_arrematados."IA_BML_CHAVE_seq"'::regclass);

ALTER TABLE ONLY itens_arrematados."IA_NEXOMED" ALTER COLUMN "CHAVE" SET DEFAULT nextval('itens_arrematados."IA_NEXOMED_CHAVE_seq"'::regclass);

ALTER TABLE ONLY opme.bancocodigos ALTER COLUMN id SET DEFAULT nextval('opme.bancocodigos_id_seq'::regclass);

ALTER TABLE ONLY opme.cirurgias ALTER COLUMN id SET DEFAULT nextval('opme.cirurgias_id_seq'::regclass);

ALTER TABLE ONLY opme.contratos ALTER COLUMN id SET DEFAULT nextval('opme.contratos_id_seq'::regclass);

ALTER TABLE ONLY opme.observacoes ALTER COLUMN id SET DEFAULT nextval('opme.observacoes_id_seq'::regclass);

ALTER TABLE ONLY opme.saldoata ALTER COLUMN id SET DEFAULT nextval('opme.saldoata_id_seq'::regclass);

ALTER TABLE ONLY opme.saldoatahospital ALTER COLUMN id SET DEFAULT nextval('opme.saldoatahospital_id_seq'::regclass);

ALTER TABLE ONLY opme.supra_logs ALTER COLUMN id SET DEFAULT nextval('opme.supra_logs_id_seq'::regclass);

ALTER TABLE ONLY opme.unidades ALTER COLUMN id SET DEFAULT nextval('opme.unidades_id_seq'::regclass);

ALTER TABLE ONLY public.agenda_contatos ALTER COLUMN id SET DEFAULT nextval('public.agenda_contatos_id_seq'::regclass);

ALTER TABLE ONLY public.historico_cobranca ALTER COLUMN id SET DEFAULT nextval('public.historico_cobranca_id_seq'::regclass);

ALTER TABLE ONLY public.metas_recebimento ALTER COLUMN id SET DEFAULT nextval('public.metas_recebimento_id_seq'::regclass);

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);

ALTER TABLE ONLY public.titulos ALTER COLUMN id SET DEFAULT nextval('public.titulos_id_seq'::regclass);

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

ALTER TABLE ONLY agenda_licitacoes."AGENDA_LICITACOES"
    ADD CONSTRAINT "AGENDA_LICITACOES_pkey" PRIMARY KEY ("CHAVE");

ALTER TABLE ONLY financeiro.vendas_custos
    ADD CONSTRAINT vendas_custos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY itens_arrematados."IA_BML"
    ADD CONSTRAINT "IA_BML_pkey" PRIMARY KEY ("CHAVE");

ALTER TABLE ONLY itens_arrematados."IA_NEXOMED"
    ADD CONSTRAINT "IA_NEXOMED_pkey" PRIMARY KEY ("CHAVE");

ALTER TABLE ONLY opme.bancocodigos
    ADD CONSTRAINT bancocodigos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY opme.cirurgias
    ADD CONSTRAINT cirurgias_pkey PRIMARY KEY (id);

ALTER TABLE ONLY opme.contratos
    ADD CONSTRAINT contratos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY opme.observacoes
    ADD CONSTRAINT observacoes_cirurgia_key UNIQUE (cirurgia);

ALTER TABLE ONLY opme.observacoes
    ADD CONSTRAINT observacoes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY opme.saldoata
    ADD CONSTRAINT saldoata_pkey PRIMARY KEY (id);

ALTER TABLE ONLY opme.saldoatahospital
    ADD CONSTRAINT saldoatahospital_pkey PRIMARY KEY (id);

ALTER TABLE ONLY opme.supra_logs
    ADD CONSTRAINT supra_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY opme.unidades
    ADD CONSTRAINT unidades_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.agenda_contatos
    ADD CONSTRAINT agenda_contatos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_pkey PRIMARY KEY (codigo_contrato);

ALTER TABLE ONLY public.historico_cobranca
    ADD CONSTRAINT historico_cobranca_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.metas_recebimento
    ADD CONSTRAINT metas_recebimento_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_pkey PRIMARY KEY (user_id, notification_id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (name);

ALTER TABLE ONLY public.titulos
    ADD CONSTRAINT titulos_empresa_documento_key UNIQUE (empresa, documento);

ALTER TABLE ONLY public.titulos
    ADD CONSTRAINT titulos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

CREATE INDEX idx_vc_cod_produto ON financeiro.vendas_custos USING btree (cod_produto);

CREATE INDEX idx_vc_custo_unitario ON financeiro.vendas_custos USING btree (custo_unitario);

CREATE INDEX idx_vc_data_emissao ON financeiro.vendas_custos USING btree (data_emissao);

CREATE INDEX idx_vc_empresa ON financeiro.vendas_custos USING btree (empresa);

CREATE INDEX idx_vc_lote ON financeiro.vendas_custos USING btree (lote);

CREATE INDEX idx_vc_tipo_nota ON financeiro.vendas_custos USING btree (tipo_nota);

CREATE INDEX idx_cirurgias_contrato ON opme.cirurgias USING btree (contrato);

CREATE INDEX idx_cirurgias_paciente ON opme.cirurgias USING btree (paciente);

CREATE INDEX idx_contratos_id_contrato ON opme.contratos USING btree (id_contrato);

CREATE INDEX idx_contratos_inativo ON opme.contratos USING btree (inativo);

CREATE INDEX idx_titulos_contrato ON public.titulos USING btree (contrato);

CREATE INDEX idx_titulos_status ON public.titulos USING btree (status);

CREATE INDEX idx_titulos_vencimento ON public.titulos USING btree (data_vencimento);

ALTER TABLE ONLY public.historico_cobranca
    ADD CONSTRAINT historico_cobranca_agenda_contato_id_fkey FOREIGN KEY (agenda_contato_id) REFERENCES public.agenda_contatos(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.historico_cobranca
    ADD CONSTRAINT historico_cobranca_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
