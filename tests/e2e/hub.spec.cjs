const { test, expect } = require('@playwright/test');
const jwt = require('jsonwebtoken');
const { pages, legacyScripts } = require('../../app/config/publicPaths');
const beforeRoutes = require('../support/routes-before.json');
const canonical = name => ({ index: '/', cliente_detalhe: '/clientes/123', reset_heroku: '/reset-heroku' })[name] || '/' + name;
const permissions = Object.fromEntries(['canViewCR','canViewLC','canViewOPME','canViewUsers','canManageUsers','canViewClientes','canCreateUsers','canManageRoles','canResetHeroku','canViewCustos'].map(key => [key,true]));
const user = { id:1, nome:'Teste Estrutural', email:'teste@local.invalid', role:'ADMIN', first_access:false, permissions };
const tokenFor = account => jwt.sign(account, 'refactoring-test-only', { expiresIn:'1h' });

async function mocks(page, account = user, authenticated = true) {
    if (authenticated) await page.addInitScript(({ account, token }) => {
        localStorage.setItem('user', JSON.stringify(account)); localStorage.setItem('token', token);
    }, { account, token:tokenFor(account) });
    let records = [
        {CHAVE:'10',empresa:'NEXOMED',pregao:'PE NEXO',orgao:'Hospital Teste',uf:'SP',data_cadastro:'2026-11-01T03:00:00.000Z',data_lances:'2026-11-05T03:00:00.000Z',hora_lances:'09:00:00',antecedencia:2},
        {CHAVE:'20',empresa:'BML',pregao:'PE BML',orgao:'Hospital BML',uf:'RJ',data_lances:'2026-11-06T03:00:00.000Z',hora_lances:'10:00:00',antecedencia:1},
    ];
    await page.route('**/api/**', async route => {
        const request = route.request(); const url = new URL(request.url()); const pathname = url.pathname;
        if (pathname === '/api/openapi.json' || pathname.startsWith('/api/docs') || pathname.startsWith('/api/vba')) return route.continue();
        let data = [], status = 200, contentType = 'application/json';
        if (pathname === '/api/auth/login') data = { user:account, token:tokenFor(account) };
        else if (/\/api\/auth\/(me|profile)/.test(pathname)) data = account;
        else if (pathname.startsWith('/api/agenda_licitacoes')) {
            const id = pathname.split('/')[3]; const method = request.method();
            if (method === 'POST') { const row = { CHAVE:'30', ...request.postDataJSON() }; records.push(row); data=row; status=201; }
            else if (method === 'PUT') { records=records.map(row => row.CHAVE===id ? {CHAVE:id,...request.postDataJSON()} : row); data=records.find(row=>row.CHAVE===id); }
            else if (method === 'DELETE') { records=records.filter(row=>row.CHAVE!==id); data={message:'Excluido'}; }
            else data = records.filter(row => !url.searchParams.has('empresa') || row.empresa === url.searchParams.get('empresa'));
        } else if (pathname === '/api/itens_arrematados') data=[{CHAVE:'55',COD_CONTRATO_CONCAT:'BIO-TESTE',EDITAL:'PE 001',ORGAO:'Hospital Teste',MUNICIPIO:'Sao Paulo',UF:'SP',TIPO_CONTRATO:'ATA',CLASSIFICACAO:'OPME',MATERIAL:'Kit',QTDE:1,VALOR_UNITARIO:100,VALOR_TOTAL:100,SITUACAO_STATUS:'ATIVO',DATA_INICIO:'2026-01-01',DATA_TERMINO:'2027-12-31',VIGENCIA:'12'}];
        else if (pathname === '/api/clientes') data=[{codigo:123,razaoSocial:'Hospital Teste',nomeFantasia:'Hospital',cidade:'Sao Paulo',uf:'SP',cnpj:'00000000000100'}];
        else if (/^\/api\/clientes\/123$/.test(pathname)) data={codigo:123,razaoSocial:'Hospital Teste',nomeFantasia:'Hospital',uf:'SP'};
        else if (pathname === '/api/perfis') data=[{name:'ADMIN',permissions}];
        else if (pathname === '/api/users' && request.method()==='POST') { data={message:'Usuario cadastrado'}; status=201; }
        else if (pathname === '/api/metas') data={valor:0};
        else if (pathname === '/api/opme/kpis') data={};
        else if (pathname === '/api/opme/contratos') data=[{id_contrato:'BIO001',material:'Material Teste',cod_cliente:123,cliente:'Hospital Teste',uf:'SP',pregao:'PE 001',total_ata:1000,inicio_ata:'2026-01-01',termino_ata:'2027-12-31',inativo:false}];
        else if (pathname === '/api/notifications/stream') { data='data: []\n\n'; contentType='text/event-stream'; }
        await route.fulfill({status,contentType,body:typeof data === 'string' ? data : JSON.stringify(data)});
    });
}

for (const name of Object.keys(pages)) {
    test('pagina ' + name + ': navega e carrega scripts sem erros', async ({ page }) => {
        const errors=[], failed=[];
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => { const url=new URL(response.url()); if(url.hostname==='127.0.0.1' && response.status()>=400) failed.push(url.pathname+':'+response.status()); });
        const account = name==='primeiro_acesso' ? {...user,first_access:true} : user;
        await mocks(page,account,name!=='index');
        const response=await page.goto(canonical(name)); expect(response.status()).toBe(200);
        await page.waitForTimeout(1000);
        expect(errors).toEqual([]); expect(failed).toEqual([]);
        if (!['index','403','primeiro_acesso'].includes(name)) {
            await expect(page.locator('#themeToggle')).toBeVisible();
            const wasDark=await page.locator('html').evaluate(el=>el.classList.contains('dark'));
            await page.locator('#themeToggle').click();
            await expect.poll(()=>page.locator('html').evaluate(el=>el.classList.contains('dark'))).toBe(!wasDark);
        }
    });
}

test('rotas anteriores continuam registradas, incluindo todas as APIs', async ({ request }) => {
    const routes=await (await request.get('/__test/routes')).json();
    expect(beforeRoutes.filter(route=>!routes.includes(route))).toEqual([]);
    expect(routes.filter(route=>route.includes('/api/')).sort()).toEqual(beforeRoutes.filter(route=>route.includes('/api/')).sort());
});

test('enderecos antigos de HTML e scripts continuam acessiveis', async ({ request }) => {
    for(const name of Object.keys(pages)) expect((await request.get('/'+name+'.html')).status()).toBe(200);
    for(const name of Object.keys(legacyScripts)) expect((await request.get('/js/'+name)).status()).toBe(200);
    for(const url of ['/assets/images/logo.png','/assets/images/favicon.ico','/assets/notification/audio_notification.wav','/uploads/avatars/1-1783809102046.jpg']) expect((await request.get(url)).status()).toBe(200);
});

test('login autentica e navega para o dashboard', async ({ page }) => {
    await mocks(page,user,false); await page.goto('/');
    await page.locator('#email').fill('teste@local.invalid'); await page.locator('#password').fill('teste');
    await page.locator('#togglePassword').click(); await expect(page.locator('#password')).toHaveAttribute('type','text');
    await page.locator('#submitBtn').click(); await expect(page).toHaveURL(/\/dashboard$/);
    expect(await page.evaluate(()=>localStorage.getItem('token'))).toBeTruthy();
});

test('sem sessao e sem permissao os redirecionamentos sao preservados', async ({ page }) => {
    await page.goto('/dashboard'); await expect(page).toHaveURL(/\/$/);
    await mocks(page,{...user,role:'SEM_ACESSO',permissions:{}});
    await page.goto('/agenda_licitacoes'); await expect(page).toHaveURL(/\/403$/);
});

test('primeiro acesso continua obrigatorio', async ({ page }) => {
    await mocks(page,{...user,first_access:true}); await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/primeiro_acesso$/);
});

test('agenda troca empresa e faz inclusao, edicao e exclusao pela interface', async ({ page }) => {
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await mocks(page); await page.goto('/agenda_licitacoes');
    await expect(page.locator('#alTableBody')).toContainText('PE NEXO');
    await page.locator('#tabBml').click(); await expect(page.locator('#alTableBody')).toContainText('PE BML');
    await page.locator('#tabNexomed').click();
    await page.locator('button[onclick="AL.openModal()"]').click();
    await page.locator('#formPregao').fill('NOVO E2E'); await page.locator('#formOrgao').fill('Hospital Teste');
    await page.locator('button[onclick="AL.saveItem()"]').click();
    await expect(page.locator('#alTableBody')).toContainText('NOVO E2E');
    await page.locator('#alTableBody tr').filter({hasText:'NOVO E2E'}).click();
    await page.locator('#formPregao').fill('EDITADO E2E');
    await page.locator('button[onclick="AL.saveItem()"]').click();
    await expect(page.locator('#alTableBody')).toContainText('EDITADO E2E');
    await page.locator('#alTableBody tr').filter({hasText:'EDITADO E2E'}).click();
    await page.locator('#btnDeleteFromModal').click();
    await page.locator('button[onclick="AL.confirmDelete()"]').click();
    await expect(page.locator('#alTableBody')).not.toContainText('EDITADO E2E');
    expect(errors).toEqual([]);
});

test('clientes busca e navega para o detalhe', async ({ page }) => {
    await mocks(page); await page.goto('/clientes');
    await expect(page.locator('#clientesTableBody')).toContainText('Hospital Teste');
    await page.locator('#searchClientInput').fill('nao existe'); await expect(page.locator('#clientesTableBody')).not.toContainText('Hospital Teste');
    await page.locator('#searchClientInput').fill('Hospital'); await expect(page.locator('#clientesTableBody')).toContainText('Hospital Teste');
    await page.locator('#clientesTableBody tr').first().click(); await expect(page).toHaveURL(/\/clientes\/123$/);
});

test('cadastro recebe perfis e envia o formulario sem depender de auth.js inexistente', async ({ page }) => {
    await mocks(page); await page.goto('/cadastro_usuario');
    await page.locator('#userName').fill('Usuario Teste'); await page.locator('#userEmail').fill('usuario@local.invalid');
    await page.locator('#userRole').selectOption('ADMIN');
    const pending=page.waitForRequest(req=>req.url().endsWith('/api/users')&&req.method()==='POST');
    await page.locator('#submitBtn').click(); const request=await pending;
    expect(request.postDataJSON()).toEqual({nome:'Usuario Teste',email:'usuario@local.invalid',role:'ADMIN'});
});

test('OPME seleciona contrato e habilita abas relacionadas', async ({ page }) => {
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await mocks(page); await page.goto('/cirurgias'); await expect(page.locator('#opmeTableBody')).toContainText('BIO001');
    await page.locator('#opmeTableBody tr').filter({hasText:'BIO001'}).click();
    await page.locator('#btnConfirmAccess').click();
    await expect(page.locator('[data-tab="cirurgias"]')).not.toHaveClass(/cursor-not-allowed/);
    for(const tab of ['unidades','saldoata','saldoatahospital','bancocodigos']) await page.locator('[data-tab="'+tab+'"]').click();
    expect(errors).toEqual([]);
});

test('Swagger carrega o contrato real e autenticao VBA bloqueia pedidos sem chave', async ({ page, request }) => {
    await page.goto('/docs'); await expect(page.locator('.opblock')).toHaveCount(4);
    const schema=await (await request.get('/api/openapi.json')).json();
    expect(schema.paths['/api/vba/agenda_licitacoes'].get).toBeTruthy();
    expect((await request.get('/api/vba/agenda_licitacoes')).status()).toBe(401);
});

test('itens arrematados expoe o callback e abre a confirmacao de exclusao da linha', async ({ page }) => {
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    await mocks(page); await page.goto('/itens_arrematados');
    await expect.poll(() => page.evaluate(() => typeof IA.deleteFromModal)).toBe('function');
    await page.locator('#iaTableBody button[title="Excluir"]').first().click();
    await expect(page.locator('#deleteModal')).toBeVisible();
    expect(errors).toEqual([]);
});
