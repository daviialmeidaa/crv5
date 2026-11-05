const http = require('http');
const https = require('https');

// Não repetir chamadas: isso pode duplicar inclusões da planilha.
function createFastapiProxy({ baseUrl = process.env.FASTAPI_URL || ('http://127.0.0.1:' + (process.env.FASTAPI_PORT || 8000)), timeout = 30000 } = {}) {
    const base = new URL(baseUrl);
    if (!['http:', 'https:'].includes(base.protocol)) throw new Error('FASTAPI_URL deve usar HTTP ou HTTPS');
    const transport = base.protocol === 'https:' ? https : http;
    return (req, res) => {
        const body = req.body === undefined ? null : Buffer.from(JSON.stringify(req.body));
        const target = new URL(req.originalUrl, base);
        const headers = { ...req.headers, host: target.host };
        delete headers['transfer-encoding'];
        delete headers.connection;
        if (body) {
            delete headers['content-encoding'];
            headers['content-type'] = 'application/json';
            headers['content-length'] = body.length;
        } else delete headers['content-length'];
        const upstream = transport.request(target, { method: req.method, headers, timeout }, response => {
            res.statusCode = response.statusCode;
            for (const [name, value] of Object.entries(response.headers)) {
                if (!['connection', 'transfer-encoding', 'content-length'].includes(name) && value !== undefined) res.setHeader(name, value);
            }
            response.on('error', () => res.destroy());
            response.pipe(res);
        });
        upstream.on('timeout', () => upstream.destroy(new Error('FastAPI timeout')));
        upstream.on('error', err => {
            console.error('Falha na conexão com FastAPI:', err.code || err.message);
            if (!res.headersSent && !res.destroyed) res.status(502).json({ error: 'Serviço da API temporariamente indisponível.' });
            else res.destroy();
        });
        res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
        upstream.end(body);
    };
}

module.exports = { createFastapiProxy };
