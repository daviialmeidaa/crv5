const { defineConfig } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const runtime = JSON.parse(fs.readFileSync(process.env.HUB_E2E_RUNTIME_FILE));
module.exports = defineConfig({
    testDir: __dirname,
    testMatch: '*.spec.cjs',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 60000,
    expect: { timeout: 10000 },
    reporter: [
        ['list'],
        ['json', { outputFile: path.resolve(__dirname, '../../test-results/e2e/results.json') }]
    ],
    outputDir: path.resolve(__dirname, '../../test-results/e2e/artifacts'),
    use: {
        baseURL: runtime.url,
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        viewport: { width: 1600, height: 1000 },
        actionTimeout: 10000,
        navigationTimeout: 20000,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        launchOptions: process.env.E2E_CHROMIUM_PATH
            ? { executablePath: process.env.E2E_CHROMIUM_PATH, args: ['--no-sandbox'] }
            : {}
    }
});
