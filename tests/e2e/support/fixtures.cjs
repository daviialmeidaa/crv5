const base = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const runtime = JSON.parse(fs.readFileSync(process.env.HUB_E2E_RUNTIME_FILE));
const test = base.test.extend({
    db: async ({}, use) => {
        const db = new Client(runtime.pg);
        await db.connect();
        if ((await db.query('SELECT current_database() AS name')).rows[0].name !== 'nexomed_qa') {
            throw new Error('Testes limitados ao banco descartavel.');
        }
        try {
            await use(db);
        } finally {
            await db.end();
        }
    },
    page: async ({ page }, use) => {
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        // Only static CDN files may use the optional offline cache. Hub API
        // responses are NEVER intercepted: every operation reaches real SQL.
        if (process.env.E2E_CDN_CACHE)
            await page.route('https://**/*', (route) => {
                const file = path.join(
                    process.env.E2E_CDN_CACHE,
                    crypto.createHash('sha256').update(route.request().url()).digest('hex')
                );
                if (fs.existsSync(file + '.json'))
                    return route.fulfill({
                        ...JSON.parse(fs.readFileSync(file + '.json')),
                        body: fs.readFileSync(file + '.bin')
                    });
                return route.abort();
            });
        await page.route(
            'https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios',
            (route) => route.fulfill({ json: [{ nome: 'São Paulo' }] })
        );
        page.on('dialog', (dialog) => dialog.accept());
        await use(page);
        base.expect(errors, 'excecoes JavaScript no navegador').toEqual([]);
    }
});
async function login(page, email = 'admin@example.invalid') {
    await page.goto('/');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(runtime.password);
    await page.locator('#submitBtn').click();
    await base.expect(page).toHaveURL(/\/(dashboard|contas_a_receber)$/);
}
async function auth(request, email = 'admin@example.invalid') {
    const response = await request.post('/api/auth/login', { data: { email, password: runtime.password } });
    base.expect(response.status()).toBe(200);
    return { Authorization: 'Bearer ' + (await response.json()).token };
}
async function saved(page, path, method, action, expected = 200) {
    const pending = page.waitForResponse(
        (response) => new URL(response.url()).pathname === path && response.request().method() === method
    );
    await action();
    const response = await pending;
    base.expect(response.status(), await response.text()).toBe(expected);
    return response.json();
}
module.exports = { test, expect: base.expect, runtime, login, auth, saved };
