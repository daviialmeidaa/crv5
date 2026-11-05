const {test,expect}=require('@playwright/test');
const {Client}=require('pg');
const {login,headers}=require('./helpers.cjs');
async function database(){
    const client=new Client({host:'127.0.0.1',port:6778,user:'postgres',password:'qa-only',database:'nexomed_qa',connectionTimeoutMillis:3000});
    await client.connect();
    expect((await client.query('SELECT current_database() AS name')).rows[0].name).toBe('nexomed_qa');
    return client;
}

test('SSE real: FastAPI publica NOTIFY, Node recebe e navegador recebe refresh sem gzip',async({request})=>{
    const auth=headers(await login(request));const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),10000);
    let reader,key;
    try{
        const response=await fetch(process.env.QA_BASE_URL+'/api/notifications/stream',{headers:{...auth,Accept:'text/event-stream','Accept-Encoding':'gzip'},signal:abort.signal});
        expect(response.status).toBe(200);expect(response.headers.get('content-encoding')).toBeNull();
        reader=response.body.getReader();const first=await reader.read();expect(new TextDecoder().decode(first.value)).toContain('data:');
        const marker='QA-SSE-'+Date.now();const created=await request.post('/api/vba/agenda_licitacoes',{headers:{'x-api-key':'test-key'},data:{empresa:'NEXOMED',pregao:marker}});expect(created.status()).toBe(201);key=(await created.json()).CHAVE;
        let content='';while(!content.includes(marker)){const chunk=await reader.read();if(chunk.done)break;content+=new TextDecoder().decode(chunk.value)}
        expect(content).toContain(marker);
    }finally{
        clearTimeout(timer);abort.abort();if(reader)await reader.cancel().catch(()=>{});
        if(key)await request.delete('/api/vba/agenda_licitacoes/'+key,{headers:{'x-api-key':'test-key'}});
    }
});

test('gzip real comprime listagens grandes e cabecalhos respeitam Accept-Encoding',async({request})=>{
    const auth=headers(await login(request));const response=await fetch(process.env.QA_BASE_URL+'/api/titulos',{headers:{...auth,'Accept-Encoding':'gzip'}});
    expect(response.headers.get('content-encoding')).toBe('gzip');expect((await response.json()).length).toBe(60);
});

test('PostgreSQL real: data BC vira null no GET VBA, registro permanece inalterado',async({request})=>{
    const db=await database();let key;
    try{
        key=(await db.query(`INSERT INTO agenda_licitacoes."AGENDA_LICITACOES"(empresa,pregao,data_lances) VALUES('NEXOMED','QA BC',DATE '0001-01-01 BC') RETURNING "CHAVE"`)).rows[0].CHAVE;
        const rows=await (await request.get('/api/vba/agenda_licitacoes',{headers:{'x-api-key':'test-key'}})).json();
        expect(rows.find(row=>String(row.CHAVE)===String(key)).data_lances).toBeNull();
        expect((await db.query(`SELECT data_lances::text AS date FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE"=$1`,[key])).rows[0].date).toContain('BC');
    }finally{if(key)await db.query(`DELETE FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE"=$1`,[key]);await db.end()}
});

test('VBA preserva CHAVE bigint acima da precisao segura do JavaScript',async({request})=>{
    const key='9007199254740993',auth={'x-api-key':'test-key'};
    const created=await request.post('/api/vba/agenda_licitacoes',{headers:auth,data:{chave:key,empresa:'NEXOMED',pregao:'QA bigint'}});expect(created.status()).toBe(201);
    try{
        expect(await created.text()).toContain(key);
        const response=await request.get('/api/vba/agenda_licitacoes',{headers:auth});expect(await response.text()).toContain(key);
    }finally{expect((await request.delete('/api/vba/agenda_licitacoes/'+key,{headers:auth})).status()).toBe(200)}
});

test('OPME real: transacao, cache Redis, invalidacao e exclusao',async({request})=>{
    const auth=headers(await login(request)),db=await database(),contract='QA-CACHE';
    let id;
    try{
        const created=await request.post('/api/opme/cirurgias',{headers:auth,data:{items:[{contrato:contract,paciente:'Paciente Cache',cod_bio:1,quantidade_utilizada:1,valor_unitario:0,valor_total:0}]}});expect(created.status(),await created.text()).toBeLessThan(300);
        const get=async()=>await (await request.get('/api/opme/cirurgias?contrato='+contract,{headers:auth})).json();
        const initial=await get();id=initial[0].id;expect(initial[0].valor_unitario).toBe(0);
        await db.query('UPDATE opme.cirurgias SET paciente=$1 WHERE id=$2',['Alterado diretamente',id]);
        expect((await get())[0].paciente).toBe('Paciente Cache');
        expect((await request.put('/api/opme/cirurgias',{headers:auth,data:{contrato:contract,items:[{id,contrato:contract,paciente:'Atualizado API'}]}})).status()).toBe(200);
        expect((await get())[0].paciente).toBe('Atualizado API');
        expect((await request.post('/api/opme/cirurgias/batch-delete',{headers:auth,data:{contrato:contract,ids:[id]}})).status()).toBe(200);
        await expect.poll(get).toEqual([]);
    }finally{await db.query('DELETE FROM opme.cirurgias WHERE contrato=$1',[contract]);await db.end()}
});

test('OPME: lote com item invalido deve reverter todos os inserts',async({request})=>{
    const auth=headers(await login(request)),db=await database(),contract='QA-ROLLBACK';
    try{
        const response=await request.post('/api/opme/cirurgias',{headers:auth,data:{items:[{contrato:contract,paciente:'Nao deve persistir',cod_bio:1},{contrato:contract,cod_bio:'invalido'}]}});
        expect(response.status()).toBe(500);
        expect((await db.query('SELECT count(*)::int AS count FROM opme.cirurgias WHERE contrato=$1',[contract])).rows[0].count).toBe(0);
    }finally{await db.query('DELETE FROM opme.cirurgias WHERE contrato=$1',[contract]);await db.end()}
});

test('itens arrematados: criar, atualizar e excluir com contratos e notificacoes reais',async({request})=>{
    const auth=headers(await login(request));
    const created=await request.post('/api/itens_arrematados',{headers:auth,data:{COD_CONTRATO_CONCAT:'QA-IA',ORGAO:'Hospital QA',PARTICIPANTE:'NEXOMED'}});expect(created.status(),await created.text()).toBe(201);
    const row=await created.json();
    expect((await request.put('/api/itens_arrematados/'+row.CHAVE,{headers:auth,data:{COD_CONTRATO_CONCAT:'QA-IA',ORGAO:'Hospital QA Editado',PARTICIPANTE:'NEXOMED'}})).status()).toBe(200);
    expect((await request.delete('/api/itens_arrematados/'+row.CHAVE,{headers:auth})).status()).toBe(200);
});
