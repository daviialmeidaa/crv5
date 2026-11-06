const { test, expect, runtime, auth } = require('./support/fixtures.cjs');

test('VBA consolidado: JSON UTF-8 completo, vazio distinto de zero, PUT e DELETE', async ({ request, db }) => {
    const headers = { 'x-api-key': runtime.key, 'Content-Type': 'application/json; charset=utf-8' };
    const payload = {
        empresa: 'BML', pregao: '000000000000000065', modalidade: 'Pregão Eletrônico',
        orgao: "Hospital Fictício D'Ávila", uf: 'SP', categoria: 'Descartável',
        objeto: 'Curativos \\ materiais', portal: 'Portal QA', observacoes_status: 'CADASTRADO',
        data_cadastro: '30/10/2026', data_limite: '05/11/2026', hora_limite: '',
        data_lances: '05/11/2026', hora_lances: '09:00:00', antecedencia: '5'
    };
    const hubHeaders = await auth(request);
    let key;
    try {
        const created = await request.post('/api/vba/agenda_licitacoes', {
            headers, data: Buffer.from(JSON.stringify(payload), 'utf8')
        });
        expect(created.status(), await created.text()).toBe(201);
        key = (await created.json()).CHAVE;
        expect(typeof key).toBe('string');
        const stored = (await db.query(`SELECT empresa,pregao,modalidade,orgao,categoria,objeto,
            data_cadastro::text,data_limite::text,data_lances::text,hora_limite::text,hora_lances::text,antecedencia
            FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE"=$1`, [key])).rows[0];
        expect(stored).toMatchObject({ empresa: 'BML', pregao: payload.pregao,
            modalidade: payload.modalidade, orgao: payload.orgao, categoria: payload.categoria,
            objeto: payload.objeto, data_cadastro: '2026-10-30', data_limite: '2026-11-05',
            data_lances: '2026-11-05', hora_limite: null, hora_lances: '09:00:00', antecedencia: 5 });
        const changed = { ...payload, objeto: '', hora_lances: '00:00:00', antecedencia: '0',
            observacoes_status: 'PERDEMOS NO PREÇO' };
        const updated = await request.put('/api/vba/agenda_licitacoes/' + key, {
            headers, data: Buffer.from(JSON.stringify(changed), 'utf8')
        });
        expect(updated.status(), await updated.text()).toBe(200);
        const hub = await request.get('/api/agenda_licitacoes/' + key, { headers: hubHeaders });
        expect(hub.status()).toBe(200);
        expect(await hub.json()).toMatchObject({ orgao: payload.orgao, categoria: payload.categoria,
            objeto: '', hora_limite: null, hora_lances: '00:00:00', antecedencia: 0,
            observacoes_status: 'PERDEMOS NO PREÇO' });
        const list = await request.get('/api/vba/agenda_licitacoes?empresa=BML', { headers });
        expect(list.status()).toBe(200);
        expect((await list.json()).find((row) => row.CHAVE === key)).toMatchObject({
            pregao: payload.pregao, orgao: payload.orgao, hora_limite: null,
            hora_lances: '00:00:00', antecedencia: 0
        });
        const deleted = await request.delete('/api/vba/agenda_licitacoes/' + key, { headers });
        expect(deleted.status(), await deleted.text()).toBe(200);
        expect((await db.query('SELECT "CHAVE" FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE"=$1', [key])).rows).toEqual([]);
        expect((await request.delete('/api/vba/agenda_licitacoes/' + key, { headers })).status()).toBe(404);
    } finally {
        if (key) await db.query('DELETE FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE"=$1', [key]);
    }
});
