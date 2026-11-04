require('dotenv').config();
const { spawn } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');
const { resolveFastapiRuntime } = require('../services/fastapiRuntime');
const root = path.resolve(__dirname, '..');
const venvPython = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const python = process.env.FASTAPI_PYTHON || (existsSync(venvPython) ? venvPython : 'python3');
const children = new Set();
let stopping = false;
let exitCode = 0;

function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    exitCode = code;
    for (const child of children) child.kill('SIGTERM');
    if (!children.size) process.exit(exitCode);
    const timer = setTimeout(() => { for (const child of children) child.kill('SIGKILL'); }, 5000);
    timer.unref();
}

function startChild(command, args) {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', env: process.env });
    children.add(child);
    child.on('error', err => { console.error('Falha ao iniciar serviço:', err.message); children.delete(child); stop(1); });
    child.on('exit', code => {
        children.delete(child);
        if (!stopping) stop(code || 1);
        if (stopping && !children.size) process.exit(exitCode);
    });
    return child;
}

async function main() {
    const runtime = await resolveFastapiRuntime();
    if (stopping) return;
    // Os dois filhos recebem o mesmo destino, inclusive na seleção automática.
    process.env.FASTAPI_PORT = String(runtime.port);
    process.env.FASTAPI_URL = runtime.url;
    if (runtime.fallback) console.log('[Hub] Porta 8000 ocupada; selecionada outra porta interna livre.');
    console.log('[Hub] FastAPI interna: ' + runtime.url);
    const api = startChild(python, ['-m', 'uvicorn', 'hub_api.main:app', '--host', '127.0.0.1', '--port', String(runtime.port), '--workers', '1']);
    const deadline = Date.now() + 30000;
    while (!stopping && Date.now() < deadline) {
        try {
            const response = await fetch(new URL('/api/health', runtime.url), { signal: AbortSignal.timeout(1000) });
            const health = response.ok ? await response.json() : null;
            if (health?.service === 'nexomed-api' && health.pid === api.pid && api.exitCode === null) {
                startChild(process.execPath, ['server.js']);
                return;
            }
        } catch (_) { /* Aguarda a inicialização da API. */ }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!stopping) { console.error('FastAPI não iniciou em 30 segundos.'); stop(1); }
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
process.on('SIGHUP', () => stop());
main().catch(err => { console.error(err.message); stop(1); });
