const {test,expect}=require('@playwright/test');
const jwt=require('jsonwebtoken');
const {login,headers}=require('./helpers.cjs');
const baselineRoutes=require('../support/routes-before.json');

test('matriz de autenticacao: todos os endpoints protegidos rejeitam requisicao anonima',async({request})=>{
    for(const route of baselineRoutes){
        const [method,pattern]=route.split(' ');
        if(!['GET','POST','PUT','DELETE'].includes(method)||!pattern.startsWith('/api/')||pattern==='/api/auth/login'||pattern.startsWith('/api/contratos/'))continue;
        const url=pattern.replace(/:[A-Za-z_]+/g,'999999');
        const response=await request.fetch(url,{method,...(method==='GET'?{}:{data:{}})});
        expect(response.status(),route).toBe(401);
    }
});

test('autenticacao real: campos obrigatorios, senha incorreta, inexistente e conta inativa',async({request})=>{
    for(const [data,status] of [[{},400],[{email:'admin@qa.invalid',password:'errada'},401],[{email:'ausente@qa.invalid',password:'x'},401],[{email:'inactive@qa.invalid',password:'qa-password'},403]])
        expect((await request.post('/api/auth/login',{data})).status()).toBe(status);
    const account=await login(request);
    expect((await (await request.get('/api/auth/me',{headers:headers(account)})).json()).user.email).toBe('admin@qa.invalid');
});

for(const [index,token] of ['', 'invalido', jwt.sign({id:1},'outra-chave'),jwt.sign({id:1},'qa-only-signing-key',{expiresIn:-1})].entries()) {
    test('JWT ausente, invalido, assinatura errada ou expirado: caso '+index,async({request})=>{
        for(const url of ['/api/auth/me','/api/users','/api/opme/contratos','/api/agenda_licitacoes','/api/titulos'])
            expect((await request.get(url,{headers:{Authorization:'Bearer '+token}})).status(),url).toBe(401);
    });
}

for(const [name,allow,deny] of [
    ['lc','/api/agenda_licitacoes','/api/opme/contratos'],
    ['cr','/api/clientes','/api/agenda_licitacoes'],
    ['opme','/api/opme/contratos','/api/agenda_licitacoes'],
    ['blocked','/api/auth/me','/api/users'],
]) test('permissoes reais do perfil '+name,async({request})=>{
    const account=await login(request,name);
    expect((await request.get(allow,{headers:headers(account)})).status()).toBe(200);
    expect((await request.get(deny,{headers:headers(account)})).status()).toBe(403);
});

const reads=[
    '/api/users','/api/perfis','/api/metas','/api/titulos','/api/clientes','/api/clientes/123',
    '/api/clientes/123/notas','/api/clientes/123/contatos','/api/clientes/123/historico',
    '/api/agenda_licitacoes','/api/agenda_licitacoes/1','/api/itens_arrematados',
    '/api/notifications','/api/opme/contratos','/api/opme/contratos?inativos_only=true',
    '/api/opme/kpis','/api/opme/cirurgias?contrato=BIO001','/api/opme/cirurgias/em-aberto-por-contrato',
    '/api/opme/unidades?contrato=BIO001','/api/opme/saldo-ata?contrato=BIO001',
    '/api/opme/saldo-ata-hospital?contrato=BIO001','/api/opme/banco-codigos?contrato=BIO001',
    '/api/financeiro/custos/resumo?ano=2026&mes=11','/api/financeiro/custos/nulos',
    '/api/financeiro/custos/historico',
];
for(const url of reads) test('leitura integrada '+url,async({request})=>{
    const account=await login(request);
    const response=await request.get(url,{headers:headers(account)});
    expect(response.status(),await response.text()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
});

test('Hub -> FastAPI -> Hub: CRUD compartilhado, unicode, datas, horarios e sequencia',async({request})=>{
    const account=await login(request), auth=headers(account),vba={'x-api-key':'test-key'};
    const payload={empresa:'NEXOMED',pregao:'QA integração Çã 😀',orgao:'Hospital QA',data_lances:'2026-11-05',hora_lances:'09:15',antecedencia:1};
    const create=await request.post('/api/agenda_licitacoes',{headers:auth,data:payload});
    expect(create.status(),await create.text()).toBe(201);
    const first=await create.json();
    const rows=await (await request.get('/api/vba/agenda_licitacoes',{headers:vba})).json();
    expect(rows.some(row=>String(row.CHAVE)===String(first.CHAVE)&&row.pregao===payload.pregao)).toBe(true);
    const update=await request.put('/api/vba/agenda_licitacoes/'+first.CHAVE,{headers:vba,data:{...payload,pregao:'QA atualizado VBA',data_lances:'05/11/2026',hora_lances:'0.5'}});
    expect(update.status(),await update.text()).toBe(200);
    const fromHub=await (await request.get('/api/agenda_licitacoes/'+first.CHAVE,{headers:auth})).json();
    expect(fromHub.pregao).toBe('QA atualizado VBA');expect(fromHub.hora_lances).toBe('12:00:00');
    expect((await request.delete('/api/vba/agenda_licitacoes/'+first.CHAVE,{headers:vba})).status()).toBe(200);
    expect((await request.get('/api/agenda_licitacoes/'+first.CHAVE,{headers:auth})).status()).toBe(404);
    const created=await request.post('/api/vba/agenda_licitacoes',{headers:vba,data:payload});expect(created.status()).toBe(201);
    const second=await created.json();expect(BigInt(second.CHAVE)>BigInt(first.CHAVE)).toBe(true);
    expect((await request.delete('/api/agenda_licitacoes/'+second.CHAVE,{headers:auth})).status()).toBe(200);
});

test('VBA: empresa filtrada e chave da API incorreta',async({request})=>{
    expect((await request.get('/api/vba/agenda_licitacoes')).status()).toBe(401);
    expect((await request.get('/api/vba/agenda_licitacoes',{headers:{'x-api-key':'incorreta'}})).status()).toBe(403);
    const response=await request.get('/api/vba/agenda_licitacoes?empresa=BML',{headers:{'x-api-key':'test-key'}});
    expect(response.status()).toBe(200);expect((await response.json()).every(row=>row.empresa==='BML')).toBe(true);
});

test('VALIDACAO: CHAVE nao numerica deveria produzir erro de cliente',async({request})=>{
    const response=await request.delete('/api/vba/agenda_licitacoes/abc',{headers:{'x-api-key':'test-key'}});
    expect(response.status()).toBeGreaterThanOrEqual(400);expect(response.status()).toBeLessThan(500);
});

test('20 inclusoes simultaneas: IDs unicos, ambas APIs e sem repetir chamadas',async({request})=>{
    const account=await login(request),auth=headers(account),vba={'x-api-key':'test-key'};
    const responses=await Promise.all(Array.from({length:20},(_,i)=>request.post(i%2?'/api/vba/agenda_licitacoes':'/api/agenda_licitacoes',{headers:i%2?vba:auth,data:{empresa:'NEXOMED',pregao:'QA concorrente '+i}})));
    responses.forEach(response=>expect(response.status()).toBe(201));
    const records=await Promise.all(responses.map(response=>response.json()));
    expect(new Set(records.map(row=>String(row.CHAVE))).size).toBe(20);
    for(const row of records) expect((await request.delete('/api/vba/agenda_licitacoes/'+row.CHAVE,{headers:vba})).status()).toBe(200);
});

test('contatos: cadastrar, editar, historico e exclusao logica persistidos',async({request})=>{
    const auth=headers(await login(request));
    expect((await request.post('/api/clientes/123/contatos',{headers:auth,data:{}})).status()).toBe(400);
    const created=await request.post('/api/clientes/123/contatos',{headers:auth,data:{nome:'Contato Integração',email:'qa@qa.invalid'}});expect(created.status()).toBe(201);
    const contact=await created.json();
    expect((await request.put('/api/clientes/123/contatos/'+contact.id,{headers:auth,data:{nome:'Editado QA'}})).status()).toBe(200);
    const history=await request.post('/api/clientes/123/historico',{headers:auth,data:{tipo_contato:'EMAIL',agenda_contato_id:contact.id,descritivo_contato:'Teste fictício'}});expect(history.status()).toBe(201);
    expect((await history.json()).created_by).toBe(1);
    expect((await request.delete('/api/clientes/123/contatos/'+contact.id,{headers:auth})).status()).toBe(200);
    expect((await (await request.get('/api/clientes/123/contatos',{headers:auth})).json()).some(row=>row.id===contact.id)).toBe(false);
    expect((await request.put('/api/clientes/123/contatos/'+contact.id,{headers:auth,data:{nome:'inativo'}})).status()).toBe(404);
});

test('usuarios: cadastrar com email capturado, duplicidade, editar, perfil e excluir',async({request})=>{
    const auth=headers(await login(request));
    const data={nome:'QA CRUD',email:'crud-'+Date.now()+'@qa.invalid',role:'LC1'};
    const created=await request.post('/api/users',{headers:{...auth,'x-forwarded-proto':'https'},data});expect(created.status()).toBe(201);
    const {user}=await created.json();
    expect((await request.post('/api/users',{headers:auth,data})).status()).toBe(400);
    expect((await request.put('/api/users/'+user.id,{headers:auth,data:{...data,nome:'QA Editado'}})).status()).toBe(200);
    expect((await request.delete('/api/users/'+user.id,{headers:auth})).status()).toBe(200);
    expect((await request.put('/api/users/99999999',{headers:auth,data})).status()).toBe(404);
    expect((await request.put('/api/users/profile',{headers:auth,data:{nome:'Admin QA',avatarBase64:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='}})).status()).toBe(200);
});

test('metas: salvar, reler e validar campo obrigatorio',async({request})=>{
    const auth=headers(await login(request));
    expect((await request.put('/api/metas',{headers:auth,data:{}})).status()).toBe(400);
    expect((await request.put('/api/metas',{headers:auth,data:{valor_meta:123456.78}})).status()).toBe(200);
    expect(Number((await (await request.get('/api/metas',{headers:auth})).json()).valor_meta)).toBe(123456.78);
});

test('HTTP: JSON malformado, limite 5MB e rotas inexistentes',async({request})=>{
    expect((await request.post('/api/auth/login',{headers:{'Content-Type':'application/json'},data:'{invalido'})).status()).toBe(400);
    expect((await request.post('/api/auth/login',{data:{padding:'x'.repeat(5*1024*1024)}})).status()).toBe(413);
    expect((await request.get('/rota-qa-inexistente')).status()).toBe(404);
});

test('Swagger: HTML e OpenAPI reais nas URLs publicas',async({request})=>{
    for(const url of ['/docs','/api/docs','/api/openapi.json'])expect((await request.get(url)).status()).toBe(200);
    const schema=await (await request.get('/api/openapi.json')).json();
    expect(schema.paths['/api/vba/agenda_licitacoes'].get).toBeTruthy();
});

// Este teste deve falhar enquanto a vulnerabilidade anterior a reorganizacao existir.
test('SEGURANCA: contratos deveriam exigir autenticacao',async({request})=>{
    const response=await request.post('/api/contratos/nexomed-insere-contrato',{data:{codigo_contrato:'QA-SEM-AUTH'}});
    expect(response.status()).toBe(401);
});

test('SEGURANCA: perfil sem permissoes nao deveria ler dados financeiros',async({request})=>{
    const account=await login(request,'blocked');
    expect((await request.get('/api/titulos',{headers:headers(account)})).status()).toBe(403);
});
