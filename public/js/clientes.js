/**
 * Gerenciamento do Data Grid de Clientes (Mock Client-Side)
 */
const ClientesGrid = (() => {
    
    // ==========================================
    // 1. Estado da Aplicação
    // ==========================================
    let state = {
        data: [],        // Dados originais
        filteredData: [] // Dados exibidos (após pesquisa)
    };

    // DOM Elements
    const elements = {
        searchInput: document.getElementById('searchClientInput'),
        tableBody: document.getElementById('clientesTableBody')
    };

    // ==========================================
    // 2. Dados Fictícios (Mock)
    // ==========================================
    const mockClientes = [
        { id: 1, nome: 'HOSPITAL SÃO LUCAS S.A', cnpj: '12.345.678/0001-90', status: 'ATIVO', dividaTotal: 15430.50 },
        { id: 2, nome: 'CLÍNICA MÉDICA BEM ESTAR LTDA', cnpj: '98.765.432/0001-10', status: 'ATIVO', dividaTotal: 5000.00 },
        { id: 3, nome: 'LABORATÓRIO ALFA E ÔMEGA', cnpj: '45.123.890/0001-44', status: 'INADIMPLENTE', dividaTotal: 42100.75 },
        { id: 4, nome: 'PREFEITURA MUNICIPAL DE SÃO PAULO', cnpj: '46.392.130/0001-18', status: 'ATIVO', dividaTotal: 120500.00 },
        { id: 5, nome: 'HOSPITAL DE BASE DO ESTADO', cnpj: '74.213.984/0001-66', status: 'INATIVO', dividaTotal: 0.00 },
        { id: 6, nome: 'SANTA CASA DE MISERICÓRDIA', cnpj: '11.222.333/0001-00', status: 'ATIVO', dividaTotal: 8400.20 },
        { id: 7, nome: 'CLÍNICA DOS OLHOS DR. JOÃO', cnpj: '99.888.777/0001-11', status: 'ATIVO', dividaTotal: 1500.00 },
        { id: 8, nome: 'CENTRO MÉDICO AVANÇADO', cnpj: '55.444.333/0001-22', status: 'INADIMPLENTE', dividaTotal: 28900.40 },
        { id: 9, nome: 'GOVERNO DO ESTADO DO RIO DE JANEIRO', cnpj: '42.498.600/0001-71', status: 'ATIVO', dividaTotal: 310000.00 },
        { id: 10, nome: 'ONCOLOGIA BRASIL S.A', cnpj: '33.222.111/0001-88', status: 'ATIVO', dividaTotal: 54320.10 }
    ];

    // ==========================================
    // 3. Funções de Renderização
    // ==========================================
    
    const formatCurrency = (val) => {
        if (val == null) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const getStatusBadge = (status) => {
        if (status === 'ATIVO') return `<span class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border border-green-200 dark:border-green-800">ATIVO</span>`;
        if (status === 'INADIMPLENTE') return `<span class="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border border-red-200 dark:border-red-800">INADIMPLENTE</span>`;
        if (status === 'INATIVO') return `<span class="bg-gray-100 text-gray-700 dark:bg-steel-700/50 dark:text-gray-400 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border border-gray-200 dark:border-steel-600">INATIVO</span>`;
        return status;
    };

    const renderTable = () => {
        if (!elements.tableBody) return;

        if (state.filteredData.length === 0) {
            elements.tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-steel-500 dark:text-steel-400">Nenhum cliente encontrado.</td></tr>`;
            return;
        }

        const rows = state.filteredData.map(c => `
            <tr class="hover:bg-gray-50/80 dark:hover:bg-steel-800/50 transition-colors group">
                <td class="px-6 py-3 whitespace-nowrap sticky-col bg-white dark:bg-steel-800 group-hover:bg-gray-50/80 dark:group-hover:bg-steel-800/50 border-r border-gray-100 dark:border-steel-700">
                    <p class="font-semibold text-steel-800 dark:text-gray-100 truncate max-w-[300px]" title="${c.nome}">${c.nome}</p>
                </td>
                <td class="px-6 py-3 whitespace-nowrap text-center font-mono text-steel-600 dark:text-gray-300">
                    ${c.cnpj}
                </td>
                <td class="px-6 py-3 whitespace-nowrap text-center">
                    ${getStatusBadge(c.status)}
                </td>
                <td class="px-6 py-3 whitespace-nowrap text-right font-medium ${c.dividaTotal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">
                    ${formatCurrency(c.dividaTotal)}
                </td>
                <td class="px-6 py-3 whitespace-nowrap text-center">
                    <button class="p-1.5 text-steel-400 hover:text-nexo-600 dark:hover:text-nexo-400 hover:bg-nexo-50 dark:hover:bg-nexo-900/20 rounded transition-colors" title="Ver Detalhes">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                </td>
            </tr>
        `).join('');

        elements.tableBody.innerHTML = rows;
    };

    // ==========================================
    // 4. Lógica de Filtros (Pesquisa)
    // ==========================================
    const applySearch = () => {
        const query = (elements.searchInput.value || '').trim().toLowerCase();
        
        if (!query) {
            state.filteredData = [...state.data];
        } else {
            state.filteredData = state.data.filter(c => 
                c.nome.toLowerCase().includes(query) || 
                c.cnpj.replace(/\D/g, '').includes(query.replace(/\D/g, ''))
            );
        }
        
        renderTable();
    };

    // ==========================================
    // 5. Inicialização
    // ==========================================
    const init = () => {
        // Carrega Mock
        state.data = [...mockClientes];
        state.filteredData = [...state.data];

        // Bind Events
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', applySearch);
        }

        // Render Initial
        renderTable();
    };

    return { init };
})();

document.addEventListener('DOMContentLoaded', ClientesGrid.init);
