const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const express = require('express');
const { EventEmitter } = require('events');
const { resolveFastapiRuntime } = require('../../app/services/fastapiRuntime');
const { createFastapiProxy } = require('../../app/services/fastapiProxy');
const { createNotificationBridge, CHANNEL } = require('../../app/services/notificationBridge');
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + server.address().port)));
const close = server => new Promise(resolve => server.close(resolve));

test('porta ocupada seleciona alternativa sem encerrar outro servico', async () => {
    const server = http.createServer();
    await listen(server);
    try {
        const port = server.address().port;
        const selected = await resolveFastapiRuntime({ env: {}, defaultPort: port });
        assert.notEqual(selected.port, port);
        assert.equal(selected.fallback, true);
        await assert.rejects(resolveFastapiRuntime({ env: { FASTAPI_PORT: String(port) } }), /ocupada/);
        assert.equal(server.listening, true);
    } finally { await close(server); }
});

test('configuracao de porta invalida ou divergente e rejeitada', async () => {
    await assert.rejects(resolveFastapiRuntime({ env: { FASTAPI_PORT: 'abc' } }), /porta inteira/);
    await assert.rejects(resolveFastapiRuntime({ env: { FASTAPI_URL: 'http://127.0.0.1:8001', FASTAPI_PORT: '8002' } }), /mesma porta/);
});

test('proxy mantem metodos, URL, chave, Unicode, status e resposta', async () => {
    const received = [];
    const upstream = http.createServer(async (req, res) => {
        let body = ''; for await (const chunk of req) body += chunk;
        received.push({ method: req.method, url: req.url, key: req.headers['x-api-key'], body });
        res.writeHead(req.method === 'POST' ? 201 : 200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ CHAVE: '9007199254740993' }));
    });
    const app = express(); app.use(express.json());
    app.use('/api/vba', createFastapiProxy({ baseUrl: await listen(upstream) }));
    const gateway = http.createServer(app); const base = await listen(gateway);
    try {
        for (const method of ['GET','POST','PUT','DELETE']) {
            const body = ['POST','PUT'].includes(method) ? JSON.stringify({ empresa: 'São Paulo' }) : undefined;
            const response = await fetch(base + '/api/vba/agenda_licitacoes?empresa=BML', { method, headers: { 'x-api-key': 'test-key', 'content-type': 'application/json' }, body });
            assert.equal(response.status, method === 'POST' ? 201 : 200);
            assert.equal((await response.json()).CHAVE, '9007199254740993');
            assert.deepEqual(received.at(-1), { method, url: '/api/vba/agenda_licitacoes?empresa=BML', key: 'test-key', body: body || '' });
        }
    } finally { await close(gateway); await close(upstream); }
});

test('falha upstream retorna 502 e nao repete POST', async () => {
    let calls = 0;
    const upstream = http.createServer(req => { calls++; req.socket.destroy(); });
    const app = express(); app.use(express.json()); app.use(createFastapiProxy({ baseUrl: await listen(upstream) }));
    const gateway = http.createServer(app); const base = await listen(gateway);
    try {
        assert.equal((await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 502);
        assert.equal(calls, 1);
    } finally { await close(gateway); await close(upstream); }
});

test('notificacoes cruzam a ponte e a conexao e encerrada', async () => {
    const client = new EventEmitter(); const bus = new EventEmitter(); let refreshes = 0;
    client.connect = async () => {}; client.query = async sql => { client.sql = sql; }; client.end = async () => { client.ended = true; };
    bus.on('refresh', () => refreshes++);
    const bridge = createNotificationBridge({ bus, createClient: () => client }); bridge.start();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(client.sql, 'LISTEN ' + CHANNEL);
    client.emit('notification', { channel: CHANNEL, payload: 'refresh' });
    client.emit('notification', { channel: 'outro', payload: 'refresh' });
    assert.equal(refreshes, 1); await bridge.stop(); assert.equal(client.ended, true);
});
