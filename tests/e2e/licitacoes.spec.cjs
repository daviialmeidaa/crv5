const { test, expect, login, saved } = require('./support/fixtures.cjs');

for (const empresa of ['NEXOMED', 'BML'])
    test(
        'Itens ' + empresa + ': inclusao, integracao com contratos, edicao e exclusao',
        async ({ page, db }) => {
            await login(page);
            await page.goto('/itens_arrematados');
            if (empresa === 'BML') await page.locator('#tabBml').click();
            await page.locator('#btnNovoItem').click();
            await page.locator('#formCodContrato').fill(empresa === 'BML' ? '9872' : '9871');
            await page.locator('#formEdital').fill('QA-EDITAL-' + empresa);
            await page.locator('#formTipoContrato').selectOption('R. Vendas');
            await page.locator('#formClassificacao').selectOption('OPME');
            await page.locator('#formOrgao').fill('Hospital QA Itens');
            await page.locator('#formUF').click();
            await page.locator('#ufList li').getByText('SP', { exact: true }).click();
            await page.locator('#formMunicipio').click();
            await page.locator('#municipiosList li').getByText('SÃO PAULO', { exact: true }).click();
            await page.locator('#formCodStatus').selectOption('0');
            await page.locator('#btnAddProduto').click();
            await expect(page.locator('.produto-box')).toHaveCount(2);
            await page.locator('.produto-box').last().locator('.btn-remove-produto').click();
            await expect(page.locator('.produto-box')).toHaveCount(1);
            const box = page.locator('.produto-box').first();
            if (!(await box.locator('.prod-material').isVisible()))
                await box.locator('.accordion-header').click();
            await box.locator('.prod-lote').fill('1');
            await box.locator('.prod-material').fill('Produto QA com acentos: prótese');
            await box.locator('.prod-qtde').fill('2');
            await box.locator('.prod-vunit').fill('12.50');
            const created = await saved(
                page,
                '/api/itens_arrematados',
                'POST',
                () => page.locator('button[onclick="IA.saveItem()"]').click(),
                201
            );
            const key = created.CHAVE,
                code = created.COD_CONTRATO_CONCAT,
                table = empresa === 'BML' ? 'IA_BML' : 'IA_NEXOMED';
            const stored = (
                await db.query(
                    'SELECT "MATERIAL","QTDE","VALOR_TOTAL","CODIGO_STATUS" FROM itens_arrematados."' +
                        table +
                        '" WHERE "CHAVE"=$1',
                    [key]
                )
            ).rows[0];
            expect(stored.MATERIAL).toContain('prótese');
            expect(stored.QTDE).toBe(2);
            expect(Number(stored.VALOR_TOTAL)).toBe(25);
            expect(stored.CODIGO_STATUS).toBe(0);
            expect(
                (await db.query('SELECT * FROM contratos WHERE codigo_contrato=$1', [code])).rowCount
            ).toBe(1);
            await page.reload();
            if (empresa === 'BML') await page.locator('#tabBml').click();
            await page
                .locator('#iaTableBody tr[data-grid-row]')
                .filter({ hasText: code })
                .first()
                .locator('td[data-col="MATERIAL"]')
                .click();
            await expect(page.locator('#itemModal')).toBeVisible();
            const edited = page.locator('.produto-box').first();
            if (!(await edited.locator('.prod-material').isVisible()))
                await edited.locator('.accordion-header').click();
            await edited.locator('.prod-material').fill('Produto QA editado');
            await saved(page, '/api/itens_arrematados/' + key, 'PUT', () =>
                page.locator('button[onclick="IA.saveItem()"]').click()
            );
            expect(
                (
                    await db.query(
                        'SELECT "MATERIAL" FROM itens_arrematados."' + table + '" WHERE "CHAVE"=$1',
                        [key]
                    )
                ).rows[0].MATERIAL
            ).toBe('Produto QA editado');
            await page
                .locator('#iaTableBody tr[data-grid-row]')
                .filter({ hasText: 'Produto QA editado' })
                .getByRole('button', { name: 'Excluir', exact: true })
                .click();
            await saved(page, '/api/itens_arrematados/' + key, 'DELETE', () =>
                page.locator('button[onclick="IA.confirmDelete()"]').click()
            );
            expect(
                (await db.query('SELECT * FROM itens_arrematados."' + table + '" WHERE "CHAVE"=$1', [key]))
                    .rowCount
            ).toBe(0);
        }
    );
