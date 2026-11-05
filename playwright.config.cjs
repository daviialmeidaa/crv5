const { defineConfig } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const port = Number(process.env.HUB_TEST_PORT || 3107);
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);

module.exports = defineConfig({
    testDir: './tests/e2e', timeout: 45000, workers: 2,
    outputDir: 'test-results/e2e',
    reporter: [['list'], ['html', { outputFolder: 'playwright-report/e2e', open: 'never' }]],
    use: {
        baseURL: 'http://127.0.0.1:' + port, viewport: { width: 1280, height: 720 },
        launchOptions: { executablePath, args: ['--no-sandbox'] },
        screenshot: 'only-on-failure', trace: 'retain-on-failure',
    },
    webServer: {
        command: 'node scripts/start_hub.js', url: 'http://127.0.0.1:' + port + '/docs',
        reuseExistingServer: false, timeout: 30000,
        env: {
            NODE_ENV: 'test', PORT: String(port),
            NODE_OPTIONS: '--require=' + path.resolve('tests/support/hub-preload.cjs'),
            DATABASE_URL: '', PG_HOST: '127.0.0.1', PG_PORT: '9', PG_USER: 'test',
            PG_PASSWORD: 'test', PG_DATABASE: 'test', VBA_API_KEY: 'test-key',
            FASTAPI_PORT: '', FASTAPI_URL: '', PYTHONDONTWRITEBYTECODE: '1',
        },
    },
});
