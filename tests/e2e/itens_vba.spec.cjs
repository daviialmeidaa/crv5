const { test, expect, runtime, auth, login } = require('./support/fixtures.cjs');
const { createClient } = require('redis');

for (const empresa of ['BML', 'NEXOMED']) test('VBA Itens ' + empresa + ': CRUD cruzado, status, decimais e contratos', async ({ request, db }) => {
    const headers = { 'x-api-key': runtime.key };
    const hubHeaders = await auth(request);
    const base = '/api/vba/itens_arrematados/' + empresa;
    const table = empresa === 'BML' ? 'IA_BML' : 'IA_NEXOMED';
    const code = empresa + '-QA-VBA';
    expect((await request.get(base)).status()).toBe(401);
    expect((await request.get(base, { headers: { 'x-api-key': 'invalid' } })).status()).toBe(403);
    const cache = createClient({ url: runtime.redisUrl });
    await cache.connect();
    try {
        await cache.set('cr:titulos', JSON.stringify([{ codigo_contrato: 'QA-STALE' }]));
        const created = await request.post(base, { headers, data: {
            COD_CONTRATO_CONCAT: code, COD_CONTRATO: '123', PARTICIPANTE: empresa,
            ORGAO: 'Hospital São José', MATERIAL: 'Prótese "especial" \\ teste',
            QTDE: '0', VALOR_UNITARIO: '0,123456789', VALOR_TOTAL: '0', TOTAL_NORMALIZADO: 'AVALIAÇÃO INDIVIDUAL',
            DATA_PREGAO: '07/11/2026', DATA_PROPOSTA: '', DATA_INICIO: 'SEM DEFINIÇÃO',
            COD_STATUS: '0', EDITAL: '001/2026', TIPO_CONTRATO: 'R. Vendas', CLASSIFICACAO: 'OPME'
        }});
        expect(created.status(), await created.text()).toBe(201);
        const item = await created.json(), key = item.CHAVE;
        const participant = empresa === 'BML' ? 'BML HOSPITALAR' : 'NEXOMED';
        expect(item.PARTICIPANTE).toBe(participant);
        expect((await db.query('SELECT "PARTICIPANTE" FROM itens_arrematados."' + table + '" WHERE "CHAVE"=$1', [key])).rows[0].PARTICIPANTE).toBe(participant);
        expect(typeof key).toBe('string');
        expect(item.COD_STATUS).toBe('0');
        expect(item.CODIGO_STATUS).toBe(0);
        expect(item.VALOR_UNITARIO).toBe('0.123456789');
        expect(item.QTDE).toBe(0);
        expect(item.DATA_PROPOSTA).toBeNull();
        expect(item.DATA_INICIO).toBe('SEM DEFINIÇÃO');
        expect(await cache.get('cr:titulos')).toBeNull();
        expect((await db.query('SELECT * FROM itens_arrematados."UNIQUE_TBL" WHERE "COD_CONTRATO_CONCAT"=$1', [code])).rowCount).toBe(1);
        expect((await db.query('SELECT * FROM contratos WHERE codigo_contrato=$1', [code])).rowCount).toBe(1);
        const portal = await request.get('/api/itens_arrematados/' + key + '?participante=' + empresa, { headers: hubHeaders });
        expect(portal.status()).toBe(200);
        expect((await portal.json()).MATERIAL).toBe('Prótese "especial" \\ teste');
        // O portal grava CODIGO_STATUS; COD_STATUS pode ainda conter o valor legado.
        await db.query('UPDATE itens_arrematados."' + table + '" SET "CODIGO_STATUS"=3 WHERE "CHAVE"=$1', [key]);
        expect((await (await request.get(base + '/' + key, { headers })).json()).COD_STATUS).toBe('3');
        const updated = await request.put(base + '/' + key, { headers, data: { EDITAL: '002/2026', CODIGO_STATUS: 2 }});
        expect(updated.status(), await updated.text()).toBe(200);
        expect((await updated.json()).MATERIAL).toBe(item.MATERIAL);
        expect((await updated.json()).COD_STATUS).toBe('2');
        const cleared = await request.put(base + '/' + key, { headers, data: { DATA_INICIO: null } });
        expect(cleared.status(), await cleared.text()).toBe(200);
        expect((await cleared.json()).DATA_INICIO).toBeNull();
        expect((await cleared.json()).MATERIAL).toBe(item.MATERIAL);
        expect((await db.query('SELECT edital FROM contratos WHERE codigo_contrato=$1', [code])).rows[0].edital).toBe('002/2026');
        const before = (await db.query("SELECT count(*)::int AS n FROM notifications WHERE module='ITENS_ARREMATADOS'")).rows[0].n;
        expect((await request.put(base + '/' + key, { headers, data: { VALOR_UNITARIO: '0.1234567890' } })).status()).toBe(200);
        expect((await db.query("SELECT count(*)::int AS n FROM notifications WHERE module='ITENS_ARREMATADOS'")).rows[0].n).toBe(before);
        const listed = await request.get(base, { headers });
        expect((await listed.json()).find(r => r.CHAVE === key).COD_STATUS).toBe('2');
        expect((await request.delete(base + '/' + key, { headers })).status()).toBe(200);
        expect((await db.query('SELECT * FROM itens_arrematados."' + table + '" WHERE "CHAVE"=$1', [key])).rowCount).toBe(0);
        expect((await db.query('SELECT * FROM contratos WHERE codigo_contrato=$1', [code])).rowCount).toBe(1);
        expect((await request.delete(base + '/' + key, { headers })).status()).toBe(404);
    } finally { await cache.quit(); }
});

for (const empresa of ['BML', 'NEXOMED']) test('VBA Itens ' + empresa + ': participante no modal e compatibilidade com registro legado', async ({ request, page, db }) => {
    const headers = { 'x-api-key': runtime.key }, hubHeaders = await auth(request);
    const base = '/api/vba/itens_arrematados/' + empresa;
    const participant = empresa === 'BML' ? 'BML HOSPITALAR' : 'NEXOMED';
    const table = 'itens_arrematados."IA_' + empresa + '"';
    const code = (empresa === 'BML' ? 'BML' : 'BIO') + 'QA-PARTICIPANTE';
    // Reproduz a gravacao anterior: BML abreviada e Nexomed com espacos/caixa mista.
    const legacy = empresa === 'BML' ? 'BML' : ' Nexomed ';
    const key = (await db.query('INSERT INTO ' + table + ' ("PARTICIPANTE","COD_CONTRATO_CONCAT","COD_CONTRATO","MATERIAL") VALUES ($1,$2,123,$3) RETURNING "CHAVE"', [legacy, code, 'QA participante legado'])).rows[0].CHAVE;
    const single = await request.get('/api/itens_arrematados/' + key + '?participante=' + empresa, { headers: hubHeaders });
    expect((await single.json()).PARTICIPANTE).toBe(participant);
    const listed = await request.get('/api/itens_arrematados?participante=' + empresa, { headers: hubHeaders });
    expect((await listed.json()).find(row => row.CHAVE === key).PARTICIPANTE).toBe(participant);
    expect((await (await request.get(base + '/' + key, { headers })).json()).PARTICIPANTE).toBe(participant);
    await login(page);
    await page.goto('/itens_arrematados');
    if (empresa === 'BML') await page.locator('#tabBml').click();
    await page.locator('#iaTableBody tr[data-grid-row]').filter({ hasText: code }).locator('td[data-col="MATERIAL"]').click();
    await expect(page.locator('#itemModal')).toBeVisible();
    await expect(page.locator('#formParticipante')).toHaveValue(participant);
    await expect(page.locator('#formParticipante')).toBeDisabled();
    // Leitura compativel nao modifica o banco. O proximo PUT persiste o nome canonico.
    expect((await db.query('SELECT "PARTICIPANTE" FROM ' + table + ' WHERE "CHAVE"=$1', [key])).rows[0].PARTICIPANTE).toBe(legacy);
    const updated = await request.put(base + '/' + key, { headers, data: { MATERIAL: 'QA participante atualizado' } });
    expect(updated.status(), await updated.text()).toBe(200);
    expect((await updated.json()).PARTICIPANTE).toBe(participant);
    expect((await db.query('SELECT "PARTICIPANTE" FROM ' + table + ' WHERE "CHAVE"=$1', [key])).rows[0].PARTICIPANTE).toBe(participant);
    for (const value of [undefined, '', null, '   ', participant, participant.toLowerCase()]) {
        const data = { MATERIAL: 'QA participante default', PARTICIPANTE: value };
        const created = await request.post(base, { headers, data });
        expect(created.status(), await created.text()).toBe(201);
        expect((await created.json()).PARTICIPANTE).toBe(participant);
    }
    // Valores da outra empresa nao podem redirecionar a gravacao.
    const wrong = empresa === 'BML' ? 'NEXOMED' : 'BML HOSPITALAR';
    expect((await request.post(base, { headers, data: { MATERIAL: 'QA', PARTICIPANTE: wrong } })).status()).toBe(400);
});

test('VBA Itens: validacao e isolamento de empresas com CHAVEs iguais', async ({ request, db }) => {
    const headers = { 'x-api-key': runtime.key }, root = '/api/vba/itens_arrematados';
    const id = '9223372036854775806';
    for (const empresa of ['BML', 'NEXOMED']) {
        await db.query('INSERT INTO itens_arrematados."IA_' + empresa + '" ("CHAVE","MATERIAL","PARTICIPANTE") VALUES ($1,$2,$3)', [id, 'QA-' + empresa, empresa]);
    }
    expect((await request.delete(root + '/BML/' + id, { headers })).status()).toBe(200);
    expect((await request.get(root + '/NEXOMED/' + id, { headers })).status()).toBe(200);
    await expect((await request.get(root + '/NEXOMED/' + id, { headers })).json().then(r => r.CHAVE)).resolves.toBe(id);
    const wholeItem = await (await request.get(root + '/NEXOMED/' + id, { headers })).json();
    const empty = Object.fromEntries(Object.keys(wholeItem).filter(k => k !== 'CHAVE').map(k => [k, null]));
    expect((await request.put(root + '/NEXOMED/' + id, { headers, data: empty })).status()).toBe(400);
    for (const data of [{}, [], null, { MATERIAL: '' }, { QTDE: '1.5' }, { VALOR_TOTAL: 'NaN' },
        { CHAVE: '1', MATERIAL: 'QA' }, { DATA_PREGAO: '31/02/2026' }, { DATA_PREGAO: false, MATERIAL: 'QA' },
        { PARTICIPANTE: 'NEXOMED', MATERIAL: 'QA' }, { COD_STATUS: '1', CODIGO_STATUS: 2 }]) {
        expect((await request.post(root + '/BML', { headers, data })).status()).toBe(400);
    }
    expect((await request.get(root + '/OUTRA', { headers })).status()).toBe(400);
    expect((await request.delete(root + '/BML/not-a-key', { headers })).status()).toBe(400);
    const ml = await request.post(root + '/NEXOMED', { headers, data: { COD_CONTRATO: 998, PARTICIPANTE: 'MEDICAL LIFE', MATERIAL: 'QA' }});
    expect(ml.status(), await ml.text()).toBe(201);
    expect((await ml.json()).COD_CONTRATO_CONCAT).toBe('ML998');
});

test('VBA Itens: UNIQUE e contratos atomicos, concorrencia e rollback', async ({ request, db }) => {
    const headers = { 'x-api-key': runtime.key }, base = '/api/vba/itens_arrematados/BML';
    const code = 'QA-CONCURRENT-ITENS';
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => request.post(base, {
        headers, data: { COD_CONTRATO_CONCAT: code, MATERIAL: 'Produto QA ' + i, EDITAL: 'QA', CLASSIFICACAO: 'OPME' }
    })));
    for (const response of results) expect(response.status(), await response.text()).toBe(201);
    expect((await db.query('SELECT * FROM itens_arrematados."UNIQUE_TBL" WHERE "COD_CONTRATO_CONCAT"=$1', [code])).rowCount).toBe(1);
    await db.query(`CREATE FUNCTION public.qa_itens_contract_failure() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW."COD_CONTRATO_CONCAT"='QA-FAIL-ITENS' THEN RAISE EXCEPTION 'QA rollback'; END IF; RETURN NEW; END $$`);
    await db.query('CREATE TRIGGER qa_itens_failure BEFORE INSERT ON itens_arrematados."UNIQUE_TBL" FOR EACH ROW EXECUTE FUNCTION public.qa_itens_contract_failure()');
    try {
        expect((await request.post(base, { headers, data: { COD_CONTRATO_CONCAT: 'QA-FAIL-ITENS', MATERIAL: 'QA' } })).status()).toBe(500);
        expect((await db.query('SELECT * FROM itens_arrematados."IA_BML" WHERE "COD_CONTRATO_CONCAT"=$1', ['QA-FAIL-ITENS'])).rowCount).toBe(0);
        expect((await db.query('SELECT * FROM contratos WHERE codigo_contrato=$1', ['QA-FAIL-ITENS'])).rowCount).toBe(0);
        const existing = await results[0].json();
        expect((await request.put(base + '/' + existing.CHAVE, { headers, data: {
            COD_CONTRATO_CONCAT: 'QA-FAIL-ITENS', MATERIAL: 'Nao deve persistir'
        } })).status()).toBe(500);
        const reread = await (await request.get(base + '/' + existing.CHAVE, { headers })).json();
        expect(reread.COD_CONTRATO_CONCAT).toBe(code);
        expect(reread.MATERIAL).toBe(existing.MATERIAL);
    } finally {
        await db.query('DROP TRIGGER qa_itens_failure ON itens_arrematados."UNIQUE_TBL"');
        await db.query('DROP FUNCTION public.qa_itens_contract_failure()');
    }
});
