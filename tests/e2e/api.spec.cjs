const { test, expect, runtime, auth } = require('./support/fixtures.cjs');

test('API: autenticacao real, usuario inativo e bloqueio de permissao', async ({ request, db }) => {
    expect((await request.get('/api/agenda_licitacoes')).status()).toBe(401);
    expect(
        (
            await request.post('/api/auth/login', {
                data: { email: 'admin@example.invalid', password: 'incorreta' }
            })
        ).status()
    ).toBe(401);
    expect(
        (
            await request.post('/api/auth/login', {
                data: { email: 'inactive@example.invalid', password: runtime.password }
            })
        ).status()
    ).toBe(403);
    const headers = await auth(request, 'reader@example.invalid');
    expect(
        (
            await request.post('/api/opme/contratos', {
                headers,
                data: { id_contrato: 'PROIBIDO', cliente: 'QA' }
            })
        ).status()
    ).toBe(403);
    expect(
        (await db.query("SELECT count(*)::int AS count FROM opme.contratos WHERE id_contrato='PROIBIDO'"))
            .rows[0].count
    ).toBe(0);
});

test('FastAPI e Hub: criar, ler, alterar e excluir na mesma base PostgreSQL', async ({ request, db }) => {
    const headers = await auth(request),
        vba = { 'x-api-key': runtime.key };
    const payload = {
        empresa: 'NEXOMED',
        pregao: 'QA-VBA',
        orgao: 'Hospital QA',
        data_lances: '05/11/2026',
        hora_lances: '0.5'
    };
    expect((await request.get('/api/vba/agenda_licitacoes')).status()).toBe(401);
    const created = await request.post('/api/vba/agenda_licitacoes', { headers: vba, data: payload });
    expect(created.status(), await created.text()).toBe(201);
    const id = (await created.json()).CHAVE;
    expect(
        (
            await db.query(
                'SELECT hora_lances::text AS hora FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE"=$1',
                [id]
            )
        ).rows[0].hora
    ).toBe('12:00:00');
    const hub = await request.get('/api/agenda_licitacoes/' + id, { headers });
    expect(hub.status()).toBe(200);
    const row = await hub.json();
    row.pregao = 'QA-VBA-EDITADO';
    row.data_lances = '2026-11-06';
    expect((await request.put('/api/agenda_licitacoes/' + id, { headers, data: row })).status()).toBe(200);
    const list = await request.get('/api/vba/agenda_licitacoes', { headers: vba });
    expect((await list.json()).find((r) => String(r.CHAVE) === String(id)).pregao).toBe('QA-VBA-EDITADO');
    expect((await request.delete('/api/vba/agenda_licitacoes/' + id, { headers: vba })).status()).toBe(200);
    expect((await request.get('/api/agenda_licitacoes/' + id, { headers })).status()).toBe(404);
    expect(
        (
            await db.query(
                'SELECT count(*)::int AS count FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE"=$1',
                [id]
            )
        ).rows[0].count
    ).toBe(0);
    expect(
        (await db.query("SELECT count(*)::int AS count FROM notifications WHERE message LIKE '%QA-VBA%'"))
            .rows[0].count
    ).toBeGreaterThan(0);
});

test('Cirurgias: transacao reverte o lote inteiro quando um item e invalido', async ({ request, db }) => {
    const headers = await auth(request);
    const response = await request.post('/api/opme/cirurgias', {
        headers,
        data: {
            items: [
                { contrato: 'QA-SEED', paciente: 'QA-ROLLBACK', cod_bio: 710100, quantidade_utilizada: 1 },
                { contrato: 'QA-SEED', paciente: 'QA-ROLLBACK', cod_bio: 'nao-numerico' }
            ]
        }
    });
    expect(response.status()).toBe(500);
    expect(
        (await db.query("SELECT count(*)::int AS count FROM opme.cirurgias WHERE paciente='QA-ROLLBACK'"))
            .rows[0].count
    ).toBe(0);
    // A subsequent transaction must work: the connection was released after rollback.
    const valid = await request.post('/api/opme/cirurgias', {
        headers,
        data: {
            items: [
                {
                    contrato: 'QA-SEED',
                    paciente: 'QA-APOS-ROLLBACK',
                    cod_bio: 710101,
                    quantidade_utilizada: 1,
                    valor_unitario: 0,
                    valor_total: 0
                }
            ]
        }
    });
    expect(valid.status()).toBe(200);
    const id = (await valid.json()).id;
    expect(
        (
            await request.post('/api/opme/cirurgias/batch-delete', {
                headers,
                data: { ids: [id], contrato: 'QA-SEED' }
            })
        ).status()
    ).toBe(200);
});

for (const hospital of [false, true])
    test(
        'Saldo ' + (hospital ? 'hospital' : 'ata') + ': lotes concorrentes nao compartilham transacoes',
        async ({ request, db }) => {
            const table = hospital ? 'saldoatahospital' : 'saldoata',
                route = '/api/opme/' + (hospital ? 'saldo-ata-hospital' : 'saldo-ata');
            const headers = await auth(request);
            // Slow only our synthetic rows, allowing two users' transactions to overlap.
            await db.query(`CREATE OR REPLACE FUNCTION opme.qa_slow_insert() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.item_ata LIKE 'QA-TX-%' THEN PERFORM pg_sleep(0.05); END IF; RETURN NEW; END $$`);
            await db.query(
                'CREATE TRIGGER qa_slow BEFORE INSERT ON opme.' +
                    table +
                    ' FOR EACH ROW EXECUTE FUNCTION opme.qa_slow_insert()'
            );
            try {
                // More requests than pg.Pool's default 10 connections: queries must not
                // move into another request's transaction when the pool is saturated.
                const outcomes = await Promise.all(
                    Array.from({ length: 24 }, async (_, i) => {
                        const valid = i % 2 === 0,
                            prefix = 'QA-TX-' + i + '-';
                        const item = (suffix, quantity) => ({
                            contrato: 'QA-SEED',
                            unidade: 'HQA',
                            item_ata: prefix + suffix,
                            quantidade_ata: quantity,
                            valor_unitario: 1,
                            valor_total: 1
                        });
                        const response = await request.post(route, {
                            headers,
                            data: { items: [item('1', 1), item('2', valid ? 2 : 'invalido')] }
                        });
                        return { valid, prefix, status: response.status() };
                    })
                );
                for (const { valid, prefix, status } of outcomes) {
                    expect(status).toBe(valid ? 200 : 500);
                    const rows = (
                        await db.query('SELECT item_ata FROM opme.' + table + ' WHERE item_ata LIKE $1', [
                            prefix + '%'
                        ])
                    ).rows
                        .map((r) => r.item_ata)
                        .sort();
                    expect(rows).toEqual(valid ? [prefix + '1', prefix + '2'] : []);
                }
            } finally {
                await db.query('DROP TRIGGER qa_slow ON opme.' + table);
                await db.query('DELETE FROM opme.' + table + " WHERE item_ata LIKE 'QA-TX-%'");
            }
        }
    );

test('Notificacoes: escrita na FastAPI atualiza SSE do Hub e persiste leitura', async ({ request, db }) => {
    const headers = await auth(request),
        controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
        const stream = await fetch(runtime.url + '/api/notifications/stream', {
            headers: { ...headers, Accept: 'text/event-stream' },
            signal: controller.signal
        });
        expect(stream.headers.get('content-type')).toContain('text/event-stream');
        const reader = stream.body.getReader();
        await reader.read(); // initial snapshot
        const response = await request.post('/api/vba/agenda_licitacoes', {
            headers: { 'x-api-key': runtime.key },
            data: { empresa: 'BML', pregao: 'QA-SSE-PYTHON' }
        });
        expect(response.status()).toBe(201);
        const key = (await response.json()).CHAVE;
        let text = '';
        while (!text.includes('QA-SSE-PYTHON')) {
            const chunk = await reader.read();
            if (chunk.done) throw Error('SSE encerrou antes do refresh');
            text += Buffer.from(chunk.value).toString();
        }
        const notification = (
            await db.query(
                "SELECT id FROM notifications WHERE message LIKE '%QA-SSE-PYTHON%' ORDER BY id DESC LIMIT 1"
            )
        ).rows[0];
        expect(
            (
                await request.post('/api/notifications/read', {
                    headers,
                    data: { notificationId: notification.id }
                })
            ).status()
        ).toBe(200);
        expect(
            (
                await db.query('SELECT * FROM notification_reads WHERE notification_id=$1 AND user_id=1', [
                    notification.id
                ])
            ).rowCount
        ).toBe(1);
        await request.delete('/api/vba/agenda_licitacoes/' + key, { headers: { 'x-api-key': runtime.key } });
    } finally {
        clearTimeout(timer);
        controller.abort();
    }
});
