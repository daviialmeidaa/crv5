const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');
const { pages, legacyScripts, pageFile, publicDir } = require('../../app/config/publicPaths');

function files(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}

for (const name of Object.keys(pages)) {
    test('pagina fisica e recursos locais: ' + name, () => {
        const file = pageFile(name);
        assert.ok(fs.existsSync(file));
        assert.ok(file.endsWith(path.sep + 'index.html'));
        const html = fs.readFileSync(file, 'utf8');
        for (const match of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
            const url = match[1].split('?')[0];
            if (url.startsWith('/') && /\.(js|css|png|jpg|ico|wav)$/.test(url)) assert.ok(fs.existsSync(path.join(publicDir, url)), url);
        }
    });
}

test('todos os scripts antigos possuem destino para paginas em cache', () => {
    for (const target of Object.values(legacyScripts)) assert.ok(fs.existsSync(path.join(publicDir, target)), target);
    assert.equal(Object.keys(legacyScripts).length, 22);
});

test('scripts JS compilam e imports relativos do backend resolvem', () => {
    const sourceFiles = [...files('app'), ...files('scripts')].filter(file => file.endsWith('.js'));
    for (const file of sourceFiles) {
        const source = fs.readFileSync(file, 'utf8');
        new vm.Script(source, { filename: file });
        if (!file.includes(path.join('app', 'public'))) {
            const requireFromFile = createRequire(path.resolve(file));
            for (const match of source.matchAll(/require\(['"](\.[^'"]+)['"]\)/g)) assert.ok(requireFromFile.resolve(match[1]));
        }
    }
});
