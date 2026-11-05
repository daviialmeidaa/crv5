const fs = require('fs'),
    path = require('path'),
    { spawnSync } = require('child_process');
const { test, expect, runtime } = require('./support/fixtures.cjs');
function run(job) {
    const root = path.resolve(__dirname, '../..'),
        env = { ...process.env };
    if (fs.existsSync(root + '/.env'))
        for (const key of Object.keys(require('dotenv').parse(fs.readFileSync(root + '/.env'))))
            env[key] = '';
    Object.assign(env, {
        HUB_E2E: '1',
        HUB_E2E_RUNTIME_FILE: process.env.HUB_E2E_RUNTIME_FILE,
        NODE_ENV: 'test',
        DATABASE_URL: '',
        PG_HOST: runtime.pg.host,
        PG_PORT: String(runtime.pg.port),
        PG_USER: runtime.pg.user,
        PG_PASSWORD: runtime.password,
        PG_DATABASE: runtime.pg.database
    });
    const child = spawnSync(
        process.execPath,
        [
            '--require',
            path.join(__dirname, 'support/external-services.cjs'),
            path.join(__dirname, 'support/run-job.cjs'),
            job
        ],
        { env, encoding: 'utf8', timeout: 15000 }
    );
    expect(child.status, child.stdout + '\n' + child.stderr).toBe(0);
}

test('Job Agenda: consulta agendamentos, gera notificacao e email local sem duplicar lembrete', async ({
    db
}) => {
    await db.query(`INSERT INTO agenda_licitacoes."AGENDA_LICITACOES" (empresa,pregao,orgao,data_lances,hora_lances)
        VALUES ('NEXOMED','QA-JOB-AGENDA','Hospital QA',CURRENT_DATE+1,'09:00')`);
    run('agenda');
    run('agenda');
    expect(
        (
            await db.query(
                "SELECT * FROM notifications WHERE module='AGENDA' AND action LIKE 'REMINDER_%' AND message LIKE '%QA-JOB-AGENDA%'"
            )
        ).rowCount
    ).toBe(1);
    const emails = fs
        .readFileSync(runtime.mailbox, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    expect(emails.some((mail) => mail.html?.includes('QA-JOB-AGENDA'))).toBe(true);
});

test('Job Cobranca: busca agendamento com joins e persiste notificacao do usuario', async ({ db }) => {
    await db.query(`INSERT INTO historico_cobranca (codigo_cliente,tipo_contato,descritivo_contato,agendamento_data_contato,
        agendamento_hora_contato,agendamento_nota_contato,has_agendamento,created_by)
        VALUES ('900001','LIGACAO','QA-JOB-COBRANCA',CURRENT_DATE,'09:30','QA-JOB-COBRANCA',true,1)`);
    run('cobranca');
    expect(
        (
            await db.query(
                "SELECT * FROM notifications WHERE module='COBRANCA' AND created_by=1 AND message LIKE '%QA-JOB-COBRANCA%'"
            )
        ).rowCount
    ).toBeGreaterThan(0);
    const emails = fs
        .readFileSync(runtime.mailbox, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    expect(emails.some((mail) => mail.html?.includes('QA-JOB-COBRANCA'))).toBe(true);
});
