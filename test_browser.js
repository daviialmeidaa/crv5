const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log('BROWSER CONSOLE:', msg.type(), msg.text());
    });
    
    page.on('pageerror', err => {
        console.log('BROWSER ERROR:', err.message);
    });
    
    await page.goto('http://localhost:3000');
    
    // Inject token to bypass login
    await page.evaluate(() => {
        localStorage.setItem('token', 'fake_token');
        localStorage.setItem('user', JSON.stringify({role: 'ADMIN'}));
    });
    
    // Now go to the page
    await page.goto('http://localhost:3000/agenda_licitacoes', { waitUntil: 'networkidle0' });
    
    await browser.close();
})();
