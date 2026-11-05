const { Client } = require('pg');
const pgPool = require('../db/pgConnection');
const eventBus = require('./eventBus');
const CHANNEL = 'hub_notifications_refresh';

// LISTEN exige uma conexão dedicada, fora do pool de requisições.
function createNotificationBridge({ createClient = () => new Client({
    ...pgPool.options,
    // pg-pool torna password não enumerável; spread sozinho descarta a senha.
    password: pgPool.options.password,
    connectionTimeoutMillis: 10000,
}), bus = eventBus, retryMs = 5000 } = {}) {
    let stopped = true;
    let client = null;
    let retry = null;
    function reconnect() {
        if (!stopped && !retry) {
            retry = setTimeout(() => { retry = null; connect(); }, retryMs);
            retry.unref();
        }
    }
    async function connect() {
        if (stopped) return;
        let next;
        try {
            next = createClient();
            client = next;
            const disconnected = err => {
                if (client !== next) return;
                client = null;
                if (err) console.error('Ponte de notificações PostgreSQL:', err.message);
                next.end().catch(() => {});
                reconnect();
            };
            next.on('notification', event => {
                if (!stopped && event.channel === CHANNEL && event.payload === 'refresh') bus.emit('refresh');
            });
            next.on('error', disconnected);
            next.on('end', () => disconnected());
            await next.connect();
            if (stopped) { await next.end(); return; }
            await next.query('LISTEN ' + CHANNEL);
        } catch (err) {
            if (client === next) client = null;
            console.error('Ponte de notificações PostgreSQL:', err.message);
            if (next) await next.end().catch(() => {});
            reconnect();
        }
    }
    return {
        start() { if (stopped) { stopped = false; connect(); } },
        async stop() {
            stopped = true;
            clearTimeout(retry);
            retry = null;
            const current = client;
            client = null;
            if (current) await current.end();
        },
    };
}

module.exports = { ...createNotificationBridge(), createNotificationBridge, CHANNEL };
