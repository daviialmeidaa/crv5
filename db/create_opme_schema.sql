-- Criação do Schema
CREATE SCHEMA IF NOT EXISTS opme;

-- Tabela Pai: Contratos
CREATE TABLE opme.Contratos (
    id SERIAL PRIMARY KEY,
    id_contrato VARCHAR(255) NOT NULL,
    material VARCHAR(255),
    cod_cliente INTEGER,
    cliente VARCHAR(255),
    uf VARCHAR(2),
    pregao VARCHAR(255),
    total_ata DOUBLE PRECISION,
    inicio_ata TIMESTAMP,
    termino_ata TIMESTAMP,
    inativo BOOLEAN DEFAULT FALSE
);

-- Tabela Filha: Unidades
CREATE TABLE opme.Unidades (
    id SERIAL PRIMARY KEY,
    contrato VARCHAR(255),
    cod_cliente INTEGER,
    hospital VARCHAR(255),
    sigla VARCHAR(50),
    ir BOOLEAN DEFAULT FALSE,
    observacoes TEXT
);

-- Tabela Filha: BancoCodigos
CREATE TABLE opme.BancoCodigos (
    id SERIAL PRIMARY KEY,
    contrato VARCHAR(255),
    cod_bio INTEGER,
    cod_fab VARCHAR(255),
    produto VARCHAR(255),
    descricao_personalizada TEXT,
    classificacao VARCHAR(255),
    item_ata VARCHAR(255)
);

-- Tabela Filha: SaldoAta
CREATE TABLE opme.SaldoAta (
    id SERIAL PRIMARY KEY,
    contrato VARCHAR(255),
    item_ata VARCHAR(255),
    descricao_item TEXT,
    quantidade_ata INTEGER,
    valor_unitario DOUBLE PRECISION,
    valor_total DOUBLE PRECISION,
    quantidade_utilizada INTEGER,
    saldo INTEGER
);

-- Tabela Filha: SaldoAtaHospital
CREATE TABLE opme.SaldoAtaHospital (
    id SERIAL PRIMARY KEY,
    contrato VARCHAR(255),
    unidade VARCHAR(255),
    item_ata VARCHAR(255),
    descricao_item TEXT,
    quantidade_ata INTEGER,
    valor_unitario DOUBLE PRECISION,
    valor_total DOUBLE PRECISION,
    quantidade_utilizada INTEGER,
    saldo INTEGER
);

-- Tabela Filha: Cirurgias
CREATE TABLE opme.Cirurgias (
    id SERIAL PRIMARY KEY,
    contrato VARCHAR(255),
    acao VARCHAR(255),
    paciente VARCHAR(255),
    local_cirurgia VARCHAR(255),
    cod_cliente INTEGER,
    data_cirurgia TIMESTAMP,
    cod_bio INTEGER,
    classificacao VARCHAR(255),
    produto VARCHAR(255),
    descricao_personalizada TEXT,
    quantidade_utilizada INTEGER,
    lote VARCHAR(255),
    prontuario VARCHAR(255),
    medico VARCHAR(255),
    crm VARCHAR(50),
    valor_unitario DOUBLE PRECISION,
    valor_total DOUBLE PRECISION,
    item_pregao VARCHAR(255),
    empenho VARCHAR(255),
    autorizacao VARCHAR(255),
    pedido INTEGER,
    retorno_consignacao VARCHAR(255),
    status_expedicao VARCHAR(255),
    autorizacao_opme VARCHAR(255),
    nota_fiscal VARCHAR(255)
);
