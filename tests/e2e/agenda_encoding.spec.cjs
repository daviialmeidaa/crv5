const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { test, expect, runtime } = require('./support/fixtures.cjs');

test('Agenda: auditoria sem escrita, reparo com backup e rollback em conflito', async ({ db }, testInfo) => {
    const root = path.resolve(__dirname, '../..');
    const output = testInfo.outputPath('encoding');
    fs.mkdirSync(output, { recursive: true });
    const run = (...args) => spawnSync(path.join(root, '.venv/bin/python'),
        ['-m', 'scripts.fix_agenda_encoding', ...args], {
            cwd: root, encoding: 'utf8',
            env: { ...process.env, DATABASE_URL: '', PG_HOST: runtime.pg.host,
                PG_PORT: String(runtime.pg.port), PG_USER: runtime.pg.user,
                PG_PASSWORD: runtime.pg.password, PG_DATABASE: runtime.pg.database }
        });
    const original = 'Pregão Eletrônico';
    const broken = Buffer.from(original, 'utf8').toString('latin1');
    const inserted = await db.query(`INSERT INTO agenda_licitacoes."AGENDA_LICITACOES"
        (empresa, pregao, modalidade, categoria, observacoes_status)
        VALUES ('NEXOMED', 'QA-ENCODING', $1, $2, $3) RETURNING "CHAVE"`,
        [broken, Buffer.from('Descartável').toString('latin1'), 'PERDEMOS NO PREÇO']);
    const key = String(inserted.rows[0].CHAVE);
    const report = path.join(output, 'plan.json');
    const backup = path.join(output, 'backup.json');
    try {
        const audit = run('--report', report);
        expect(audit.status, audit.stderr).toBe(0);
        const plan = JSON.parse(fs.readFileSync(report));
        expect(plan.changes.filter((c) => c.CHAVE === key).map((c) => c.field).sort())
            .toEqual(['categoria', 'modalidade']);
        expect((await db.query('SELECT modalidade FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE"=$1', [key])).rows[0].modalidade).toBe(broken);
        expect(fs.statSync(report).mode & 0o777).toBe(0o600);
        // O primeiro campo seria corrigido; o conflito no segundo deve desfazer tudo.
        await db.query('UPDATE agenda_licitacoes."AGENDA_LICITACOES" SET categoria=$1 WHERE "CHAVE"=$2', ['Edicao concorrente', key]);
        const failed = run('--apply', report, '--backup', path.join(output, 'failed-backup.json'));
        expect(failed.status).not.toBe(0);
        expect((await db.query('SELECT modalidade FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE"=$1', [key])).rows[0].modalidade).toBe(broken);
        await db.query('UPDATE agenda_licitacoes."AGENDA_LICITACOES" SET categoria=$1 WHERE "CHAVE"=$2', [Buffer.from('Descartável').toString('latin1'), key]);
        const applied = run('--apply', report, '--backup', backup);
        expect(applied.status, applied.stderr).toBe(0);
        expect(JSON.parse(fs.readFileSync(backup))).toEqual(plan);
        expect(fs.statSync(backup).mode & 0o777).toBe(0o600);
        const fixed = (await db.query('SELECT modalidade,categoria,observacoes_status FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE"=$1', [key])).rows[0];
        expect(fixed).toEqual({ modalidade: original, categoria: 'Descartável', observacoes_status: 'PERDEMOS NO PREÇO' });
        const after = path.join(output, 'after.json');
        expect(run('--report', after).status).toBe(0);
        expect(JSON.parse(fs.readFileSync(after)).changes.filter((c) => c.CHAVE === key)).toEqual([]);
    } finally {
        await db.query('DELETE FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE"=$1', [key]);
    }
});
