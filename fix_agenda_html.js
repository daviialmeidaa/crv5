const fs = require('fs');
let html = fs.readFileSync('public/agenda_licitacoes.html', 'utf8');

// Title
html = html.replace('<title>Nexomed | Itens Arrematados</title>', '<title>Nexomed | Agenda de Licitações</title>');

// Header
html = html.replace('<h2 class="text-lg font-semibold text-steel-800 dark:text-gray-100">Itens Arrematados</h2>', '<h2 class="text-lg font-semibold text-steel-800 dark:text-gray-100">Agenda de Licitações</h2>');

// Sidebar link for Agenda (make active)
const agendaLinkTarget = `                        <a href="/agenda_licitacoes"\n                            class="flex items-center gap-2 py-2 text-[14px] font-medium text-steel-400 hover:text-white transition-colors sidebar-text">\n                            <span class="w-1.5 h-1.5 rounded-full border border-current opacity-60 flex-shrink-0"></span>\n                            Agenda\n                        </a>`;
const agendaLinkActive = `                        <a href="/agenda_licitacoes"\n                            class="flex items-center gap-2 py-2 text-[14px] font-semibold text-nexo-400 transition-colors sidebar-text">\n                            <span class="w-1.5 h-1.5 rounded-full border border-current opacity-60 flex-shrink-0"></span>\n                            Agenda\n                        </a>`;
html = html.replace(agendaLinkTarget, agendaLinkActive);

// Sidebar link for Itens Arrematados (make inactive)
const itensLinkActive = `                        <a href="/itens_arrematados"\n                            class="flex items-center gap-2 py-2 text-[14px] font-semibold text-nexo-400 transition-colors sidebar-text">\n                            <span class="w-1.5 h-1.5 rounded-full border border-current opacity-60 flex-shrink-0"></span>\n                            Itens Arrematados\n                        </a>`;
const itensLinkInactive = `                        <a href="/itens_arrematados"\n                            class="flex items-center gap-2 py-2 text-[14px] font-medium text-steel-400 hover:text-white transition-colors sidebar-text">\n                            <span class="w-1.5 h-1.5 rounded-full border border-current opacity-60 flex-shrink-0"></span>\n                            Itens Arrematados\n                        </a>`;
html = html.replace(itensLinkActive, itensLinkInactive);

// Loading text
html = html.replace('Carregando itens arrematados...', 'Carregando agenda de licitações...');

// Script tag
html = html.replace('<script src="/js/itens_arrematados.js"></script>', '<script src="/js/agenda_licitacoes.js"></script>');

fs.writeFileSync('public/agenda_licitacoes.html', html);
console.log('HTML updated.');
