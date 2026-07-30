const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.localStorage = { getItem: () => null, setItem: () => {} };
global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
global.getToken = () => 'token';
global.showToast = () => {};

try {
    require('./public/js/agenda_licitacoes.js');
    console.log("Success! AL keys:", Object.keys(global.AL || {}));
} catch (e) {
    console.error("Error executing:", e.message);
}
