const {test,expect}=require('@playwright/test');
const {pages}=require('../../app/config/publicPaths');
const {login,headers,session}=require('./helpers.cjs');
const canonical=name=>({index:'/',cliente_detalhe:'/clientes/123',reset_heroku:'/reset-heroku'})[name]||'/'+name;

for(const name of Object.keys(pages).filter(name=>name!=='primeiro_acesso')) {
    test('navegador sem mocks: '+name,async({page,request})=>{
        const errors=[],failed=[];
        page.on('pageerror',error=>errors.push(error.message));
        page.on('response',response=>{if(response.url().startsWith(process.env.QA_BASE_URL)&&response.status()>=400)failed.push(response.url()+':'+response.status())});
        if(name!=='index')await session(page,request);
        await page.goto(canonical(name));await page.waitForTimeout(800);
        expect(errors).toEqual([]);expect(failed).toEqual([]);
        expect(await page.locator('body').innerText()).not.toContain('Cannot GET');
        if(!['index','403'].includes(name)){
            await expect(page.locator('#themeToggle')).toBeVisible();
            await page.locator('#themeToggle').click();const dark=await page.locator('html').evaluate(el=>el.classList.contains('dark'));
            await page.reload();expect(await page.locator('html').evaluate(el=>el.classList.contains('dark'))).toBe(dark);
        }
        await page.screenshot({path:'test-results/staging/screens/'+name+'.png',fullPage:true});
    });
}

test('login pelo formulario real, erro de senha e force_logout',async({page})=>{
    await page.goto('/');await page.locator('#email').fill('admin@qa.invalid');await page.locator('#password').fill('errada');
    await page.locator('#submitBtn').click();await expect(page.locator('#errorMessage')).toBeVisible();
    await page.locator('#password').fill('qa-password');await page.locator('#submitBtn').click();await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/?force_logout=1');expect(await page.evaluate(()=>localStorage.getItem('token'))).toBeNull();
    await page.goto('/dashboard');await expect(page).toHaveURL(/\/$/);
});

for(const [name,allowed,denied] of [['lc','/agenda_licitacoes','/cirurgias'],['cr','/contas_a_receber','/agenda_licitacoes'],['opme','/cirurgias','/usuarios'],['blocked','/perfil','/agenda_licitacoes']])
test('navegacao e bloqueio de frontend: '+name,async({page,request})=>{
    await session(page,request,name);await page.goto(allowed);await expect(page).toHaveURL(new RegExp(allowed+'$'));
    await page.goto(denied);await expect(page).toHaveURL(/\/403$/);
});

test('primeiro acesso real: senhas diferentes, troca e login com a nova senha',async({page,request})=>{
    // A conta first e exclusiva deste teste e usa credenciais ficticias do seed.
    await session(page,request,'first');await page.goto('/dashboard');await expect(page).toHaveURL(/\/primeiro_acesso$/);
    await page.locator('#newPassword').fill('qa-password-new');await page.locator('#confirmPassword').fill('diferente');await page.locator('#submitBtn').click();
    await expect(page.locator('#errorMessage')).toBeVisible();
    await page.locator('#confirmPassword').fill('qa-password-new');await page.locator('#submitBtn').click();await expect(page).toHaveURL(/\/dashboard$/);
    expect((await login(request,'first','qa-password-new')).user.first_access).toBe(false);
});

test('agenda: paginacao, alternancia de empresa, CRUD real e leitura VBA',async({page,request})=>{
    await session(page,request);await page.goto('/agenda_licitacoes');
    await expect(page.locator('#alTableBody tr')).toHaveCount(25);
    await page.locator('#itemsPerPage').selectOption('50');await expect(page.locator('#alTableBody tr')).toHaveCount(31);
    await page.locator('#tabBml').click();await expect(page.locator('#alTableBody')).toContainText('BML QA');
    await page.locator('#tabNexomed').click();await page.locator('#btnNovoItem').click();
    await page.locator('#formPregao').fill('QA navegador integração');await page.locator('#formOrgao').fill('Hospital QA');
    await page.locator('button[onclick="AL.saveItem()"]').click();await expect(page.locator('#alTableBody')).toContainText('QA navegador integração');
    const rows=await (await request.get('/api/vba/agenda_licitacoes',{headers:{'x-api-key':'test-key'}})).json();
    expect(rows.some(row=>row.pregao==='QA navegador integração')).toBe(true);
    await page.locator('#alTableBody tr').filter({hasText:'QA navegador integração'}).click();await page.locator('#formPregao').fill('QA navegador editado');
    await page.locator('button[onclick="AL.saveItem()"]').click();await expect(page.locator('#alTableBody')).toContainText('QA navegador editado');
    await page.locator('#alTableBody tr').filter({hasText:'QA navegador editado'}).click();await page.locator('#btnDeleteFromModal').click();
    await page.locator('button[onclick="AL.confirmDelete()"]').click();await expect(page.locator('#alTableBody')).not.toContainText('QA navegador editado');
});

test('contas a receber: dados reais, paginacao e exportacao Excel',async({page,request})=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await session(page,request);await page.goto('/contas_a_receber');await expect(page.locator('#contasTableBody tr')).toHaveCount(25);
    await page.locator('#paginationControls button[title="Próxima"]').click();await expect(page.locator('#paginationInfo')).toContainText('26 a 50 de 60');
    await page.locator('#itemsPerPage').selectOption('100');await expect(page.locator('#contasTableBody tr')).toHaveCount(60);
    const pending=page.waitForEvent('download',{timeout:5000});await page.locator('#btnExport').click();
    const download=await pending;expect(download.suggestedFilename()).toMatch(/\.xlsx$/);expect(errors).toEqual([]);
});

test('OPME: contrato, abas com dados reais e calculo ao editar saldo da ata',async({page,request})=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await session(page,request);await page.goto('/cirurgias');await expect(page.locator('#opmeTableBody')).toContainText('BIO001');
    await page.locator('#opmeTableBody tr').filter({hasText:'BIO001'}).click();await page.locator('#btnConfirmAccess').click();
    for(const tab of ['cirurgias','unidades','saldoata','saldoatahospital','bancocodigos']){
        const response=page.waitForResponse(res=>res.url().includes('/api/opme/'));
        await page.locator('[data-tab="'+tab+'"]').click();await response;await expect(page.locator('#opmeTableBody tr').first()).toBeVisible();
    }
    const response=page.waitForResponse(res=>res.url().includes('/api/opme/saldo-ata?'));
    await page.locator('[data-tab="saldoata"]').click();await response;await expect(page.locator('#opmeTableBody')).toContainText('Produto QA');await page.locator('#opmeTableBody tr').first().click();
    await page.waitForTimeout(100);expect(errors).toEqual([]);
    await expect(page.locator('#modalSaldoAta')).toBeVisible();await page.locator('#modalSaldoAta .sa-qtde').fill('2');
    expect(errors).toEqual([]);
});

for(const width of [1024,390])test('layout '+width+': agenda acessivel e modal dentro da viewport',async({page,request})=>{
    await page.setViewportSize({width,height:768});await session(page,request);await page.goto('/agenda_licitacoes');
    await expect(page.locator('#alTableBody')).toContainText('NEXOMED QA');await page.locator('#btnNovoItem').click();
    await expect(page.locator('#formPregao')).toBeVisible();const box=await page.locator('#formPregao').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
    await page.screenshot({path:'test-results/staging/screens/agenda-'+width+'.png',fullPage:true});
});

test('Swagger renderiza operacoes reais no navegador',async({page})=>{
    await page.goto('/docs');await expect(page.locator('.opblock')).toHaveCount(4);
    await expect(page.locator('.errors-wrapper')).not.toBeVisible();
});
