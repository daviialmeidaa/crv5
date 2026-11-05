const { defineConfig } = require('@playwright/test');
const fs = require('fs');
if (!process.env.QA_BASE_URL || !/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.QA_BASE_URL)) {
    throw new Error('QA_BASE_URL deve apontar para o ambiente descartavel em 127.0.0.1.');
}
module.exports = defineConfig({
    globalSetup: require.resolve('./tests/staging/preflight.cjs'),
    testDir: './tests/staging', testMatch: '*.spec.cjs', workers: 1, timeout: 30000,
    outputDir: 'test-results/staging',
    reporter: [['list'], ['json', {outputFile:'test-results/staging-results.json'}], ['html',{outputFolder:'playwright-report/staging',open:'never'}]],
    use: {baseURL: process.env.QA_BASE_URL, viewport:{width:1280,height:720},
        launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined),args:['--no-sandbox']},
        screenshot:'only-on-failure', trace:'retain-on-failure'},
});
