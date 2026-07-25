const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

const sidebarRegex = /<nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">([\s\S]*?)<\/nav>/;

const getSidebarHTML = (currentPage) => {
    
    // Helper para class ativa
    const isActive = (page) => currentPage === page;
    
    return `<nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            <a href="/dashboard" class="flex items-center gap-3 px-4 py-2.5 ${isActive('dashboard.html') ? 'bg-nexo-600/90 text-white' : 'text-steel-400 hover:bg-steel-800 hover:text-white'} rounded-lg text-sm font-medium transition-colors" title="Dashboard">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
                <span class="sidebar-text truncate">Dashboard</span>
            </a>

            <!-- Grupo Financeiro -->
            <div class="sidebar-group" id="menu-group-financeiro">
                <button class="w-full flex items-center justify-between px-4 py-2.5 ${isActive('contas_a_receber.html') ? 'text-white' : 'text-steel-400 hover:bg-steel-800 hover:text-white'} rounded-lg text-sm font-medium transition-colors sidebar-group-btn">
                    <div class="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span class="sidebar-text truncate">Financeiro</span>
                    </div>
                    <svg class="w-4 h-4 transition-transform duration-200 sidebar-chevron sidebar-text" style="${isActive('contas_a_receber.html') ? 'transform: rotate(180deg)' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div class="sidebar-submenu ${isActive('contas_a_receber.html') ? '' : 'hidden'} pl-11 pr-4 py-1 space-y-1">
                    <a href="/contas_a_receber" class="block py-2 text-sm ${isActive('contas_a_receber.html') ? 'text-nexo-400 font-semibold' : 'text-steel-400 hover:text-white'} transition-colors sidebar-text">Contas a Receber</a>
                </div>
            </div>

            <!-- Grupo Licitações -->
            <div class="sidebar-group" id="menu-group-licitacoes">
                <button class="w-full flex items-center justify-between px-4 py-2.5 ${isActive('itens_arrematados.html') ? 'text-white' : 'text-steel-400 hover:bg-steel-800 hover:text-white'} rounded-lg text-sm font-medium transition-colors sidebar-group-btn">
                    <div class="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        <span class="sidebar-text truncate">Licitações</span>
                    </div>
                    <svg class="w-4 h-4 transition-transform duration-200 sidebar-chevron sidebar-text" style="${isActive('itens_arrematados.html') ? 'transform: rotate(180deg)' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div class="sidebar-submenu ${isActive('itens_arrematados.html') ? '' : 'hidden'} pl-11 pr-4 py-1 space-y-1">
                    <a href="/itens_arrematados" class="block py-2 text-sm ${isActive('itens_arrematados.html') ? 'text-nexo-400 font-semibold' : 'text-steel-400 hover:text-white'} transition-colors sidebar-text">Itens Arrematados</a>
                </div>
            </div>

        </nav>`;
}

for (const file of files) {
    if (file === 'index.html' || file === '403.html' || file === 'primeiro_acesso.html') {
        continue;
    }
    
    const filePath = path.join(publicDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Verifica se possui sidebar
    if (sidebarRegex.test(content)) {
        content = content.replace(sidebarRegex, getSidebarHTML(file));
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated sidebar in ${file}`);
    }
}
