// Only external service boundaries are replaced. PostgreSQL, Redis, routes,
// authentication and FastAPI run unchanged against disposable real services.
const fs = require('fs');
const path = require('path');
const Module = require('module');
const root = path.resolve(__dirname, '../../..');
if (process.env.NODE_ENV !== 'test' || process.env.HUB_E2E !== '1') {
    throw new Error('Adapter E2E permitido somente no processo isolado de testes.');
}
const runtime = JSON.parse(fs.readFileSync(process.env.HUB_E2E_RUNTIME_FILE));
if (process.env.PG_DATABASE !== 'nexomed_qa' || Number(process.env.PG_PORT) !== runtime.pg.port) {
    throw new Error('O adapter E2E exige o PostgreSQL descartavel desta execucao.');
}
const net = require('net');
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
    let target = Array.isArray(args[0]) ? args[0][0] : args[0];
    const host = typeof target === 'object' ? target.host || target.hostname : args[1];
    if (host && !['127.0.0.1', 'localhost', '::1'].includes(host)) {
        throw new Error('Conexao externa bloqueada na suite E2E: ' + host);
    }
    return connect.apply(this, args);
};
const originalLoad = Module._load;
const sql = originalLoad.call(Module, 'mssql', module);
const client = {
    codigo: 900001,
    razaoSocial: 'Hospital QA',
    nomeFantasia: 'Hospital QA',
    cidade: 'Sao Paulo',
    uf: 'SP',
    cnpj: '00000000000000',
    email: 'hospital@example.invalid',
    classificacao: 'Estadual',
    tipoLogradouro: 'Rua',
    logradouro: 'Teste',
    numero: '1'
};
function supraPool() {
    return {
        request() {
            const params = {};
            return {
                input(name, type, value) {
                    params[name] = arguments.length === 2 ? type : value;
                    return this;
                },
                async query(query) {
                    // A test must never execute an ERP write, including accidentally.
                    if (/\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|TRUNCATE|EXEC(?:UTE)?)\b/i.test(query)) {
                        throw new Error('Escrita no Supra bloqueada pela suite E2E.');
                    }
                    fs.appendFileSync(
                        runtime.externalLog,
                        JSON.stringify({ service: 'supra', query, params }) + '\n'
                    );
                    if (/bio_contas_a_receber|bml_contas_a_receber/i.test(query)) {
                        const bml = /bml_contas_a_receber/i.test(query);
                        return {
                            recordset: [
                                {
                                    Núm_NF: bml ? '900011' : '900010',
                                    Cód_Fornecedor: '900001',
                                    Nome_Fornecedor: 'Hospital QA',
                                    Esfera: 'ESTADUAL',
                                    UF: 'SP',
                                    Contrato: 'QA-SEED',
                                    Documento: bml ? 'QA-DOC-BML' : 'QA-DOC',
                                    Valor_parcela: 25,
                                    Valor_recebido: 0,
                                    Data_emissão: '2026-11-05',
                                    Data_vencimento: '2099-12-31',
                                    Data_quitação: null,
                                    Nome_cta_débito: 'Banco QA',
                                    retem_imposto_renda: 'Não'
                                }
                            ]
                        };
                    }
                    if (/bi_cadastro_clientes/i.test(query)) return { recordset: [client] };
                    if (/nota_fiscal_venda_follow_up/i.test(query)) return { recordset: [] };
                    if (/nota_fiscal_venda_item/i.test(query))
                        return {
                            recordset: [
                                {
                                    prod_codigo: 710100,
                                    produto_nome: 'PRODUTO QA',
                                    fabricante_nome: 'FABRICANTE QA',
                                    classificacao_fiscal: '12345678',
                                    quantidade: 2,
                                    Unidade: 'UN',
                                    valor_unitario: 12.5,
                                    valor_total: 25
                                }
                            ]
                        };
                    if (/nota_fiscal_venda/i.test(query))
                        return {
                            recordset: [
                                {
                                    codigo: 900010,
                                    clifor_codigo: client.codigo,
                                    nome_natureza_operacao: 'VENDA DE MERCADORIA',
                                    data: '2026-11-05',
                                    valor_total: 25
                                }
                            ]
                        };
                    if (/\bproduto\b/i.test(query))
                        return { recordset: [{ codigo: params.codigo, nome: 'PRODUTO QA' }] };
                    throw new Error(
                        'Consulta Supra sem fixture: ' + query.replace(/\s+/g, ' ').slice(0, 120)
                    );
                }
            };
        }
    };
}
const supra = { sql, getPool: async () => supraPool(), getPoolSGC2: async () => supraPool() };
Module._load = function (request, parent, ...rest) {
    const resolved = request.startsWith('.') ? Module._resolveFilename(request, parent) : request;
    if (resolved === path.join(root, 'app/db/connection.js')) return supra;
    if (request === 'node-cron') return { schedule: () => ({ stop() {}, destroy() {} }) };
    if (request === 'nodemailer')
        return {
            createTransport: () => ({
                async sendMail(mail) {
                    fs.appendFileSync(runtime.mailbox, JSON.stringify(mail) + '\n');
                    return { messageId: 'e2e-local', accepted: [mail.to] };
                }
            })
        };
    return originalLoad.call(this, request, parent, ...rest);
};
