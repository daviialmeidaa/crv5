const { test, expect, login, saved } = require('./support/fixtures.cjs');
async function contract(page) {
    await login(page);
    await page.goto('/cirurgias');
    await page
        .locator('#opmeTableBody tr[data-grid-row]')
        .filter({ hasText: 'QA-SEED' })
        .locator('td[data-col="id_contrato"]')
        .click();
    await page.locator('#btnConfirmAccess').click();
    await expect(page.locator('#btnNewCirurgia')).toBeVisible();
}

test('OPME: contrato criado, editado, desativado e reativado pela tela', async ({ page, db }) => {
    await login(page);
    await page.goto('/cirurgias');
    await page.locator('#btnNewContract').click();
    await page.locator('#fcContratoEmpresa').selectOption('Nexomed');
    await page.locator('#fcContratoId').fill('QA-NOVO');
    await page.locator('#fcContratoCliente').fill('Hospital QA Novo');
    await page.locator('#fcContratoCodCliente').fill('900001');
    await page.locator('#fcContratoTotalAta').fill('123456');
    const created = await saved(page, '/api/opme/contratos', 'POST', () =>
        page.locator('#btnSaveContrato').click()
    );
    const id = created.id;
    expect((await db.query('SELECT total_ata FROM opme.contratos WHERE id=$1', [id])).rows[0].total_ata).toBe(
        1234.56
    );
    let row = page.locator('#opmeTableBody tr[data-grid-row]').filter({ hasText: 'QA-NOVO' });
    await row.getByRole('button', { name: 'Editar Contrato', exact: true }).click();
    await page.locator('#fcContratoMaterial').fill('Material alterado QA');
    await saved(page, '/api/opme/contratos/' + id, 'PUT', () => page.locator('#btnSaveContrato').click());
    await row.getByRole('button', { name: 'Desativar Contrato', exact: true }).click();
    await saved(page, '/api/opme/contratos/' + id + '/status', 'PUT', () =>
        page.locator('#btnConfirmToggle').click()
    );
    expect((await db.query('SELECT inativo FROM opme.contratos WHERE id=$1', [id])).rows[0].inativo).toBe(
        true
    );
    await page.locator('[data-main-tab="contratos_inativos"]').click();
    row = page.locator('#opmeTableBody tr[data-grid-row]').filter({ hasText: 'QA-NOVO' });
    await row.getByRole('button', { name: 'Ativar Contrato', exact: true }).click();
    await saved(page, '/api/opme/contratos/' + id + '/status', 'PUT', () =>
        page.locator('#btnConfirmToggle').click()
    );
    expect((await db.query('SELECT inativo,material FROM opme.contratos WHERE id=$1', [id])).rows[0]).toEqual(
        { inativo: false, material: 'MATERIAL ALTERADO QA' }
    );
});

test('OPME: criar e editar unidade vinculada ao contrato', async ({ page, db }) => {
    await contract(page);
    await page.locator('[data-tab="unidades"]').click();
    await page.locator('#btnNewUnidade').click();
    await page.locator('#fcUnidadeCodCliente').fill('900001');
    await page.locator('#fcUnidadeHospital').fill('Unidade QA CRUD');
    await page.locator('#fcUnidadeSigla').fill('QAU');
    const created = await saved(
        page,
        '/api/opme/unidades',
        'POST',
        () => page.locator('button[onclick="OPME.saveUnidade()"]').click(),
        201
    );
    await page
        .locator('#opmeTableBody tr[data-grid-row]')
        .filter({ hasText: 'QAU' })
        .locator('td')
        .first()
        .click();
    await page.locator('#fcUnidadeHospital').fill('Unidade QA Editada');
    await saved(page, '/api/opme/unidades/' + created.id, 'PUT', () =>
        page.locator('button[onclick="OPME.saveUnidade()"]').click()
    );
    expect(
        (await db.query('SELECT hospital,contrato FROM opme.unidades WHERE id=$1', [created.id])).rows[0]
    ).toEqual({ hospital: 'UNIDADE QA EDITADA', contrato: 'QA-SEED' });
});

for (const hospital of [false, true])
    test('OPME: incluir e alterar saldo de ata' + (hospital ? ' por hospital' : ''), async ({ page, db }) => {
        await contract(page);
        const tab = hospital ? 'saldoatahospital' : 'saldoata',
            prefix = hospital ? 'sah' : 'sa',
            modal = hospital ? 'modalSaldoAtaHospital' : 'modalSaldoAta';
        const route = '/api/opme/' + (hospital ? 'saldo-ata-hospital' : 'saldo-ata');
        await page.locator('[data-tab="' + tab + '"]').click();
        await page.locator(hospital ? '#btnNewSaldoAtaHospital' : '#btnNewSaldoAta').click();
        const block = page.locator('#' + modal + ' .' + (hospital ? 'sah-block' : 'saldoata-block')).first();
        const header = block.locator(
            hospital ? '[onclick="OPME.toggleSaldoAtaHospitalProduct(this)"]' : '.accordion-header'
        );
        if (!(await block.locator('.' + prefix + '-item-ata').isVisible())) await header.click();
        if (hospital) await block.locator('.sah-unidade').selectOption('HQA');
        await block.locator('.' + prefix + '-item-ata').fill('QA-ATA');
        await block.locator('.' + prefix + '-qtde').fill('3');
        await block.locator('.' + prefix + '-vlrunit').fill('250');
        await block.locator('.' + prefix + '-descricao').fill('Saldo QA');
        const button = page.locator(
            'button[onclick="OPME.' + (hospital ? 'saveSaldoAtaHospital' : 'saveSaldoAta') + '()"]'
        );
        await saved(page, route, 'POST', () => button.click());
        const table = hospital ? 'saldoatahospital' : 'saldoata';
        const created = (
            await db.query(
                'SELECT id,quantidade_ata,valor_total FROM opme.' + table + " WHERE item_ata='QA-ATA'"
            )
        ).rows[0];
        expect(created.quantidade_ata).toBe(3);
        expect(created.valor_total).toBe(7.5);
        await page
            .locator('#opmeTableBody tr[data-grid-row]')
            .filter({ hasText: 'QA-ATA' })
            .locator('td')
            .first()
            .click();
        if (!(await block.locator('.' + prefix + '-qtde').isVisible())) await header.click();
        await block.locator('.' + prefix + '-qtde').fill('5');
        await saved(page, route + '/' + created.id, 'PUT', () => button.click());
        expect(
            (
                await db.query('SELECT quantidade_ata,valor_total FROM opme.' + table + ' WHERE id=$1', [
                    created.id
                ])
            ).rows[0]
        ).toEqual({ quantidade_ata: 5, valor_total: 12.5 });
    });

test('OPME: cirurgia com dois produtos, item bonificado zero, edicao e exclusao integral', async ({
    page,
    db
}) => {
    await contract(page);
    await page.locator('#btnNewCirurgia').click();
    await page.locator('#fcAcao').selectOption('CIRURGIA');
    await page.locator('#fcLocal').selectOption('HQA');
    await page.locator('#fcPaciente').fill("Paciente D'Ávila QA");
    for (const [code, qty] of [
        ['710100', '2'],
        ['710101', '1']
    ]) {
        await page.locator('button[onclick="OPME.openBancoCodigosLookup(null, true)"]').click();
        await page.locator('#bcLookupSearch').fill(code);
        const row = page.locator('#bcLookupBody tr[data-grid-row]');
        await expect(row).toHaveCount(1);
        await row.locator('td').first().click();
        const product = page.locator('.product-row').last();
        await expect(product.locator('.prod-nome')).toContainText(code);
        await product.locator('.prod-qtde').fill(qty);
        await product.locator('.prod-lote').fill('QA-LOTE');
    }
    await saved(page, '/api/opme/cirurgias', 'POST', () => page.locator('#btnSaveCirurgia').click());
    let records = (
        await db.query('SELECT * FROM opme.cirurgias WHERE paciente=$1 ORDER BY cod_bio', [
            "PACIENTE D'ÁVILA QA"
        ])
    ).rows;
    expect(records).toHaveLength(2);
    expect(records.map((r) => r.valor_total)).toEqual([25, 0]);
    await page.reload();
    await page
        .locator('#opmeTableBody tr[data-grid-row]')
        .filter({ hasText: 'QA-SEED' })
        .locator('td[data-col="id_contrato"]')
        .click();
    await page.locator('#btnConfirmAccess').click();
    await page
        .locator('#opmeTableBody tr[data-grid-row]')
        .filter({ hasText: "PACIENTE D'ÁVILA QA" })
        .first()
        .locator('td')
        .first()
        .click();
    await page.locator('#fcProntuario').fill('QA-EDITADO');
    await page
        .locator('.product-row')
        .filter({ has: page.locator('.prod-cod-bio[value="710100"]') })
        .locator('.prod-qtde')
        .fill('3');
    await page.locator('#tabBtnCirurgiaObs').click();
    await page.locator('#fcCirurgiaObservacoes').fill('Observacao QA persistida');
    await saved(page, '/api/opme/cirurgias', 'PUT', () => page.locator('#btnSaveCirurgia').click());
    records = (
        await db.query('SELECT * FROM opme.cirurgias WHERE paciente=$1 ORDER BY cod_bio', [
            "PACIENTE D'ÁVILA QA"
        ])
    ).rows;
    expect(records.every((r) => r.prontuario === 'QA-EDITADO')).toBe(true);
    expect(records.map((r) => r.valor_total)).toEqual([37.5, 0]);
    await expect
        .poll(async () =>
            Number(
                (
                    await db.query(
                        "SELECT count(*) AS count FROM opme.observacoes WHERE observacao='Observacao QA persistida'"
                    )
                ).rows[0].count
            )
        )
        .toBe(1);
    await page
        .locator('#opmeTableBody tr[data-grid-row]')
        .filter({ hasText: "PACIENTE D'ÁVILA QA" })
        .first()
        .locator('td')
        .first()
        .click();
    await page.locator('#btnDeleteCirurgia').click();
    await saved(page, '/api/opme/cirurgias/batch-delete', 'POST', () =>
        page.locator('#btnConfirmDelete').click()
    );
    expect(
        (await db.query('SELECT * FROM opme.cirurgias WHERE id=ANY($1::int[])', [records.map((r) => r.id)]))
            .rowCount
    ).toBe(0);
    await expect(
        page.locator('#opmeTableBody tr[data-grid-row]').filter({ hasText: "PACIENTE D'ÁVILA QA" })
    ).toHaveCount(0);
});
