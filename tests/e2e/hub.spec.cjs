const fs = require('fs');
const { test, expect, runtime, login, saved } = require('./support/fixtures.cjs');

test('Dashboard: login pela tela, salvar meta, reler e remover', async ({ page, db }) => {
    await login(page);
    await page.locator('#btnEditMeta').click();
    await page.locator('#metaValorInput').fill('1.234,56');
    await saved(page, '/api/metas', 'PUT', () => page.locator('#btnSalvarMeta').click());
    expect((await db.query('SELECT valor_meta FROM metas_recebimento WHERE id=1')).rows[0].valor_meta).toBe(
        '1234.56'
    );
    await page.reload();
    await page.locator('#btnEditMeta').click();
    await expect(page.locator('#metaValorInput')).toHaveValue(/1.234,56|1234,56/);
    await saved(page, '/api/metas', 'PUT', () => page.locator('#btnLimparMeta').click());
    expect(
        Number((await db.query('SELECT valor_meta FROM metas_recebimento WHERE id=1')).rows[0].valor_meta)
    ).toBe(0);
});

test('Usuarios: cadastrar, persistir, editar e excluir pela interface', async ({ page, db }) => {
    await login(page);
    await page.goto('/cadastro_usuario');
    await page.locator('#userName').fill('Usuario QA CRUD');
    await page.locator('#userEmail').fill('crud@example.invalid');
    await page.locator('#userRole').selectOption('CR1');
    await saved(page, '/api/users', 'POST', () => page.locator('#submitBtn').click(), 201);
    const user = (await db.query("SELECT * FROM users WHERE email='crud@example.invalid'")).rows[0];
    expect(user.first_access).toBe(true);
    expect(user.password_hash).toMatch(/^\$2/);
    expect(fs.readFileSync(runtime.mailbox, 'utf8')).toContain('crud@example.invalid');
    await page.goto('/usuarios');
    let row = page.locator('#usersTableBody tr').filter({ hasText: 'crud@example.invalid' });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Editar Usuário', exact: true }).click();
    await page.locator('#editName').fill('Usuario QA Editado');
    await saved(page, '/api/users/' + user.id, 'PUT', () =>
        page.locator('#editForm button[type="submit"]').click()
    );
    expect((await db.query('SELECT nome FROM users WHERE id=$1', [user.id])).rows[0].nome).toBe(
        'Usuario QA Editado'
    );
    await page.reload();
    row = page.locator('#usersTableBody tr').filter({ hasText: 'Usuario QA Editado' });
    await saved(page, '/api/users/' + user.id, 'DELETE', () =>
        row.getByRole('button', { name: 'Excluir Usuário', exact: true }).click()
    );
    await expect(row).toHaveCount(0);
    expect((await db.query('SELECT * FROM users WHERE id=$1', [user.id])).rowCount).toBe(0);
});

test('Perfis: incluir permissao, alterar e excluir com recarga real do RBAC', async ({ page, db }) => {
    await login(page);
    await page.goto('/perfis');
    await page.getByRole('button', { name: 'Novo Perfil', exact: true }).click();
    await page.locator('#formRoleName').fill('QA_TEMP');
    await page.locator('#boxAvailable [data-id="canViewLC"]').click();
    await page.locator('button[onclick="PerfisModule.moveItem(\'right\')"]').click();
    await saved(page, '/api/perfis', 'POST', () => page.locator('#btnSaveRole').click());
    expect(
        (await db.query("SELECT permissions FROM roles WHERE name='QA_TEMP'")).rows[0].permissions.canViewLC
    ).toBe(true);
    await page.locator('#boxAvailable [data-id="canViewCustos"]').click();
    await page.locator('button[onclick="PerfisModule.moveItem(\'right\')"]').click();
    await saved(page, '/api/perfis', 'POST', () => page.locator('#btnSaveRole').click());
    expect(
        (await db.query("SELECT permissions FROM roles WHERE name='QA_TEMP'")).rows[0].permissions
            .canViewCustos
    ).toBe(true);
    await page.locator('#btnDeleteRole').click();
    await saved(page, '/api/perfis/QA_TEMP', 'DELETE', () =>
        page.locator('button[onclick="PerfisModule.confirmDeleteRole()"]').click()
    );
    expect((await db.query("SELECT * FROM roles WHERE name='QA_TEMP'")).rowCount).toBe(0);
});

for (const empresa of ['NEXOMED', 'BML'])
    test('Agenda ' + empresa + ': criar, recarregar, editar e excluir', async ({ page, db }) => {
        await login(page);
        await page.goto('/agenda_licitacoes');
        if (empresa === 'BML') await page.locator('#tabBml').click();
        await page.locator('#btnNovoItem').click();
        await page.locator('#formPregao').fill('QA-UI-' + empresa);
        await page.locator('#formOrgao').fill("Hospital D'Ávila QA");
        await page.locator('#formObjeto').fill('Material QA com acentos e "aspas"');
        await page.locator('#formUF').click();
        await page.locator('#ufList li').getByText('SP', { exact: true }).click();
        await page.locator('#formDataLances').locator('..').locator('input[type="text"]').fill('06/11/2026');
        const created = await saved(
            page,
            '/api/agenda_licitacoes',
            'POST',
            () => page.locator('button[onclick="AL.saveItem()"]').click(),
            201
        );
        const key = created.CHAVE;
        const stored = (
            await db.query(
                'SELECT pregao,orgao,data_lances::text FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE"=$1',
                [key]
            )
        ).rows[0];
        expect(stored).toEqual({
            pregao: 'QA-UI-' + empresa,
            orgao: "Hospital D'Ávila QA",
            data_lances: '2026-11-06'
        });
        await page.reload();
        if (empresa === 'BML') await page.locator('#tabBml').click();
        await page
            .locator('#alTableBody tr[data-grid-row]')
            .filter({ hasText: 'QA-UI-' + empresa })
            .locator('td')
            .first()
            .click();
        await page.locator('#formPregao').fill('QA-EDIT-' + empresa);
        await saved(page, '/api/agenda_licitacoes/' + key, 'PUT', () =>
            page.locator('button[onclick="AL.saveItem()"]').click()
        );
        await page
            .locator('#alTableBody tr[data-grid-row]')
            .filter({ hasText: 'QA-EDIT-' + empresa })
            .locator('td')
            .first()
            .click();
        await page.locator('#btnDeleteFromModal').click();
        await saved(page, '/api/agenda_licitacoes/' + key, 'DELETE', () =>
            page.locator('button[onclick="AL.confirmDelete()"]').click()
        );
        expect(
            (await db.query('SELECT * FROM agenda_licitacoes."AGENDA_LICITACOES" WHERE "CHAVE"=$1', [key]))
                .rowCount
        ).toBe(0);
    });

test('Clientes: contato com acentos, alteracao, exclusao logica e historico persistido', async ({
    page,
    db
}) => {
    await login(page);
    await page.goto('/clientes/900001');
    await page.locator('#mainTabAgenda').click();
    await page.locator('#btnNovoContato').click();
    await page.locator('#contatoNome').fill("Maria D'Ávila QA");
    await page.locator('#contatoCargo').fill('Financeiro');
    await page.locator('#contatoEmail').fill('contato@example.invalid');
    const contact = await saved(
        page,
        '/api/clientes/900001/contatos',
        'POST',
        () => page.locator('button[onclick="ClienteDetalhe.saveContato()"]').click(),
        201
    );
    await page.locator('#agendaCards button[title="Editar"]').first().click();
    await page.locator('#contatoCargo').fill('Coordenacao QA');
    await saved(page, '/api/clientes/900001/contatos/' + contact.id, 'PUT', () =>
        page.locator('button[onclick="ClienteDetalhe.saveContato()"]').click()
    );
    await page.locator('#mainTabHistorico').click();
    await page.locator('#historicoTipo').selectOption('LIGACAO');
    await page.locator('#historicoContato').selectOption(String(contact.id));
    await page.locator('#historicoResultado').selectOption('PROMESSA');
    await page.locator('#historicoDescricao').fill('QA: promessa de pagamento registrada pelo Hub');
    await saved(
        page,
        '/api/clientes/900001/historico',
        'POST',
        () => page.locator('#btnSubmitHistorico').click(),
        201
    );
    const history = (
        await db.query('SELECT * FROM historico_cobranca WHERE agenda_contato_id=$1', [contact.id])
    ).rows[0];
    expect(history.created_by).toBe(1);
    expect(history.descritivo_contato).toContain('QA: promessa');
    await page.reload();
    await page.locator('#mainTabHistorico').click();
    await expect(page.locator('#historicoEntries')).toContainText('QA: promessa');
    await page.locator('#mainTabAgenda').click();
    await page.locator('#agendaCards button[title="Excluir"]').first().click();
    await saved(page, '/api/clientes/900001/contatos/' + contact.id, 'DELETE', () =>
        page.locator('#btnConfirmDeleteContato').click()
    );
    const removed = (
        await db.query('SELECT ativo,cargo_contato FROM agenda_contatos WHERE id=$1', [contact.id])
    ).rows[0];
    expect(removed).toEqual({ ativo: false, cargo_contato: 'Coordenacao QA' });
    expect((await db.query('SELECT * FROM historico_cobranca WHERE id=$1', [history.id])).rowCount).toBe(1);
});

test('Custos: salvar custo pela celula, validar total e reler historico sem cache antigo', async ({
    page,
    db
}) => {
    await login(page);
    await page.goto('/custos_produtos');
    await page.locator('button[data-tab="custos-nulos"]').click();
    const row = (await db.query("SELECT id FROM financeiro.vendas_custos WHERE lote='QA-LOTE'")).rows[0];
    const input = page.locator('#input-custo-' + row.id);
    await expect(input).toBeVisible();
    await input.fill('750');
    await saved(page, '/api/financeiro/custos/save-batch', 'PUT', () =>
        input.locator('..').getByRole('button', { name: 'Salvar', exact: true }).click()
    );
    const stored = (
        await db.query('SELECT custo_unitario,custo_total FROM financeiro.vendas_custos WHERE id=$1', [
            row.id
        ])
    ).rows[0];
    expect(stored).toEqual({ custo_unitario: '7.5000', custo_total: '15.0000' });
    await expect(input).toHaveCount(0);
    await page.reload();
    await expect(page.locator('#input-custo-' + row.id)).toHaveCount(0);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/financeiro/custos/historico', {
        headers: { Authorization: 'Bearer ' + token }
    });
    expect((await response.json()).find((r) => r.id === row.id).custo_total).toBe('15.0000');
});

test('Sincronizacao de titulos: botao do Hub executa script e grava dados das duas empresas', async ({
    page,
    db
}) => {
    await login(page);
    await page.goto('/contas_a_receber');
    const pending = page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/api/titulos/sync' && r.request().method() === 'POST'
    );
    await page.locator('#btnSyncSupra').click();
    const response = await pending;
    expect(response.status()).toBe(200);
    const progress = await response.text();
    expect(progress).not.toContain('"type":"error"');
    const rows = (
        await db.query(
            "SELECT empresa,documento,status FROM titulos WHERE documento IN ('QA-DOC','QA-DOC-BML') ORDER BY empresa"
        )
    ).rows;
    expect(rows).toEqual([
        { empresa: 'BML', documento: 'QA-DOC-BML', status: 'PENDENTE' },
        { empresa: 'Nexomed', documento: 'QA-DOC', status: 'PENDENTE' }
    ]);
    await page.reload();
    await expect(page.locator('#contasTableBody')).toContainText('QA-DOC-BML');
});

test('Perfil pessoal: alteracao salva no banco e retorna apos novo login', async ({ page, db }) => {
    await login(page);
    await page.goto('/perfil');
    await page.locator('#profileName').fill('Administrador QA Atualizado');
    await saved(page, '/api/users/profile', 'PUT', () =>
        page.locator('#profileForm button[type="submit"]').click()
    );
    expect((await db.query('SELECT nome FROM users WHERE id=1')).rows[0].nome).toBe(
        'Administrador QA Atualizado'
    );
    await page.goto('/?force_logout=1');
    await login(page);
    await page.goto('/perfil');
    await expect(page.locator('#profileName')).toHaveValue('Administrador QA Atualizado');
});

test('Primeiro acesso: senha alterada pela tela e validada em novo login', async ({ page, db }) => {
    await page.goto('/');
    await page.locator('#email').fill('first@example.invalid');
    await page.locator('#password').fill(runtime.password);
    await page.locator('#submitBtn').click();
    await expect(page).toHaveURL(/\/primeiro_acesso$/);
    const next = runtime.password + 'Ab1';
    await page.locator('#newPassword').fill(next);
    await page.locator('#confirmPassword').fill(next);
    const changed = page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/api/auth/first_access' && r.request().method() === 'POST'
    );
    await page.locator('#submitBtn').click();
    expect((await changed).status()).toBe(200);
    const user = (await db.query("SELECT first_access FROM users WHERE email='first@example.invalid'"))
        .rows[0];
    expect(user.first_access).toBe(false);
    const loginResponse = await page.request.post('/api/auth/login', {
        data: { email: 'first@example.invalid', password: next }
    });
    expect(loginResponse.status()).toBe(200);
    expect((await loginResponse.json()).user.first_access).toBe(false);
});
