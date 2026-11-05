const net = require('net');

function availablePort(port) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
            const selected = server.address().port;
            server.close(err => err ? reject(err) : resolve(selected));
        });
    });
}

async function resolveFastapiRuntime({ env = process.env, defaultPort = 8000 } = {}) {
    const explicitUrl = env.FASTAPI_URL ? new URL(env.FASTAPI_URL) : null;
    if (explicitUrl && (explicitUrl.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(explicitUrl.hostname))) {
        throw new Error('A inicialização conjunta exige FASTAPI_URL HTTP local (127.0.0.1 ou localhost).');
    }
    const urlPort = explicitUrl ? Number(explicitUrl.port || 80) : null;
    const preferred = env.FASTAPI_PORT ? Number(env.FASTAPI_PORT) : (urlPort || defaultPort);
    if (!Number.isInteger(preferred) || preferred < 1 || preferred > 65535) {
        throw new Error('FASTAPI_PORT deve ser uma porta inteira entre 1 e 65535.');
    }
    if (urlPort && urlPort !== preferred) {
        throw new Error('FASTAPI_URL e FASTAPI_PORT devem indicar a mesma porta interna.');
    }
    let port;
    try {
        port = await availablePort(preferred);
    } catch (err) {
        if (err.code !== 'EADDRINUSE') throw err;
        if (env.FASTAPI_PORT || explicitUrl) {
            throw new Error('A porta interna FastAPI ' + preferred + ' está ocupada. Defina FASTAPI_PORT com uma porta livre ou remova a configuração para seleção automática.');
        }
        port = await availablePort(0);
    }
    return { port, url: 'http://127.0.0.1:' + port, fallback: port !== preferred };
}

module.exports = { resolveFastapiRuntime };
