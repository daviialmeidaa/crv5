const { spawnSync } = require('child_process');
const path = require('path');
const { test, expect, runtime } = require('./support/fixtures.cjs');

test('Importacao Access: conciliar, preservar Hub, repetir sem duplicar e reverter lote', async () => {
    const root = path.resolve(__dirname, '../..');
    const run = spawnSync(path.join(root, '.venv/bin/python'), ['tests/integration/agenda_access_import.py'], {
        cwd: root, encoding: 'utf8', timeout: 45000,
        env: { ...process.env, PYTHONPATH: root, DATABASE_URL: '',
            PG_HOST: runtime.pg.host, PG_PORT: String(runtime.pg.port),
            PG_USER: runtime.pg.user, PG_PASSWORD: runtime.pg.password, PG_DATABASE: runtime.pg.database }
    });
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(run.stderr).toContain('Ran 3 tests');
});
