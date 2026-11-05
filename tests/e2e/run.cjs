const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const { Client } = require('pg');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'test-results/e2e');
fs.mkdirSync(output, { recursive: true });
const envHash = () =>
    fs.existsSync(root + '/.env')
        ? crypto
              .createHash('sha256')
              .update(fs.readFileSync(root + '/.env'))
              .digest('hex')
        : null;
const originalEnvHash = envHash();
const containers = [],
    children = [];
const runtime = {
    password: crypto.randomBytes(18).toString('hex'),
    key: crypto.randomBytes(24).toString('hex'),
    mailbox: output + '/mailbox.jsonl',
    externalLog: output + '/external.jsonl'
};
const lockFile = output + '/run.lock';
let lockOwned = false;
function acquireLock() {
    if (fs.existsSync(lockFile)) {
        const pid = Number(fs.readFileSync(lockFile, 'utf8'));
        if (!Number.isInteger(pid) || pid < 1) throw new Error('Lock E2E invalido: ' + lockFile);
        try {
            process.kill(pid, 0);
            throw new Error('Outra execucao E2E esta em andamento.');
        } catch (error) {
            if (error.code !== 'ESRCH') throw error;
            fs.unlinkSync(lockFile);
        }
    }
    const fd = fs.openSync(lockFile, 'wx');
    fs.writeFileSync(fd, String(process.pid));
    fs.closeSync(fd);
    lockOwned = true;
}
function docker(args) {
    const p = spawnSync('docker', args, { encoding: 'utf8' });
    if (p.status) throw new Error('docker ' + args[0] + ': ' + p.stderr.trim());
    return p.stdout.trim();
}
async function freePort() {
    return new Promise((resolve, reject) => {
        const s = net.createServer();
        s.on('error', reject);
        s.listen(0, '127.0.0.1', () => {
            const port = s.address().port;
            s.close(() => resolve(port));
        });
    });
}
async function waitFor(fn, label) {
    for (let n = 0; n < 100; n++) {
        try {
            if (await fn()) return;
        } catch {}
        await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error('Timeout: ' + label);
}
async function cleanup() {
    for (const child of children) child.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 1200));
    for (const child of children) if (child.exitCode === null) child.kill('SIGKILL');
    for (const name of containers.reverse()) docker(['rm', '-f', name]);
    if (lockOwned) {
        fs.unlinkSync(lockFile);
        lockOwned = false;
    }
    if (envHash() !== originalEnvHash) throw new Error('.env alterado durante os testes');
}
async function main() {
    acquireLock();
    for (const file of [runtime.mailbox, runtime.externalLog]) fs.writeFileSync(file, '', { mode: 0o600 });
    const suffix = crypto.randomBytes(4).toString('hex');
    const pgName = 'nexomed-e2e-pg-' + suffix,
        redisName = 'nexomed-e2e-redis-' + suffix;
    for (const [name, image, args] of [
        [
            pgName,
            'postgres:15-alpine',
            [
                '-e',
                'POSTGRES_DB=nexomed_qa',
                '-e',
                'POSTGRES_USER=nexomed_qa',
                '-e',
                'POSTGRES_PASSWORD=' + runtime.password,
                '-p',
                '127.0.0.1::5432'
            ]
        ],
        [redisName, 'redis:7-alpine', ['-p', '127.0.0.1::6379']]
    ]) {
        const command = image.startsWith('redis')
            ? [
                  'redis-server',
                  '--save',
                  '',
                  '--appendonly',
                  'no',
                  '--maxmemory',
                  '30mb',
                  '--maxmemory-policy',
                  'volatile-lru'
              ]
            : [];
        docker([
            'run',
            '--rm',
            '-d',
            '--name',
            name,
            '--label',
            'nexomed.e2e=true',
            ...args,
            image,
            ...command
        ]);
        containers.push(name);
    }
    const portOf = (name, port) => Number(docker(['port', name, port]).split(':').at(-1));
    runtime.pg = {
        host: '127.0.0.1',
        port: portOf(pgName, '5432'),
        user: 'nexomed_qa',
        password: runtime.password,
        database: 'nexomed_qa'
    };
    runtime.redisUrl = 'redis://127.0.0.1:' + portOf(redisName, '6379');
    runtime.url = 'http://127.0.0.1:' + (await freePort());
    runtime.apiPort = await freePort();
    const runtimeFile = output + '/runtime.json';
    fs.writeFileSync(runtimeFile, JSON.stringify(runtime), { mode: 0o600 });
    await waitFor(async () => {
        const c = new Client({ ...runtime.pg, connectionTimeoutMillis: 500 });
        try {
            await c.connect();
            return true;
        } finally {
            await c.end();
        }
    }, 'PostgreSQL descartavel');
    const c = new Client(runtime.pg);
    await c.connect();
    try {
        await require('./support/seed.cjs')(c, runtime);
    } finally {
        await c.end();
    }
    const isolatedEnv = { ...process.env };
    // Override .env values in child processes without editing or exposing .env.
    if (fs.existsSync(root + '/.env'))
        for (const key of Object.keys(require('dotenv').parse(fs.readFileSync(root + '/.env'))))
            isolatedEnv[key] = '';
    Object.assign(isolatedEnv, {
        NODE_ENV: 'test',
        HUB_E2E: '1',
        HUB_E2E_RUNTIME_FILE: runtimeFile,
        DATABASE_URL: '',
        PG_HOST: runtime.pg.host,
        PG_PORT: String(runtime.pg.port),
        PG_USER: runtime.pg.user,
        PG_PASSWORD: runtime.password,
        PG_DATABASE: runtime.pg.database,
        REDISCLOUD_URL: runtime.redisUrl,
        JWT_SECRET: crypto.randomBytes(24).toString('hex'),
        VBA_API_KEY: runtime.key,
        PORT: new URL(runtime.url).port,
        FASTAPI_PORT: String(runtime.apiPort),
        FASTAPI_URL: 'http://127.0.0.1:' + runtime.apiPort,
        NODE_OPTIONS: '--require=' + path.join(__dirname, 'support/external-services.cjs')
    });
    const log = fs.openSync(output + '/hub.log', 'w');
    const hub = spawn(process.execPath, ['scripts/start_hub.js'], {
        cwd: root,
        env: isolatedEnv,
        stdio: ['ignore', log, log]
    });
    children.push(hub);
    await waitFor(async () => {
        if (hub.exitCode !== null) throw Error('Hub terminou');
        const r = await fetch(runtime.url + '/api/auth/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}'
        });
        return r.status === 400;
    }, 'Hub e FastAPI (consulte test-results/e2e/hub.log)');
    console.log('Hub, FastAPI, PostgreSQL e Redis reais iniciados em ambiente descartavel.');
    const testEnv = { ...process.env, HUB_E2E_RUNTIME_FILE: runtimeFile };
    const pw = spawn(
        process.execPath,
        [
            require.resolve('@playwright/test/cli'),
            'test',
            '--config',
            path.join(__dirname, 'playwright.config.cjs'),
            ...process.argv.slice(2)
        ],
        { cwd: root, env: testEnv, stdio: 'inherit' }
    );
    children.push(pw);
    process.exitCode = await new Promise((resolve) => {
        pw.on('exit', (code) => resolve(code || 0));
        pw.on('error', () => resolve(1));
    });
}
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, async () => {
        if (stopping) return;
        stopping = true;
        await cleanup();
        process.exit(130);
    });
main()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (!stopping) {
            stopping = true;
            await cleanup();
        }
    });
