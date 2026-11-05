const path = require('path');
const fs = require('fs');
const Module = require('module');
const root = process.cwd();
const appRoot = fs.existsSync(path.join(root, 'app/server.js')) ? path.join(root, 'app') : root;
if (process.env.NODE_ENV !== 'test') throw new Error('Preload permitido somente com NODE_ENV=test');
process.env.JWT_SECRET = 'refactoring-test-only';
const permissions = Object.fromEntries(['canViewCR','canViewLC','canViewOPME','canViewUsers','canManageUsers','canViewClientes','canCreateUsers','canManageRoles','canResetHeroku','canViewCustos'].map(k => [k,true]));
const fakePool = { options: {}, on() {}, async query(sql) {
    if (sql === 'SELECT name, permissions FROM roles') return { rows: [{ name: 'ADMIN', permissions }] };
    throw new Error('Banco real bloqueado na verificacao estrutural');
} };
const blocked = new Map([
    [path.join(appRoot, 'db/pgConnection.js'), fakePool],
    [path.join(appRoot, 'db/connection.js'), { sql: require(path.join(root,'node_modules/mssql')), getPool: async () => null, getPoolSGC2: async () => null }],
    [path.join(appRoot, 'db/redis.js'), { redisClient: { isReady: false }, getCache: async () => null, setCache: async () => {}, clearCache: async () => {} }],
    [path.join(appRoot, 'services/notificationBridge.js'), { start() {} }],
]);
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
    if (request === 'node-cron') return { schedule() { return { stop() {}, destroy() {} }; } };
    let resolved;
    try { resolved = Module._resolveFilename(request, parent); } catch (_) {}
    if (blocked.has(resolved)) return blocked.get(resolved);
    return originalLoad.apply(this, arguments);
};
const mailer = require(path.join(root,'node_modules/nodemailer'));
const transport = mailer.createTransport;
mailer.createTransport = (...args) => { const t = transport(...args); t.sendMail = async () => { throw new Error('SMTP bloqueado'); }; return t; };
const express = require(path.join(root,'node_modules/express'));
const routes = [];
const originalUse = express.application.use;
const originalGet = express.application.get;
express.application.use = function(prefix, ...handlers) {
    if (typeof prefix === 'string') {
        for (const handler of handlers.flat()) {
            if (handler.stack) {
                for (const layer of handler.stack) if (layer.route) for (const method of Object.keys(layer.route.methods)) routes.push(method.toUpperCase() + ' ' + prefix + layer.route.path);
            } else if (prefix.startsWith('/api/') || prefix === '/docs') routes.push('PROXY ' + prefix);
        }
    }
    return originalUse.apply(this, arguments);
};
express.application.get = function(route, ...handlers) {
    if (handlers.length && typeof route === 'string') routes.push('GET ' + route);
    return originalGet.apply(this, arguments);
};
const listen = express.application.listen;
express.application.listen = function(port, callback) {
    this.get('/__test/routes', (req, res) => res.json(routes));
    return listen.call(this, port, '127.0.0.1', callback);
};
