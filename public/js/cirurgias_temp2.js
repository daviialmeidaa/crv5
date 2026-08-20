/**
 * Cirurgias OPME - Frontend Controller
 * Sistema de abas com grids filtráveis: Contratos, Cirurgias, Unidades, Saldo Ata, Saldo Ata Hospital, Banco de Códigos.
 */

function formatCurrencyLive(input) {
    let value = input.value.replace(/\D/g, "");
    if (!value) {
        input.value = "";
        return;
    }
    value = (parseInt(value) / 100).toFixed(2) + "";
    value = value.replace(".", ",");
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    input.value = "R$ " + value;
}

const OPME = (() => {

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-sm font-medium z-[200] transform transition-all duration-300 translate-y-10 opacity-0 flex items-center gap-2 ${
            type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`;
        
        const icon = type === 'success' 
            ? '<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
            : '<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
            
        toast.innerHTML = `${icon} <span>${message}</span>`;
        document.body.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-10', 'opacity-0');
        });
        
        // Remove after 4 seconds
        setTimeout(() => {
            toast.classList.add('translate-y-10', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ==========================================
    // 1. Definição de Colunas por Aba
    // ==========================================
    const tabColumns = {
        contratos: [
            { key: 'id_contrato', label: 'Contrato' },
            { key: 'material', label: 'Material' },
            { key: 'cod_cliente', label: 'Cód. Cliente', type: 'number' },
            { key: 'cliente', label: 'Cliente' },
            { key: 'uf', label: 'UF' },
            { key: 'pregao', label: 'Pregão' },
            { key: 'total_ata', label: 'Total Ata', type: 'currency' },
            { key: 'inicio_ata', label: 'Início', type: 'date' },
            { key: 'termino_ata', label: 'Término', type: 'date' },
            { key: '_deadline', label: 'Deadline', type: 'deadline' },
            { key: 'actions', label: 'Ações', type: 'actions' }
        ],
        contratos_inativos: [
            { key: 'id_contrato', label: 'Contrato' },
            { key: 'material', label: 'Material' },
            { key: 'cod_cliente', label: 'Cód. Cliente', type: 'number' },
            { key: 'cliente', label: 'Cliente' },
            { key: 'uf', label: 'UF' },
            { key: 'pregao', label: 'Pregão' },
            { key: 'total_ata', label: 'Total Ata', type: 'currency' },
            { key: 'inicio_ata', label: 'Início', type: 'date' },
            { key: 'termino_ata', label: 'Término', type: 'date' },
            { key: '_deadline', label: 'Deadline', type: 'deadline' },
            { key: 'actions', label: 'Ações', type: 'actions' }
        ],
        cirurgias: [
            { key: 'acao', label: 'Ação' },
            { key: 'paciente', label: 'Paciente' },
            { key: 'local_cirurgia', label: 'Local da Cirurgia' },
            { key: 'cod_cliente', label: 'Cod Cliente', type: 'number' },
            { key: 'data_cirurgia', label: 'Data da Cirurgia', type: 'date' },
            { key: 'cod_bio', label: 'Cod Bio', type: 'number' },
            { key: 'classificacao', label: 'Tipo de Cirurgia' },
            { key: 'produto', label: 'Produto' },
            { key: 'descricao_personalizada', label: 'Descrição Personalizada' },
            { key: 'quantidade_utilizada', label: 'Quantidade Utilizada', type: 'number' },
            { key: 'lote', label: 'Lote' },
            { key: 'prontuario', label: 'Prontuário' },
            { key: 'medico', label: 'Médico' },
            { key: 'crm', label: 'Crm' },
            { key: 'valor_unitario', label: 'Valor Unitário', type: 'currency' },
            { key: 'valor_total', label: 'Valor Total', type: 'currency' },
            { key: 'item_pregao', label: 'Item do Pregão' },
            { key: 'empenho', label: 'Empenho' },
            { key: 'autorizacao', label: 'Autorização' },
            { key: 'pedido', label: 'Pedido' },
            { key: 'retorno_consignacao', label: 'Status Retorno Consignação' },
            { key: 'status_expecicao', label: 'Status Expedição' },
            { key: 'autorizacao_opme', label: 'Status Autorização Opme' },
            { key: 'nota_fiscal', label: 'Nota Fiscal Faturada' },
        ],
        unidades: [
            { key: 'cod_cliente', label: 'Cód. Cliente', type: 'number' },
            { key: 'hospital', label: 'Hospital' },
            { key: 'sigla', label: 'Sigla' },
        ],
        saldoata: [
            { key: 'item_ata', label: 'Item Ata' },
            { key: 'descricao_item', label: 'Descrição' },
            { key: 'quantidade_ata', label: 'Qtde Ata', type: 'number' },
            { key: 'valor_unitario', label: 'Vlr. Unit.', type: 'currency' },
            { key: 'valor_total', label: 'Vlr. Total', type: 'currency' },
            { key: 'quantidade_utilizada', label: 'Qtde Utilizada', type: 'number' },
            { key: 'saldo', label: 'Saldo', type: 'number' },
        ],
        saldoatahospital: [
            { key: 'unidade', label: 'Unidade' },
            { key: 'item_ata', label: 'Item Ata' },
            { key: 'descricao_item', label: 'Descrição' },
            { key: 'quantidade_ata', label: 'Qtde Ata', type: 'number' },
            { key: 'valor_unitario', label: 'Vlr. Unit.', type: 'currency' },
            { key: 'valor_total', label: 'Vlr. Total', type: 'currency' },
            { key: 'quantidade_utilizada', label: 'Qtde Utilizada', type: 'number' },
            { key: 'saldo', label: 'Saldo', type: 'number' },
        ],
        bancocodigos: [
            { key: 'cod_bio', label: 'Cód. Bio', type: 'number' },
            { key: 'cod_fab', label: 'Cód. Fab.' },
            { key: 'produto', label: 'Produto' },
            { key: 'descricao_personalizada', label: 'Descrição' },
            { key: 'classificacao', label: 'Classificação' },
            { key: 'item_ata', label: 'Item Ata' },
        ],
    };

    // Mapeamento aba -> endpoint
    const tabEndpoints = {
        contratos: '/api/opme/contratos',
        contratos_inativos: '/api/opme/contratos',
        cirurgias: '/api/opme/cirurgias',
        unidades: '/api/opme/unidades',
        saldoata: '/api/opme/saldo-ata',
        saldoatahospital: '/api/opme/saldo-ata-hospital',
        bancocodigos: '/api/opme/banco-codigos',
    };

    // Labels amigáveis
    const tabLabels = {
        contratos: 'Contratos',
        cirurgias: 'Cirurgias',
        unidades: 'Unidades',
        saldoata: 'Saldo Ata',
        saldoatahospital: 'Saldo Ata Hospital',
        bancocodigos: 'Banco de Códigos',
    };

    // ==========================================
    // 2. Estado Global
    // ==========================================
    const state = {
        rawData: [],
        filteredData: [],
        viewData: [],
        filters: {},
        sort: { key: null, dir: 'desc' },
        pagination: { current: 1, limit: 25, total: 0 },
        currentTab: 'contratos',
        selectedContract: null,
    };

    let editingCirurgiaItems = [];
    let contractToAccess = null;
    let contractToToggle = null;
    let userRole = '';
    try {
        const u = JSON.parse(localStorage.getItem('user'));
        if (u && u.role) userRole = u.role;
    } catch(e) {}
    const canEditCirurgia = ['ADMIN', 'OPME3', 'OPME4'].includes(userRole);
    const canDeleteCirurgia = ['ADMIN', 'OPME4'].includes(userRole);
    let activeFilterModal = null;

    // ==========================================
    // 3. Helpers
    // ==========================================
    function getToken() { return localStorage.getItem('token'); }

    function formatCurrency(val) {
        if (val === null || val === undefined || val === '' || val === '-') return '-';
        const num = parseFloat(val);
        if (isNaN(num)) return String(val);
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatCurrencyInput(val) {
        if (val === null || val === undefined || val === '') return '';
        const num = parseFloat(val);
        if (isNaN(num)) return '';
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function parseCurrency(val) {
        if (!val) return null;
        if (typeof val === 'number') return val;
        const cleaned = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    }

    function formatDate(val) {
        if (!val || val === '-') return '-';
        if (typeof val === 'string' && val.includes('-') && val.length >= 10) {
            try {
                return new Date(val).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            } catch(e) { return val; }
        }
        return val;
    }

    function calcDeadline(terminoAta) {
        if (!terminoAta) return { days: null, label: '-' };
        const end = new Date(terminoAta);
        const now = new Date();
        const diffMs = end - now;
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return { days, label: `${days} dias` };
    }

    function formatCell(val, col, row) {
        if (col.type === 'currency') return formatCurrency(val);
        if (col.type === 'date') return formatDate(val);
        if (col.type === 'deadline') {
            const dl = calcDeadline(row.termino_ata);
            return dl.label;
        }
        if (col.type === 'number') {
            if (val === null || val === undefined) return '-';
            if (col.key === 'cod_cliente' || col.key === 'cod_bio') return String(val);
            return Number(val).toLocaleString('pt-BR');
        }
        return val !== null && val !== undefined && val !== '' ? String(val).trim() : '-';
    }

    function getCellClass(col, row) {
        if (col.type === 'deadline') {
            const dl = calcDeadline(row.termino_ata);
            if (dl.days === null) return '';
            return dl.days > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold';
        }
        if (col.type === 'actions') {
            return 'w-24';
        }
        return '';
    }

    // ==========================================
    // 3.5 Fetch KPIs
    // ==========================================
    async function fetchKpis() {
        try {
            const response = await fetch('/api/opme/kpis', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!response.ok) throw new Error('Erro ao buscar KPIs');
            const data = await response.json();
            
            document.getElementById('kpiCirurgiasRealizadas').textContent = Number(data.cirurgias_realizadas || 0).toLocaleString('pt-BR');
            document.getElementById('kpiCirurgiasEmAberto').textContent = Number(data.cirurgias_em_aberto || 0).toLocaleString('pt-BR');
            document.getElementById('kpiTotalRealizado').textContent = formatCurrency(data.total_cirurgias_realizadas);
            document.getElementById('kpiTotalAFaturar').textContent = formatCurrency(data.total_cirurgias_a_faturar);
            document.getElementById('kpiTotalFaturado').textContent = formatCurrency(data.total_faturado);
            document.getElementById('kpiContratos').textContent = `${data.contratos_ativos || 0} | ${data.contratos_inativos || 0}`;
        } catch (error) {
            console.error('Erro ao carregar KPIs:', error);
        }
    }

    // ==========================================
    // 4. Data Fetching
    // ==========================================
    async function fetchData() {
        const loading = document.getElementById('tableLoading');
        if (loading) loading.classList.remove('hidden');

        try {
            let url = tabEndpoints[state.currentTab];
            const params = new URLSearchParams();

            if (state.currentTab === 'contratos') {
                // Contratos não filtra por contrato (exibe todos ativos)
            } else if (state.currentTab === 'contratos_inativos') {
                params.set('inativos_only', 'true');
            } else if (state.selectedContract) {
                params.set('contrato', state.selectedContract.id_contrato);
            }

            if (params.toString()) url += '?' + params.toString();

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!response.ok) throw new Error('Erro ao buscar dados');
            
            state.rawData = await response.json();
            state.filters = {};
            state.pagination.current = 1;
            processData();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            const tbody = document.getElementById('opmeTableBody');
            const cols = tabColumns[state.currentTab];
            if (tbody) tbody.innerHTML = `<tr><td colspan="${cols.length}" class="px-6 py-12 text-center text-red-500">Erro ao carregar dados do servidor.</td></tr>`;
        } finally {
            if (loading) loading.classList.add('hidden');
        }
    }

    // ==========================================
    // 5. Pipeline: Filtro -> Ordenação -> Paginação
    // ==========================================
    function processData() {
        // 5.1 Filtros
        state.filteredData = state.rawData.filter(row => {
            for (let key in state.filters) {
                const selectedValues = state.filters[key];
                if (selectedValues && selectedValues.size > 0 && !selectedValues.has('__NONE__')) {
                    const val = row[key] !== null && row[key] !== undefined && row[key] !== '' ? row[key] : '(Vazio)';
                    if (!selectedValues.has(val) && !selectedValues.has(String(val))) {
                        return false;
                    }
                } else if (selectedValues && selectedValues.has('__NONE__')) {
                    return false;
                }
            }
            return true;
        });

        // 5.2 Ordenação
        if (state.sort.key) {
            const col = tabColumns[state.currentTab].find(c => c.key === state.sort.key);
            state.filteredData.sort((a, b) => {
                let va = a[state.sort.key];
                let vb = b[state.sort.key];

                // Deadline virtual
                if (state.sort.key === '_deadline') {
                    va = calcDeadline(a.termino_ata).days;
                    vb = calcDeadline(b.termino_ata).days;
                }

                const isNull = (v) => v === null || v === undefined || v === '' || v === '-';
                if (isNull(va) && isNull(vb)) return 0;
                if (isNull(va)) return 1;
                if (isNull(vb)) return -1;

                if (col && (col.type === 'currency' || col.type === 'number' || col.type === 'deadline')) {
                    va = parseFloat(va) || 0;
                    vb = parseFloat(vb) || 0;
                } else if (col && col.type === 'date') {
                    va = new Date(va).getTime();
                    vb = new Date(vb).getTime();
                } else {
                    va = String(va).toLowerCase();
                    vb = String(vb).toLowerCase();
                }

                if (va < vb) return state.sort.dir === 'asc' ? -1 : 1;
                if (va > vb) return state.sort.dir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // 5.3 Paginação
        state.pagination.total = state.filteredData.length;
        const start = (state.pagination.current - 1) * state.pagination.limit;
        state.viewData = state.filteredData.slice(start, start + state.pagination.limit);

        renderTable();
        renderPagination();
        updateResultsCount();
    }

    // ==========================================
    // 6. Render: Tabela
    // ==========================================
    function renderTable() {
        const cols = tabColumns[state.currentTab];
        renderTableHeader(cols);
        renderTableBody(cols);
    }

    function renderTableHeader(cols) {
        const thead = document.getElementById('opmeTableHead');
        if (!thead) return;

        let html = '<tr class="text-steel-600 dark:text-gray-300 text-[12px] font-medium">';
        cols.forEach(col => {
            const sortIcon = state.sort.key === col.key ? (state.sort.dir === 'asc' ? '↑' : '↓') : '↕';
            const hasFilter = state.filters[col.key] && state.filters[col.key].size > 0 && !state.filters[col.key].has('__NONE__');
            const hasNoneFilter = state.filters[col.key] && state.filters[col.key].has('__NONE__');
            const isFiltered = hasFilter || hasNoneFilter;
            const filterColor = isFiltered ? 'text-nexo-500' : 'text-steel-300 dark:text-steel-600 hover:text-steel-500';

            html += `
                <th class="px-3 py-2 border-b border-gray-200 dark:border-steel-700 whitespace-normal break-words h-[70px] select-none relative align-middle"
                     data-col="${col.key}">
                    <div class="flex items-center justify-center gap-1.5 w-full h-full px-4">
                        <div class="cursor-pointer hover:text-nexo-600 transition-colors text-center" onclick="OPME.handleSort('${col.key}')">
                            ${col.label} <span class="text-[10px] ml-1 opacity-50">${sortIcon}</span>
                        </div>
                        ${(col.key !== '_deadline' && col.type !== 'actions') ? `
                        <button onclick="event.stopPropagation(); OPME.openFilter(event, '${col.key}')" class="p-1 rounded focus:outline-none flex-shrink-0 ${filterColor} absolute right-2 top-1/2 -translate-y-1/2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
                            </svg>
                        </button>` : ''}
                    </div>
                </th>
            `;
        });
        html += '</tr>';
        thead.innerHTML = html;
    }

    function renderTableBody(cols) {
        const tbody = document.getElementById('opmeTableBody');
        if (!tbody) return;

        if (state.viewData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${cols.length}" class="px-6 py-16 text-center text-steel-400 dark:text-steel-500">
                <div class="flex flex-col items-center gap-2">
                    <svg class="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
                    <span class="text-sm">Nenhum registro encontrado</span>
                </div>
            </td></tr>`;
            return;
        }

        let html = '';
        state.viewData.forEach((row, idx) => {
            const isContratosTab = state.currentTab === 'contratos' || state.currentTab === 'contratos_inativos';
            const cursorClass = 'cursor-pointer';
            const hoverClass = 'h-[150px] hover:bg-nexo-50/80 dark:hover:bg-nexo-500/10 hover:shadow-md hover:scale-[1.001] relative z-0 hover:z-10 group';
            const clickHandler = `onclick="OPME.handleRowClick(${idx}, '${state.currentTab}')"`;

            html += `<tr class="${cursorClass} ${hoverClass} transition-all duration-200 border-b border-gray-100 dark:border-steel-700/50 bg-white dark:bg-steel-800"
                         ${clickHandler}>`;
            
            cols.forEach(col => {
                if (col.type === 'actions') {
                    const isInactive = row.inativo;
                    const toggleColor = isInactive ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30' : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30';
                    const toggleIcon = isInactive ? 
                        `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>` : 
                        `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>`;
                    const toggleTitle = isInactive ? 'Ativar Contrato' : 'Desativar Contrato';

                    html += `<td class="px-3 py-3 text-center align-middle w-24">
                        <div class="flex items-center justify-center gap-2">
                            <button onclick="event.stopPropagation(); OPME.openContratoModal(${idx})" class="p-1.5 rounded-lg text-nexo-600 hover:bg-nexo-50 dark:text-nexo-400 dark:hover:bg-nexo-900/30 transition-colors" title="Editar Contrato">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                            </button>
                            <button onclick="event.stopPropagation(); OPME.toggleContractStatus(${row.id}, ${isInactive})" class="p-1.5 rounded-lg transition-colors ${toggleColor}" title="${toggleTitle}">
                                ${toggleIcon}
                            </button>
                        </div>
                    </td>`;
                } else {
                    const val = formatCell(col.key === '_deadline' ? null : row[col.key], col, row);
                    const extraClass = getCellClass(col, row);
                    let alignClass = 'text-center';
                    let wrapClass = 'whitespace-nowrap';

                    if (col.key === 'produto' || col.key === 'descricao_personalizada' || col.key === 'descricao_item') {
                        alignClass = 'text-left';
                        wrapClass = 'whitespace-normal break-words min-w-[250px] max-w-[450px]';
                    }
                    
                    html += `<td class="px-3 py-3 text-[13px] align-middle text-steel-700 dark:text-gray-300 ${alignClass} ${wrapClass} ${extraClass}">${val}</td>`;
                }
            });
            html += '</tr>';
        });
        tbody.innerHTML = html;
    }

    // ==========================================
    // 7. Render: Paginação
    // ==========================================
    function renderPagination() {
        const container = document.getElementById('paginationContainer');
        if (!container) return;

        const totalPages = Math.ceil(state.pagination.total / state.pagination.limit) || 1;
        const current = state.pagination.current;

        let pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (current > 3) pages.push('...');
            for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) pages.push(i);
            if (current < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }

        let html = `
            <button onclick="OPME.goToPage(1)" class="p-1.5 rounded-lg ${current === 1 ? 'text-steel-300 dark:text-steel-600 cursor-not-allowed' : 'text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700'}" ${current === 1 ? 'disabled' : ''}>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
            </button>
            <button onclick="OPME.goToPage(${current - 1})" class="p-1.5 rounded-lg ${current === 1 ? 'text-steel-300 dark:text-steel-600 cursor-not-allowed' : 'text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700'}" ${current === 1 ? 'disabled' : ''}>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>`;

        pages.forEach(p => {
            if (p === '...') {
                html += `<span class="px-2 text-steel-400 text-sm">…</span>`;
            } else {
                const isActive = p === current;
                html += `<button onclick="OPME.goToPage(${p})" class="px-3 py-1 text-sm font-medium rounded transition-colors ${isActive ? 'bg-nexo-50 dark:bg-nexo-900/30 text-nexo-600 dark:text-nexo-400' : 'text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700'}">${p}</button>`;
            }
        });

        html += `
            <button onclick="OPME.goToPage(${current + 1})" class="p-1.5 rounded-lg ${current === totalPages ? 'text-steel-300 dark:text-steel-600 cursor-not-allowed' : 'text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700'}" ${current === totalPages ? 'disabled' : ''}>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
            <button onclick="OPME.goToPage(${totalPages})" class="p-1.5 rounded-lg ${current === totalPages ? 'text-steel-300 dark:text-steel-600 cursor-not-allowed' : 'text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700'}" ${current === totalPages ? 'disabled' : ''}>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
            </button>`;

        container.innerHTML = html;
    }

    function updateResultsCount() {
        const el = document.getElementById('resultsCount');
        if (el) {
            const start = ((state.pagination.current - 1) * state.pagination.limit) + 1;
            const end = Math.min(state.pagination.current * state.pagination.limit, state.pagination.total);
            el.textContent = state.pagination.total > 0
                ? `Mostrando ${start}-${end} de ${state.pagination.total.toLocaleString('pt-BR')} registros`
                : 'Nenhum registro';
        }
    }

    // ==========================================
    // 8. Filtros (Dropdown com Checkboxes)
    // ==========================================
    function openFilter(event, colKey) {
        event.stopPropagation();
        closeFilter(); // Fecha anterior se existir

        const cols = tabColumns[state.currentTab];
        const col = cols.find(c => c.key === colKey);
        if (!col) return;

        // Coleta valores únicos para essa coluna respeitando os filtros já aplicados (Cascata)
        const preFilteredData = state.rawData.filter(row => {
            for (let key in state.filters) {
                if (key === colKey) continue;
                const selectedValues = state.filters[key];
                if (selectedValues && selectedValues.size > 0 && !selectedValues.has('__NONE__')) {
                    const val = row[key] !== null && row[key] !== undefined && row[key] !== '' ? row[key] : '(Vazio)';
                    if (!selectedValues.has(val) && !selectedValues.has(String(val))) {
                        return false; 
                    }
                } else if (selectedValues && selectedValues.has('__NONE__')) {
                    return false;
                }
            }
            return true;
        });

        // Valores brutos, mapeados para '(Vazio)' se vazios
        const rawValuesMapped = preFilteredData.map(row => {
            return row[colKey] !== null && row[colKey] !== undefined && row[colKey] !== '' ? row[colKey] : '(Vazio)';
        });

        const uniqueValues = [...new Set(rawValuesMapped)].sort((a, b) => {
            if (a === '(Vazio)') return 1;
            if (b === '(Vazio)') return -1;
            if (typeof a === 'number' && typeof b === 'number') return a - b;
            return String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
        });

        if (!state.filters[colKey]) {
            state.filters[colKey] = new Set();
        }

        const modal = document.createElement('div');
        modal.id = 'filterModal';
        modal.className = 'absolute z-50 bg-white dark:bg-steel-800 rounded-lg shadow-xl border border-gray-200 dark:border-steel-700 w-64 flex flex-col font-sans text-sm animate-fade-in-up';

        modal.addEventListener('click', (e) => e.stopPropagation());

        const rect = event.currentTarget.getBoundingClientRect();
        let left = rect.left;
        if (left + 256 > window.innerWidth) left = window.innerWidth - 266;

        modal.style.top = `${rect.bottom + window.scrollY + 8}px`;
        modal.style.left = `${left}px`;

        modal.innerHTML = `
            <div class="p-3 border-b border-gray-100 dark:border-steel-700">
                <input type="text" id="filterSearchInput" placeholder="Pesquisar..." class="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-steel-900 border border-gray-200 dark:border-steel-600 rounded outline-none focus:ring-1 focus:ring-nexo-500 text-steel-700 dark:text-gray-200">
            </div>
            <div class="flex-1 max-h-48 overflow-y-auto p-2 custom-scrollbar" id="filterCheckboxList">
            </div>
            <div class="p-3 border-t border-gray-100 dark:border-steel-700 flex justify-between bg-gray-50 dark:bg-steel-800/50 rounded-b-lg">
                <button id="btnClearFilter" class="text-xs text-steel-500 hover:text-steel-700 dark:hover:text-gray-300 font-medium">Limpar</button>
                <button id="btnApplyFilter" class="text-xs bg-nexo-600 hover:bg-nexo-700 text-white px-3 py-1.5 rounded font-medium shadow-sm transition-colors">Aplicar</button>
            </div>
        `;

        document.body.appendChild(modal);
        activeFilterModal = modal;

        const listContainer = modal.querySelector('#filterCheckboxList');
        const searchInput = modal.querySelector('#filterSearchInput');

        const tempSelected = new Set(state.filters[colKey]);
        if (tempSelected.size === 0 || tempSelected.has('__NONE__')) {
            if (!tempSelected.has('__NONE__')) {
                uniqueValues.forEach(v => tempSelected.add(v));
            } else {
                tempSelected.clear();
            }
        }

        let expandedState = {};

        function renderCheckboxes(searchTerm = '') {
            listContainer.innerHTML = '';
            
            const filteredVals = uniqueValues.filter(v => {
                if (!searchTerm) return true;
                let displayVal = v;
                if (col.type === 'currency') displayVal = formatCurrency(v);
                if (col.type === 'date') displayVal = formatDate(v);
                return String(displayVal).toLowerCase().includes(searchTerm.toLowerCase());
            });

            if (filteredVals.length === 0) {
                listContainer.innerHTML = '<p class="text-xs text-steel-400 p-2 text-center">Nenhum valor encontrado.</p>';
                return;
            }

            const allChecked = filteredVals.length > 0 && filteredVals.every(v => tempSelected.has(v));
            const selectAllDiv = document.createElement('div');
            selectAllDiv.className = 'flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer mb-1 border-b border-gray-100 dark:border-steel-700';
            selectAllDiv.innerHTML = `
                <input type="checkbox" class="rounded border-gray-300 dark:border-steel-600 text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${allChecked ? 'checked' : ''}>
                <span class="font-medium text-steel-700 dark:text-gray-300">(Selecionar Tudo)</span>
            `;
            selectAllDiv.querySelector('input').onclick = (e) => {
                if (e.target.checked) {
                    filteredVals.forEach(v => tempSelected.add(v));
                } else {
                    filteredVals.forEach(v => tempSelected.delete(v));
                }
                renderCheckboxes(searchTerm);
            };
            listContainer.appendChild(selectAllDiv);

            if (col.type === 'date' && !searchTerm) {
                const tree = {};
                const monthsNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                
                filteredVals.forEach(val => {
                    let y, m, d;
                    if (val && String(val).includes('T')) {
                        const dt = new Date(val);
                        if (!isNaN(dt.getTime())) {
                            y = dt.getUTCFullYear().toString();
                            m = dt.getUTCMonth() + 1;
                            d = dt.getUTCDate().toString().padStart(2, '0');
                        }
                    } else if (val && String(val).includes('-') && val !== '-') {
                        const parts = String(val).split('T')[0].split('-');
                        if (parts.length === 3) {
                            y = parts[0];
                            m = parseInt(parts[1], 10);
                            d = parts[2];
                        }
                    }

                    if (y && m && d) {       
                        if (!tree[y]) tree[y] = {};
                        if (!tree[y][m]) tree[y][m] = [];
                        tree[y][m].push(val);
                    } else {
                        if (!tree['-']) tree['-'] = {};
                        if (!tree['-']['-']) tree['-']['-'] = [];
                        tree['-']['-'].push(val);
                    }
                });

                Object.keys(tree).sort((a,b) => b.localeCompare(a)).forEach(year => {
                    const yearDiv = document.createElement('div');
                    yearDiv.className = 'pl-1';
                    
                    let yearAllChecked = true;
                    let yearAnyChecked = false;
                    const yearVals = [];
                    Object.keys(tree[year]).forEach(m => tree[year][m].forEach(v => {
                        yearVals.push(v);
                        if (tempSelected.has(v)) yearAnyChecked = true;
                        else yearAllChecked = false;
                    }));

                    const yHeader = document.createElement('div');
                    yHeader.className = 'flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer mt-1';
                    yHeader.innerHTML = `
                        <span class="w-4 text-center text-steel-400 font-bold transition-transform transform select-none" style="font-size: 12px;">+</span>
                        <input type="checkbox" class="rounded border-gray-300 dark:border-steel-600 text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${yearAllChecked ? 'checked' : ''}>
                        <span class="font-semibold text-steel-700 dark:text-gray-300 text-xs">${year}</span>
                    `;
                    
                    const yCb = yHeader.querySelector('input');
                    yCb.indeterminate = yearAnyChecked && !yearAllChecked;
                    
                    const mContainer = document.createElement('div');
                    mContainer.className = 'hidden pl-2 border-l border-gray-100 dark:border-steel-700 ml-2.5 mt-0.5';
                    
                    yHeader.onclick = (e) => {
                        if (e.target === yCb) return;
                        const isHidden = mContainer.classList.contains('hidden');
                        expandedState[year] = isHidden;
                        mContainer.classList.toggle('hidden');
                        yHeader.querySelector('span').textContent = mContainer.classList.contains('hidden') ? '+' : '-';
                    };
                    
                    if (expandedState[year]) {
                        mContainer.classList.remove('hidden');
                        yHeader.querySelector('span').textContent = '-';
                    }

                    yCb.onclick = (e) => {
                        e.stopPropagation();
                        const isChecked = e.target.checked;
                        yearVals.forEach(v => isChecked ? tempSelected.add(v) : tempSelected.delete(v));
                        renderCheckboxes(searchTerm);
                    };

                    Object.keys(tree[year]).sort((a,b) => a.localeCompare(b)).forEach(month => {
                        const monthVals = tree[year][month];
                        const mName = (month !== '-' && !isNaN(month)) ? monthsNames[parseInt(month)-1] : month;
                        
                        let monthAllChecked = true;
                        let monthAnyChecked = false;
                        monthVals.forEach(v => {
                            if (tempSelected.has(v)) monthAnyChecked = true;
                            else monthAllChecked = false;
                        });

                        const mHeader = document.createElement('div');
                        mHeader.className = 'flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer';
                        mHeader.innerHTML = `
                            <span class="w-4 text-center text-steel-400 font-bold transition-transform transform select-none" style="font-size: 12px;">+</span>
                            <input type="checkbox" class="rounded border-gray-300 dark:border-steel-600 text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${monthAllChecked ? 'checked' : ''}>
                            <span class="text-steel-600 dark:text-gray-400 text-xs">${mName}</span>
                        `;

                        const mCb = mHeader.querySelector('input');
                        mCb.indeterminate = monthAnyChecked && !monthAllChecked;

                        const dContainer = document.createElement('div');
                        dContainer.className = 'hidden pl-3 border-l border-gray-100 dark:border-steel-700 ml-2.5 mt-0.5';
                        
                        const monthKey = `${year}-${month}`;
                        mHeader.onclick = (e) => {
                            if (e.target === mCb) return;
                            const isHidden = dContainer.classList.contains('hidden');
                            expandedState[monthKey] = isHidden;
                            dContainer.classList.toggle('hidden');
                            mHeader.querySelector('span').textContent = dContainer.classList.contains('hidden') ? '+' : '-';
                        };
                        
                        if (expandedState[monthKey]) {
                            dContainer.classList.remove('hidden');
                            mHeader.querySelector('span').textContent = '-';
                        }

                        mCb.onclick = (e) => {
                            e.stopPropagation();
                            const isChecked = e.target.checked;
                            monthVals.forEach(v => isChecked ? tempSelected.add(v) : tempSelected.delete(v));
                            renderCheckboxes(searchTerm);
                        };

                        monthVals.forEach(val => {
                            const isChecked = tempSelected.has(val);
                            const dHeader = document.createElement('div');
                            dHeader.className = 'flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer';
                            let displayVal = formatDate(val);
                            
                            const valStr = String(val);
                            if (valStr.includes('-') && valStr.split('-').length >= 3) {
                                const datePart = valStr.split('T')[0];
                                if (datePart.split('-').length === 3) {
                                    displayVal = datePart.split('-')[2];
                                }
                            } else if (valStr.includes('/') && valStr.split('/').length >= 3) {
                                const datePart = valStr.split(' ')[0];
                                if (datePart.split('/').length === 3) {
                                    displayVal = datePart.split('/')[0];
                                }
                            }
                            dHeader.innerHTML = `
                                <div class="w-3"></div>
                                <input type="checkbox" value="${val}" class="rounded border-gray-300 dark:border-steel-600 text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${isChecked ? 'checked' : ''}>
                                <span class="truncate text-steel-500 dark:text-gray-500 text-[11px]">${displayVal}</span>
                            `;
                            const dCb = dHeader.querySelector('input');
                            dHeader.onclick = (e) => {
                                if (e.target !== dCb) dCb.checked = !dCb.checked;
                                if (dCb.checked) tempSelected.add(val);
                                else tempSelected.delete(val);
                                renderCheckboxes(searchTerm);
                            };
                            dContainer.appendChild(dHeader);
                        });

                        mContainer.appendChild(mHeader);
                        mContainer.appendChild(dContainer);
                    });

                    yearDiv.appendChild(yHeader);
                    yearDiv.appendChild(mContainer);
                    listContainer.appendChild(yearDiv);
                });
            } else {
                filteredVals.forEach(val => {
                    const isChecked = tempSelected.has(val);

                    const div = document.createElement('div');
                    div.className = 'flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer';

                    let displayVal = val;
                    if (col.type === 'currency') displayVal = formatCurrency(val);
                    if (col.type === 'date') displayVal = formatDate(val);

                    div.innerHTML = `
                        <input type="checkbox" class="rounded border-gray-300 dark:border-steel-600 text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${isChecked ? 'checked' : ''}>
                        <span class="truncate text-steel-600 dark:text-gray-400 text-xs" title="${displayVal}">${displayVal}</span>
                    `;

                    const checkbox = div.querySelector('input');
                    div.onclick = (e) => {
                        if (e.target !== checkbox) checkbox.checked = !checkbox.checked;

                        if (checkbox.checked) {
                            tempSelected.add(val);
                        } else {
                            tempSelected.delete(val);
                        }
                        renderCheckboxes(searchTerm);
                    };

                    listContainer.appendChild(div);
                });
            }
        }

        renderCheckboxes();
        searchInput.focus();

        let hasTyped = false;
        searchInput.addEventListener('input', (e) => {
            if (!hasTyped && e.target.value.length > 0) {
                tempSelected.clear();
                hasTyped = true;
            }
            renderCheckboxes(e.target.value);
        });

        modal.querySelector('#btnApplyFilter').onclick = () => {
            if (tempSelected.size === uniqueValues.length) {
                state.filters[colKey].clear();
            } else if (tempSelected.size === 0) {
                state.filters[colKey] = new Set(['__NONE__']);
            } else {
                state.filters[colKey] = new Set(tempSelected);
            }
            state.pagination.current = 1;
            processData();
            closeFilter();
        };

        modal.querySelector('#btnClearFilter').onclick = () => {
            state.filters[colKey].clear();
            state.pagination.current = 1;
            processData();
            closeFilter();
        };
    }

    function closeFilter() {
        if (activeFilterModal) {
            activeFilterModal.remove();
            activeFilterModal = null;
        }
    }

    document.addEventListener('click', (e) => {
        if (activeFilterModal && !activeFilterModal.contains(e.target)) {
            closeFilter();
        }
    });

    // ==========================================
    // 9. Sort
    // ==========================================
    function handleSort(key) {
        if (state.sort.key === key) {
            state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
        } else {
            state.sort.key = key;
            state.sort.dir = 'asc';
        }
        processData();
    }

    // ==========================================
    // 10. Navegação de Abas
    // ==========================================
    function switchTab(tabId) {
        if (tabId !== 'contratos' && tabId !== 'contratos_inativos' && !state.selectedContract) return;

        state.currentTab = tabId;
        state.sort = { key: null, dir: 'desc' };
        state.filters = {};
        state.pagination.current = 1;

        // Atualizar UI das abas
        document.querySelectorAll('.opme-tab').forEach(btn => {
            const isActive = btn.dataset.tab === tabId;
            btn.classList.toggle('border-nexo-500', isActive);
            btn.classList.toggle('text-nexo-500', isActive);
            btn.classList.toggle('dark:text-nexo-400', isActive);
            btn.classList.toggle('border-transparent', !isActive);
            btn.classList.toggle('text-steel-500', !isActive);
        });

        // Atualizar UI das abas principais
        if (tabId === 'contratos' || tabId === 'contratos_inativos') {
            document.querySelectorAll('.main-tab').forEach(btn => {
                const isActive = btn.dataset.mainTab === tabId;
                btn.classList.toggle('border-nexo-500', isActive);
                btn.classList.toggle('text-nexo-600', isActive);
                btn.classList.toggle('dark:text-nexo-400', isActive);
                btn.classList.toggle('border-transparent', !isActive);
                btn.classList.toggle('text-steel-500', !isActive);
                btn.classList.toggle('hover:text-steel-700', !isActive);
                btn.classList.toggle('dark:hover:text-steel-300', !isActive);
            });
            
            const kpisContainer = document.getElementById('kpisContainer');
            if (kpisContainer) {
                if (tabId === 'contratos_inativos') {
                    kpisContainer.classList.add('hidden');
                } else {
                    kpisContainer.classList.remove('hidden');
                }
            }
        }

        // Controle do botão Inserir Cirurgia
        const btnNew = document.getElementById('btnNewCirurgia');
        if (btnNew) {
            if (tabId === 'cirurgias' && canEditCirurgia) {
                btnNew.classList.remove('hidden');
            } else {
                btnNew.classList.add('hidden');
            }
        }

        // Controle do botão Inserir Unidade
        const btnUnidade = document.getElementById('btnNewUnidade');
        if (btnUnidade) {
            if (tabId === 'unidades') {
                btnUnidade.classList.remove('hidden');
            } else {
                btnUnidade.classList.add('hidden');
            }
        }

        // Controle do botão Inserir Item Ata
        const btnSaldoAta = document.getElementById('btnNewSaldoAta');
        if (btnSaldoAta) {
            if (tabId === 'saldoata') {
                btnSaldoAta.classList.remove('hidden');
            } else {
                btnSaldoAta.classList.add('hidden');
            }
        }

        fetchData();
    }

    function selectContract(row) {
        state.selectedContract = row;
        
        // Habilitar abas
        document.querySelectorAll('.opme-tab[data-tab]:not([data-tab="contratos"])').forEach(btn => {
            btn.classList.remove('opacity-40', 'cursor-not-allowed');
            btn.classList.add('hover:text-nexo-400', 'hover:border-nexo-300');
        });

        // Ocultar KPIs e mostrar Container de Abas
        const kpisContainer = document.getElementById('kpisContainer');
        const mainTabsContainer = document.getElementById('mainTabsContainer');
        const tabsContainer = document.getElementById('tabsContainer');
        if (kpisContainer) kpisContainer.classList.add('hidden');
        if (mainTabsContainer) mainTabsContainer.classList.add('hidden');
        if (tabsContainer) tabsContainer.classList.remove('hidden');

        // Mostrar banner
        const banner = document.getElementById('contractBanner');
        if (banner) {
            const label = `${row.id_contrato} — ${(row.material || '').trim()} — ${(row.cliente || '').trim().substring(0, 60)}`;
            document.getElementById('contractBannerText').textContent = label;
            
            const badgeId = 'contractInactiveBadge';
            let badge = document.getElementById(badgeId);
            if (row.inativo) {
                if (!badge) {
                    document.getElementById('contractBannerText').insertAdjacentHTML('afterend', `<span id="${badgeId}" class="ml-3 px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded text-[10px] font-bold tracking-wider align-middle">INATIVO</span>`);
                }
            } else if (badge) {
                badge.remove();
            }

            banner.classList.remove('hidden');
        }

        // Navegar para aba Cirurgias
        switchTab('cirurgias');
    }

    function selectContractByIdx(idx) {
        const row = state.viewData[idx];
        if (row) selectContract(row);
    }

    function toggleContractStatus(id, currentStatus) {
        contractToToggle = { id, currentStatus };
        document.getElementById('toggleContractModalText').textContent = `Deseja realmente ${currentStatus ? 'ativar' : 'desativar'} este contrato?`;
        document.getElementById('toggleContractModal').classList.remove('hidden');
    }

    async function confirmToggleContract() {
        if (!contractToToggle) return;
        const { id, currentStatus } = contractToToggle;
        
        try {
            const btn = document.getElementById('btnConfirmToggle');
            const originalText = btn.textContent;
            btn.textContent = 'Aguarde...';
            btn.disabled = true;

            const response = await fetch(`/api/opme/contratos/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ inativo: !currentStatus })
            });
            
            if (!response.ok) throw new Error('Erro ao alterar status');
            
            // Recarregar dados
            fetchData();
            fetchKpis();
            
            document.getElementById('toggleContractModal').classList.add('hidden');
            contractToToggle = null;
            btn.textContent = originalText;
            btn.disabled = false;
        } catch (error) {
            console.error(error);
            showToast('Não foi possível alterar o status do contrato.', 'error');
            document.getElementById('btnConfirmToggle').textContent = 'Confirmar';
            document.getElementById('btnConfirmToggle').disabled = false;
        }
    }

    function clearContract() {
        state.selectedContract = null;

        // Desabilitar abas
        document.querySelectorAll('.opme-tab[data-tab]:not([data-tab="contratos"])').forEach(btn => {
            btn.classList.add('opacity-40', 'cursor-not-allowed');
            btn.classList.remove('hover:text-nexo-400', 'hover:border-nexo-300');
        });

        // Mostrar KPIs e ocultar Container de Abas
        const kpisContainer = document.getElementById('kpisContainer');
        const mainTabsContainer = document.getElementById('mainTabsContainer');
        const tabsContainer = document.getElementById('tabsContainer');
        if (mainTabsContainer) mainTabsContainer.classList.remove('hidden');
        if (tabsContainer) tabsContainer.classList.add('hidden');

        // Esconder banner
        const banner = document.getElementById('contractBanner');
        if (banner) banner.classList.add('hidden');

        // Volta para a aba que estávamos antes de entrar no detalhe (ativos ou inativos)
        // Por padrão vamos forçar voltar pra aba de contratos ativos se a atual não for inativos
        const targetTab = document.querySelector('.main-tab[data-main-tab="contratos_inativos"]').classList.contains('text-nexo-600') ? 'contratos_inativos' : 'contratos';
        switchTab(targetTab);
    }

    // ==========================================
    // 11. Clique na Linha
    // ==========================================
    function handleRowClick(idx, tab) {
        const row = state.viewData[idx];
        if (!row) return;

        if (tab === 'contratos' || tab === 'contratos_inativos') {
            contractToAccess = row;
            document.getElementById('accessContractModalText').textContent = `Tem certeza que deseja acessar o contrato ${row.id_contrato}?`;
            document.getElementById('accessContractModal').classList.remove('hidden');
        } else if (tab === 'cirurgias') {
            openCirurgiaModal(row);
        } else if (tab === 'unidades') {
            openUnidadeModal(idx);
        } else if (tab === 'saldoata') {
            openSaldoAtaModal(idx);
        } else {
            openDetailModal(row, tab);
        }
    }

    // ==========================================
    // 12. Modal de Detalhes
    // ==========================================
    function openDetailModal(row, tab) {
        const cols = tabColumns[tab];
        const allKeys = Object.keys(row).filter(k => k !== 'id');

        let fieldsHtml = '';
        allKeys.forEach(key => {
            const col = cols.find(c => c.key === key);
            const label = col ? col.label : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            let val = row[key];
            
            if (col && col.type === 'currency') val = formatCurrency(val);
            else if (col && col.type === 'date') val = formatDate(val);
            else if (val === null || val === undefined || val === '') val = '-';

            fieldsHtml += `
                <div class="py-2 px-1">
                    <dt class="text-[11px] font-semibold uppercase tracking-wider text-steel-400 dark:text-steel-500 mb-0.5">${label}</dt>
                    <dd class="text-sm text-steel-800 dark:text-gray-200 break-words">${val}</dd>
                </div>`;
        });

        const modal = document.getElementById('detailModal');
        const title = document.getElementById('detailModalTitle');
        const body = document.getElementById('detailModalBody');

        title.textContent = `Detalhes — ${tabLabels[tab]}`;
        body.innerHTML = `<dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 divide-y divide-gray-100 dark:divide-steel-700/50 sm:divide-y-0">${fieldsHtml}</dl>`;

        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');
            modal.querySelector('.modal-content').classList.add('scale-100', 'opacity-100');
        });
    }

    function closeDetailModal() {
        const modal = document.getElementById('detailModal');
        const content = modal.querySelector('.modal-content');
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 200);
    }

    // ==========================================
    // 13. Paginação
    // ==========================================
    function goToPage(page) {
        const totalPages = Math.ceil(state.pagination.total / state.pagination.limit) || 1;
        if (page < 1 || page > totalPages) return;
        state.pagination.current = page;
        processData();
    }

    // ==========================================
    // 14. Inicialização
    // ==========================================
    function init() {
        fetchKpis();
        fetchData();

        const selectLimit = document.getElementById('itemsPerPage');
        if (selectLimit) {
            selectLimit.addEventListener('change', (e) => {
                state.pagination.limit = parseInt(e.target.value);
                state.pagination.current = 1;
                processData();
            });
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    // ==========================================
    // 15. Lógica do Modal de Cirurgias (Agrupado)
    // ==========================================
    let unidadesCache = [];

    async function openNewCirurgiaModal() {
        if (!state.selectedContract) return;

        editingCirurgiaItems = []; // Flag de que é inserção

        const modal = document.getElementById('cirurgiaModal');
        const titleSpan = document.getElementById('cirurgiaModalSubtitle');
        const btnSave = document.getElementById('btnSaveCirurgia');
        const btnDelete = document.getElementById('btnDeleteCirurgia');

        document.getElementById('cirurgiaForm').reset();
        document.getElementById('cirurgiaProductsContainer').innerHTML = '';

        titleSpan.textContent = `Nova Cirurgia - ${state.selectedContract.id_contrato}`;

        // Preencher Campos Iniciais
        document.getElementById('fcContrato').value = state.selectedContract.id_contrato || '';
        
        // Buscar e preencher Unidades (Local da Cirurgia)
        try {
            const resUnidades = await fetch(`/api/opme/unidades?contrato=${state.selectedContract.id_contrato}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (resUnidades.ok) {
                unidadesCache = await resUnidades.json();
                const localSelect = document.getElementById('fcLocal');
                localSelect.innerHTML = '<option value="">Selecione...</option>';
                unidadesCache.forEach(u => {
                    localSelect.innerHTML += `<option value="${u.sigla}" data-cod="${u.cod_cliente}">${u.sigla}</option>`;
                });
                
                localSelect.onchange = function() {
                    const selectedOption = localSelect.options[localSelect.selectedIndex];
                    const codCliente = selectedOption.getAttribute('data-cod');
                    if (codCliente) {
                        document.getElementById('fcCodCliente').value = codCliente;
                    } else {
                        document.getElementById('fcCodCliente').value = '';
                    }
                };
            }
        } catch (err) {
            console.error('Erro ao carregar unidades:', err);
        }

        const dataInput = document.getElementById('fcData');
        if (typeof window.CustomDatepicker !== 'undefined') {
            window.CustomDatepicker.init(dataInput);
        } else if (typeof window.initCustomDatepickers === 'function') {
            window.initCustomDatepickers();
        }

        // Adiciona um bloco vazio e limpa IDs
        addCirurgiaProduct();

        if (canEditCirurgia) {
            btnSave.classList.remove('hidden');
            btnSave.textContent = 'Criar Cirurgia';
            document.querySelectorAll('#cirurgiaForm input:not([readonly]):not([disabled]), #cirurgiaForm select:not([readonly]):not([disabled])').forEach(el => el.disabled = false);
        }
        
        if (btnDelete) btnDelete.classList.add('hidden');

        // Resetar KPIs
        document.getElementById('fcTotalGlobal').textContent = 'R$ 0,00';

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        const content = modal.querySelector('.modal-content');
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
    }

    // ==========================================
    // Contrato Modal Functions
    // ==========================================
    let editingContratoId = null;

    function openContratoModal(idx = null) {
        const modal = document.getElementById('contratoModal');
        const titleSpan = document.getElementById('contratoModalTitle').querySelector('span');
        const form = document.getElementById('contratoForm');
        
        form.reset();
        
        const inputId = document.getElementById('fcContratoId');

        if (idx !== null) {
            // Edit mode
            const row = state.viewData[idx];
            editingContratoId = row.id;
            titleSpan.textContent = 'Editar Contrato: ' + (row.id_contrato || '');
            
            inputId.value = row.id_contrato || '';
            inputId.readOnly = true;
            inputId.classList.add('bg-gray-100', 'dark:bg-steel-800', 'cursor-not-allowed', 'text-gray-500');
            
            document.getElementById('fcContratoMaterial').value = row.material || '';
            document.getElementById('fcContratoCodCliente').value = row.cod_cliente || '';
            document.getElementById('fcContratoCliente').value = row.cliente || '';
            document.getElementById('fcContratoUf').value = row.uf || '';
            document.getElementById('fcContratoPregao').value = row.pregao || '';
            
            if (row.total_ata) {
                document.getElementById('fcContratoTotalAta').value = formatCurrency(row.total_ata).replace('R$ ', '');
            } else {
                document.getElementById('fcContratoTotalAta').value = '';
            }

            document.getElementById('fcContratoInicio').value = row.inicio_ata ? row.inicio_ata.split('T')[0] : '';
            document.getElementById('fcContratoTermino').value = row.termino_ata ? row.termino_ata.split('T')[0] : '';
        } else {
            // New mode
            editingContratoId = null;
            titleSpan.textContent = 'Novo Contrato';
            inputId.readOnly = false;
            inputId.classList.remove('bg-gray-100', 'dark:bg-steel-800', 'cursor-not-allowed', 'text-gray-500');
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        const content = modal.querySelector('.modal-content');
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
    }

    function closeContratoModal() {
        const modal = document.getElementById('contratoModal');
        const content = modal.querySelector('.modal-content');
        
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.getElementById('contratoForm').reset();
            editingContratoId = null;
        }, 300);
    }

    async function saveContrato() {
        const payload = {
            id_contrato: document.getElementById('fcContratoId').value.toUpperCase(),
            material: document.getElementById('fcContratoMaterial').value.toUpperCase(),
            cod_cliente: document.getElementById('fcContratoCodCliente').value,
            cliente: document.getElementById('fcContratoCliente').value.toUpperCase(),
            uf: document.getElementById('fcContratoUf').value,
            pregao: document.getElementById('fcContratoPregao').value.toUpperCase(),
            total_ata: document.getElementById('fcContratoTotalAta').value,
            inicio_ata: document.getElementById('fcContratoInicio').value,
            termino_ata: document.getElementById('fcContratoTermino').value
        };

        if (!payload.id_contrato || !payload.cliente) {
            showToast('Cód. Contrato e Cliente são obrigatórios', 'error');
            return;
        }

        const btnSave = document.getElementById('btnSaveContrato');
        const originalText = btnSave.textContent;
        btnSave.disabled = true;
        btnSave.textContent = 'Salvando...';

        try {
            const url = editingContratoId ? `/api/opme/contratos/${editingContratoId}` : '/api/opme/contratos';
            const method = editingContratoId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Erro ao salvar contrato');

            showToast(result.message, 'success');
            closeContratoModal();
            await fetchData();
        } catch (err) {
            console.error('Erro ao salvar contrato:', err);
            showToast(err.message, 'error');
        } finally {
            btnSave.disabled = false;
            btnSave.textContent = originalText;
        }
    }

    // ==========================================
    // Unidade Modal Functions
    // ==========================================
    let editingUnidadeId = null;

    function openUnidadeModal(idx = null) {
        const modal = document.getElementById('modalUnidade');
        const titleSpan = document.getElementById('unidadeModalTitle').querySelector('span');
        const form = document.getElementById('unidadeForm');
        
        form.reset();
        
        const inputContrato = document.getElementById('fcUnidadeContrato');
        
        if (idx !== null) {
            // Edit mode
            const row = state.viewData[idx];
            editingUnidadeId = row.id;
            titleSpan.textContent = 'Editar Unidade: ' + (row.sigla || row.hospital || row.id);
            
            inputContrato.value = row.contrato || '';
            document.getElementById('fcUnidadeCodCliente').value = row.cod_cliente || '';
            document.getElementById('fcUnidadeHospital').value = row.hospital || '';
            document.getElementById('fcUnidadeSigla').value = row.sigla || '';
        } else {
            // New mode
            editingUnidadeId = null;
            titleSpan.textContent = 'Nova Unidade';
            inputContrato.value = state.selectedContract ? state.selectedContract.id_contrato : '';
        }
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        setTimeout(() => {
            const content = modal.querySelector('.modal-content');
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
    }

    function closeUnidadeModal() {
        const modal = document.getElementById('modalUnidade');
        const content = modal.querySelector('.modal-content');
        
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.getElementById('unidadeForm').reset();
            editingUnidadeId = null;
        }, 300);
    }

    async function saveUnidade() {
        const payload = {
            contrato: document.getElementById('fcUnidadeContrato').value.toUpperCase(),
            cod_cliente: document.getElementById('fcUnidadeCodCliente').value,
            hospital: document.getElementById('fcUnidadeHospital').value.toUpperCase(),
            sigla: document.getElementById('fcUnidadeSigla').value.toUpperCase()
        };

        if (!payload.contrato) {
            showToast('Cód. Contrato é obrigatório', 'error');
            return;
        }

        try {
            const url = editingUnidadeId ? `/api/opme/unidades/${editingUnidadeId}` : '/api/opme/unidades';
            const method = editingUnidadeId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Erro ao salvar unidade');

            showToast(editingUnidadeId ? 'Unidade atualizada com sucesso' : 'Unidade criada com sucesso', 'success');
            closeUnidadeModal();
            await fetchData();
        } catch (err) {
            console.error('Erro ao salvar unidade:', err);
            showToast(err.message, 'error');
        }
    }

    async function openCirurgiaModal(row) {
        // Agrupar itens da mesma cirurgia
        const items = state.rawData.filter(r => 
            r.contrato === row.contrato && 
            r.paciente === row.paciente && 
            r.data_cirurgia === row.data_cirurgia
        );
        
        if (items.length === 0) return;
        editingCirurgiaItems = items;

        const ref = items[0]; // Referência para campos globais
        const modal = document.getElementById('cirurgiaModal');
        const titleSpan = document.getElementById('cirurgiaModalSubtitle');
        const btnSave = document.getElementById('btnSaveCirurgia');
        const btnDelete = document.getElementById('btnDeleteCirurgia');

        document.getElementById('cirurgiaForm').reset();
        document.getElementById('cirurgiaProductsContainer').innerHTML = '';

        titleSpan.textContent = `${ref.paciente} (${formatDate(ref.data_cirurgia)})`;

        // Preencher Campos Globais
        document.getElementById('fcContrato').value = ref.contrato || '';
        document.getElementById('fcAcao').value = ref.acao || '';
        document.getElementById('fcPaciente').value = ref.paciente || '';
        document.getElementById('fcProntuario').value = ref.prontuario || '';
        document.getElementById('fcMedico').value = ref.medico || '';
        document.getElementById('fcCRM').value = ref.crm || '';
        document.getElementById('fcCodCliente').value = ref.cod_cliente || '';

        // Buscar e preencher Unidades (Local da Cirurgia)
        try {
            if (ref.contrato) {
                const resUnidades = await fetch(`/api/opme/unidades?contrato=${ref.contrato}`, {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                if (resUnidades.ok) {
                    unidadesCache = await resUnidades.json();
                    const localSelect = document.getElementById('fcLocal');
                    localSelect.innerHTML = '<option value="">Selecione...</option>';
                    unidadesCache.forEach(u => {
                        localSelect.innerHTML += `<option value="${u.sigla}" data-cod="${u.cod_cliente}">${u.sigla}</option>`;
                    });
                    localSelect.value = ref.local_cirurgia || '';
                    
                    // Event listener para auto-preencher Cod. Cliente ao alterar o Local
                    localSelect.onchange = function() {
                        const selectedOption = localSelect.options[localSelect.selectedIndex];
                        const codCliente = selectedOption.getAttribute('data-cod');
                        if (codCliente) {
                            document.getElementById('fcCodCliente').value = codCliente;
                        }
                    };
                }
            }
        } catch (err) {
            console.error('Erro ao carregar unidades:', err);
        }

        // Configurar o datepicker customizado e inicializá-content
        const dataInput = document.getElementById('fcData');
        dataInput.value = ref.data_cirurgia ? ref.data_cirurgia.split('T')[0] : '';
        if (typeof window.CustomDatepicker !== 'undefined') {
            window.CustomDatepicker.init(dataInput);
        } else if (typeof window.initCustomDatepickers === 'function') {
            window.initCustomDatepickers();
        }

        // Preencher Faturamento e Status
        document.getElementById('fcEmpenho').value = ref.empenho || '';
        document.getElementById('fcAutorizacao').value = ref.autorizacao || '';
        document.getElementById('fcPedido').value = ref.pedido || '';
        document.getElementById('fcNotaFiscal').value = ref.nota_fiscal || '';
        document.getElementById('fcRetornoConsignacao').value = ref.retorno_consignacao || '';
        document.getElementById('fcStatusExpedicao').value = ref.status_expedicao || '';
        document.getElementById('fcAutorizacaoOpme').value = ref.autorizacao_opme || '';

        // Preencher Produtos
        items.forEach((item, index) => {
            renderProductBlock(item, index);
        });

        calculateTotalCirurgia();

        if (canEditCirurgia) {
            btnSave.classList.remove('hidden');
        } else {
            btnSave.classList.add('hidden');
        }

        if (canDeleteCirurgia) {
            btnDelete.classList.remove('hidden');
        } else {
            btnDelete.classList.add('hidden');
        }

        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');
            modal.querySelector('.modal-content').classList.add('scale-100', 'opacity-100');
        });
    }

    function renderProductBlock(item, idx) {
        const container = document.getElementById('cirurgiaProductsContainer');
        const idHtml = item.id ? `<input type="hidden" class="prod-id" value="${item.id}">` : '';
        const itemPregaoHtml = `<input type="hidden" class="prod-item-pregao" value="${item.item_pregao || ''}">`;
        const itemText = item.item_pregao ? ` - Item ${item.item_pregao}` : '';
        const titleText = (item.produto || 'NOVO PRODUTO') + itemText;
        
        const block = document.createElement('div');
        block.className = 'produto-box product-block border-l-4 border-l-nexo-500 border border-gray-200 dark:border-steel-600 rounded-lg bg-gray-50/50 dark:bg-steel-800/50 relative overflow-visible transition-all duration-300';
        
        block.innerHTML = `
            ${idHtml}
            ${itemPregaoHtml}
            <!-- Header (Collapsible) -->
            <div class="accordion-header flex items-center justify-between px-4 py-2.5 bg-white/60 dark:bg-steel-700/40 border-b border-gray-100 dark:border-steel-600 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-steel-700/60 select-none" onclick="OPME.toggleCirurgiaProduct(this)">
                <div class="flex items-center gap-2">
                    <svg class="accordion-icon w-4 h-4 text-steel-400 transition-transform -rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    <span class="prod-title-text text-xs font-bold text-nexo-600 dark:text-nexo-400 tracking-wide uppercase">${titleText}</span>
                </div>
                <div class="flex items-center gap-3">
                    <button type="button" onclick="event.stopPropagation(); OPME.removeCirurgiaProduct(this)" class="btn-remove-produto flex items-center gap-1 text-[11px] text-steel-400 hover:text-red-500 transition-colors" title="Remover Produto">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                        Remover
                    </button>
                </div>
            </div>
            
            <!-- Body -->
            <div class="accordion-body hidden">
                <div class="p-4 space-y-4">
                    <div class="flex gap-4">
                        <!-- Coluna Esquerda (50%) — Grid 2x3 -->
                        <div class="w-1/2 grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Cód. Bio</label>
                                <input type="number" onblur="OPME.fetchProdutoInfo(this)" onkeydown="if(event.key==='Enter'){event.preventDefault(); OPME.fetchProdutoInfo(this);}" class="prod-cod-bio w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all" value="${item.cod_bio || ''}">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Tipo de Cirurgia</label>
                                <input type="text" readonly tabindex="-1" class="prod-tipo w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-gray-100 dark:bg-steel-800 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 transition-all pointer-events-none" value="${item.classificacao || ''}">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Lote</label>
                                <input type="text" class="prod-lote w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all uppercase" value="${item.lote || ''}">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Quantidade</label>
                                <input type="number" oninput="OPME.calculateTotalCirurgia()" class="prod-qtde w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all text-right" value="${item.quantidade_utilizada || 0}">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Valor Unitário</label>
                                <input type="text" readonly tabindex="-1" class="prod-vlr-un w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-gray-100 dark:bg-steel-800 rounded-lg text-steel-800 dark:text-gray-200 outline-none transition-all text-right pointer-events-none" value="${formatCurrencyInput(item.valor_unitario)}">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Valor Total</label>
                                <input type="text" readonly tabindex="-1" class="prod-vlr-tot w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-gray-100 dark:bg-steel-800 rounded-lg text-steel-800 dark:text-gray-200 outline-none transition-all text-right font-semibold pointer-events-none" value="${formatCurrencyInput(item.valor_total)}">
                            </div>
                        </div>

                        <!-- Coluna Direita (50%) — Produto + Descrição -->
                        <div class="w-1/2 flex flex-col gap-3">
                            <div class="flex-1 flex flex-col">
                                <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Produto</label>
                                <textarea readonly tabindex="-1" class="prod-nome w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-gray-100 dark:bg-steel-800 rounded-lg text-steel-800 dark:text-gray-200 outline-none transition-all resize-none flex-1 pointer-events-none" style="min-height: 48px;">${item.produto || ''}</textarea>
                            </div>
                            <div class="flex-1 flex flex-col">
                                <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Descrição Personalizada</label>
                                <textarea readonly tabindex="-1" class="prod-desc w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-gray-100 dark:bg-steel-800 rounded-lg text-steel-800 dark:text-gray-200 outline-none transition-all resize-none flex-1 pointer-events-none" style="min-height: 48px;">${item.descricao_personalizada || ''}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(block);
    }

    function toggleCirurgiaProduct(headerEl) {
        const body = headerEl.nextElementSibling;
        const icon = headerEl.querySelector('svg');
        body.classList.toggle('hidden');
        if (body.classList.contains('hidden')) {
            icon.classList.remove('rotate-180');
        } else {
            icon.classList.add('rotate-180');
        }
    }

    function addCirurgiaProduct() {
        const currentCount = document.querySelectorAll('.product-block').length;
        renderProductBlock({
            quantidade_utilizada: 1,
            valor_unitario: 0,
            valor_total: 0
        }, currentCount);
    }

    function removeCirurgiaProduct(btn) {
        btn.closest('.product-block').remove();
        calculateTotalCirurgia();
    }

    function calculateTotalCirurgia() {
        let globalTotal = 0;
        document.querySelectorAll('.product-block').forEach(block => {
            const qtdeInput = block.querySelector('.prod-qtde');
            const vlrUnInput = block.querySelector('.prod-vlr-un');
            const vlrTotInput = block.querySelector('.prod-vlr-tot');
            
            const qtde = parseFloat(qtdeInput.value) || 0;
            const vlrUn = parseCurrency(vlrUnInput.value) || 0;
            
            const total = qtde * vlrUn;
            vlrTotInput.value = formatCurrencyInput(total);
            
            globalTotal += total;
        });
        document.getElementById('fcTotalGlobal').textContent = formatCurrency(globalTotal);
    }

    async function fetchProdutoInfo(input) {
        const block = input.closest('.produto-box');
        const codBio = input.value.trim();
        const contrato = document.getElementById('fcContrato').value;

        if (!codBio) return;
        if (!contrato) {
            showToast('Selecione um contrato antes de buscar o Cód. Bio.', 'warning');
            return;
        }

        try {
            const res = await fetch(`/api/opme/produto-info?cod_bio=${encodeURIComponent(codBio)}&contrato=${encodeURIComponent(contrato)}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (res.status === 404) {
                document.getElementById('errorModal').classList.remove('hidden');
                // Limpa os campos
                block.querySelector('.prod-tipo').value = '';
                block.querySelector('.prod-nome').value = '';
                block.querySelector('.prod-desc').value = '';
                block.querySelector('.prod-vlr-un').value = '';
                block.querySelector('.prod-item-pregao').value = '';
                
                block.querySelector('.prod-title-text').textContent = 'NOVO PRODUTO';
                calculateTotalCirurgia();
                return;
            }

            if (!res.ok) throw new Error('Erro ao buscar produto');

            const data = await res.json();
            
            block.querySelector('.prod-tipo').value = data.classificacao || '';
            block.querySelector('.prod-nome').value = data.produto || '';
            block.querySelector('.prod-desc').value = data.descricao_personalizada || '';
            block.querySelector('.prod-item-pregao').value = data.item_ata || '';
            block.querySelector('.prod-vlr-un').value = formatCurrencyInput(data.valor_unitario);

            const itemText = data.item_ata ? ` - Item ${data.item_ata}` : '';
            block.querySelector('.prod-title-text').textContent = (data.produto || 'NOVO PRODUTO') + itemText;

            calculateTotalCirurgia();
        } catch (err) {
            console.error(err);
            showToast('Erro ao buscar informações do produto.', 'error');
        }
    }

    function closeCirurgiaModal() {
        const modal = document.getElementById('cirurgiaModal');
        const content = modal.querySelector('.modal-content');
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }

    async function saveCirurgia() {
        if (!canEditCirurgia) return;

        // Capturar globais
        const commonData = {
            contrato: document.getElementById('fcContrato').value,
            acao: document.getElementById('fcAcao').value,
            local_cirurgia: document.getElementById('fcLocal').value.toUpperCase(),
            paciente: document.getElementById('fcPaciente').value.toUpperCase(),
            data_cirurgia: document.getElementById('fcData').value,
            prontuario: document.getElementById('fcProntuario').value,
            medico: document.getElementById('fcMedico').value.toUpperCase(),
            crm: document.getElementById('fcCRM').value.toUpperCase(),
            cod_cliente: document.getElementById('fcCodCliente').value,
            empenho: document.getElementById('fcEmpenho').value.toUpperCase(),
            autorizacao: document.getElementById('fcAutorizacao').value.toUpperCase(),
            pedido: document.getElementById('fcPedido').value,
            nota_fiscal: document.getElementById('fcNotaFiscal').value.toUpperCase(),
            retorno_consignacao: document.getElementById('fcRetornoConsignacao').value.toUpperCase(),
            status_expedicao: document.getElementById('fcStatusExpedicao').value.toUpperCase(),
            autorizacao_opme: document.getElementById('fcAutorizacaoOpme').value.toUpperCase(),
        };

        const itemsPayload = [];
        document.querySelectorAll('.product-block').forEach(block => {
            const idInput = block.querySelector('.prod-id');
            const itemData = {
                ...commonData, // Mesclar os dados comuns no item
                cod_bio: block.querySelector('.prod-cod-bio').value,
                classificacao: block.querySelector('.prod-tipo').value.toUpperCase(),
                produto: block.querySelector('.prod-nome').value,
                descricao_personalizada: block.querySelector('.prod-desc').value,
                quantidade_utilizada: block.querySelector('.prod-qtde').value,
                lote: block.querySelector('.prod-lote').value.toUpperCase(),
                valor_unitario: parseCurrency(block.querySelector('.prod-vlr-un').value),
                valor_total: parseCurrency(block.querySelector('.prod-vlr-tot').value),
                item_pregao: block.querySelector('.prod-item-pregao') ? block.querySelector('.prod-item-pregao').value || null : null
            };
            
            if (idInput && idInput.value) {
                itemData.id = idInput.value;
            }
            itemsPayload.push(itemData);
        });

        const isCreating = !editingCirurgiaItems || editingCirurgiaItems.length === 0;

        try {
            const btnSave = document.getElementById('btnSaveCirurgia');
            const originalText = btnSave.innerHTML;
            btnSave.innerHTML = '<svg class="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
            btnSave.disabled = true;

            const res = await fetch('/api/opme/cirurgias', {
                method: isCreating ? 'POST' : 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ items: itemsPayload })
            });

            if (!res.ok) throw new Error('Erro ao salvar cirurgia');
            
            showToast(isCreating ? 'Cirurgia criada com sucesso' : 'Cirurgia atualizada com sucesso', 'success');
            closeCirurgiaModal();
            fetchData(); // Recarrega os dados para atualizar a grid
            
            btnSave.innerHTML = originalText;
            btnSave.disabled = false;
        } catch (err) {
            console.error(err);
            showToast('Falha ao salvar. Tente novamente.', 'error');
            const btnSave = document.getElementById('btnSaveCirurgia');
            btnSave.textContent = isCreating ? 'Criar Cirurgia' : 'Salvar';
            btnSave.disabled = false;
        } finally {
            const btnSave = document.getElementById('btnSaveCirurgia');
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerHTML = 'Salvar Alterações';
            }
        }
    }

    function deleteCirurgia() {
        if (!canDeleteCirurgia) return;
        const ids = editingCirurgiaItems.map(i => i.id);
        if (!ids.length) return;

        const ref = editingCirurgiaItems[0];
        const rawDate = ref.data_cirurgia ? ref.data_cirurgia.split('T')[0] : '';
        let formattedDate = rawDate;
        if (rawDate) {
            const parts = rawDate.split('-');
            formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        
        const paciente = ref.paciente || '';
        const contrato = ref.contrato || '';
        const text = `Tem certeza que deseja excluir a cirurgia ${paciente} ${formattedDate} ${contrato}? Esta ação não pode ser desfeita.`;
        
        document.getElementById('deleteModalText').textContent = text;
        document.getElementById('deleteModal').classList.remove('hidden');
    }

    function closeDeleteModal() {
        document.getElementById('deleteModal').classList.add('hidden');
    }

    async function confirmDeleteCirurgia() {
        if (!canDeleteCirurgia) return;
        const ids = editingCirurgiaItems.map(i => i.id);
        if (!ids.length) return;

        try {
            const btnDelete = document.getElementById('btnConfirmDelete');
            btnDelete.disabled = true;

            const res = await fetch('/api/opme/cirurgias/batch-delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ ids })
            });

            if (!res.ok) throw new Error('Erro ao excluir cirurgia');
            
            showToast('Cirurgia excluída com sucesso', 'success');
            closeDeleteModal();
            closeCirurgiaModal();
            fetchData();
        } catch (err) {
            console.error(err);
            showToast('Falha ao excluir a cirurgia.', 'error');
        } finally {
            const btnDelete = document.getElementById('btnConfirmDelete');
            if (btnDelete) btnDelete.disabled = false;
        }
    }

    // ==========================================
    // 16. Modal de Saldo Ata
    // ==========================================
    let currentSaldoAtaEditId = null;

    function openSaldoAtaModal(idx) {
        const modal = document.getElementById('modalSaldoAta');
        const title = document.getElementById('saldoAtaModalTitle');
        const form = document.getElementById('saldoAtaForm');
        const container = document.getElementById('saldoAtaProductsContainer');
        const btnAdd = document.getElementById('btnAdicionarSaldoAtaBlock');

        form.reset();
        container.innerHTML = '';
        document.getElementById('fcSaldoAtaContrato').value = state.selectedContract ? state.selectedContract.id_contrato : '';

        if (idx !== null && idx !== undefined) {
            // Modo Edição
            const item = state.viewData[idx];
            if (!item) return;
            currentSaldoAtaEditId = item.id;
            title.innerHTML = `
                <svg class="h-5 w-5 text-nexo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar Item Ata
            `;
            btnAdd.classList.add('hidden'); // Ocultar botão de adicionar múltiplos no modo edição
            renderSaldoAtaBlock(item, 0, false); // Renderiza apenas 1 bloco sem botão de remover
        } else {
            // Modo Criação
            currentSaldoAtaEditId = null;
            title.innerHTML = `
                <svg class="h-5 w-5 text-nexo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Novo Item de Ata
            `;
            btnAdd.classList.remove('hidden');
            renderSaldoAtaBlock({}, 0, true); // Renderiza 1 bloco inicial
        }

        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');
            modal.querySelector('.modal-content').classList.add('scale-100', 'opacity-100');
        });
    }

    function closeSaldoAtaModal() {
        const modal = document.getElementById('modalSaldoAta');
        const content = modal.querySelector('.modal-content');
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            currentSaldoAtaEditId = null;
        }, 300);
    }

    function toggleSaldoAtaProduct(header) {
        const body = header.nextElementSibling;
        const icon = header.querySelector('.accordion-icon');
        if (body.classList.contains('hidden')) {
            body.classList.remove('hidden');
            icon.classList.remove('-rotate-90');
        } else {
            body.classList.add('hidden');
            icon.classList.add('-rotate-90');
        }
    }

    function renderSaldoAtaBlock(item, idx, canRemove) {
        const container = document.getElementById('saldoAtaProductsContainer');
        const block = document.createElement('div');
        block.className = 'saldoata-block border-l-4 border-l-nexo-500 border border-gray-200 dark:border-steel-600 rounded-lg bg-gray-50/50 dark:bg-steel-800/50 relative overflow-visible transition-all duration-300';
        
        let removeBtnHtml = '';
        if (canRemove) {
            removeBtnHtml = `
                <button type="button" onclick="event.stopPropagation(); OPME.removeSaldoAtaProduct(this)" class="btn-remove-produto flex items-center gap-1 text-[11px] text-steel-400 hover:text-red-500 transition-colors" title="Remover Item">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                    Remover
                </button>
            `;
        }

        block.innerHTML = `
            <div class="accordion-header flex items-center justify-between px-4 py-2.5 bg-white/60 dark:bg-steel-700/40 border-b border-gray-100 dark:border-steel-600 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-steel-700/60 select-none" onclick="OPME.toggleSaldoAtaProduct(this)">
                <div class="flex items-center gap-2">
                    <svg class="accordion-icon w-4 h-4 text-steel-400 transition-transform ${item.id ? '' : '-rotate-90'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    <span class="text-xs font-bold text-nexo-600 dark:text-nexo-400 tracking-wide uppercase">ITEM ATA ${item.item_ata ? '- ' + item.item_ata : ''}</span>
                </div>
                <div class="flex items-center gap-3">
                    ${removeBtnHtml}
                </div>
            </div>
            
            <div class="accordion-body ${item.id ? '' : 'hidden'}">
                <div class="p-4 flex gap-4">
                    <!-- Coluna da Esquerda (50%) -->
                    <div class="w-1/2 grid grid-cols-2 gap-4">
                        <!-- Linha 1 -->
                        <div>
                            <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Item Ata</label>
                            <input type="text" class="sa-item-ata w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all uppercase" value="${item.item_ata || ''}">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Qtde Ata</label>
                            <input type="number" step="0.01" oninput="OPME.calculateTotalSaldoAta(this)" class="sa-qtde w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all" value="${item.quantidade_ata || ''}">
                        </div>
                        <!-- Linha 2 -->
                        <div>
                            <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Vlr. Unitário</label>
                            <input type="text" oninput="formatCurrencyLive(this); OPME.calculateTotalSaldoAta(this)" class="sa-vlrunit w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all" value="${item.valor_unitario ? formatCurrencyInput(item.valor_unitario) : ''}">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Vlr. Total</label>
                            <input type="text" readonly class="sa-vlrtot w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-gray-100 dark:bg-steel-800 rounded-lg text-steel-800 dark:text-gray-200 outline-none transition-all cursor-not-allowed" value="${item.valor_total ? formatCurrencyInput(item.valor_total) : ''}">
                        </div>
                    </div>
                    
                    <!-- Coluna da Direita (50%) -->
                    <div class="w-1/2 flex flex-col">
                        <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Descrição do Item</label>
                        <textarea class="sa-descricao custom-scrollbar w-full flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all uppercase resize-none">${item.descricao_item || ''}</textarea>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(block);
        
        if (!item.id) {
            // Expandir automaticamente o último se for novo e fechar os outros
            const allBodies = container.querySelectorAll('.accordion-body');
            allBodies.forEach(b => {
                b.classList.add('hidden');
                b.previousElementSibling.querySelector('.accordion-icon').classList.add('-rotate-90');
            });
            const lastBody = block.querySelector('.accordion-body');
            lastBody.classList.remove('hidden');
            lastBody.previousElementSibling.querySelector('.accordion-icon').classList.remove('-rotate-90');
        }
    }

    function addSaldoAtaProduct() {
        renderSaldoAtaBlock({}, 0, true);
    }

    function removeSaldoAtaProduct(btn) {
        btn.closest('.saldoata-block').remove();
    }

    function calculateTotalSaldoAta(input) {
        const block = input.closest('.saldoata-block');
        const qtdeStr = block.querySelector('.sa-qtde').value;
        const qtde = parseFloat(qtdeStr) || 0;
        
        const vlrUnStr = block.querySelector('.sa-vlrunit').value;
        const vlrUn = parseCurrency(vlrUnStr) || 0;
        
        const total = qtde * vlrUn;
        block.querySelector('.sa-vlrtot').value = formatCurrencyInput(total);
    }

    async function saveSaldoAta() {
        const contrato = document.getElementById('fcSaldoAtaContrato').value;
        if (!contrato) return showToast('Selecione um contrato antes de salvar.', 'warning');

        const blocks = document.querySelectorAll('.saldoata-block');
        if (blocks.length === 0) return showToast('Adicione pelo menos um item.', 'warning');

        let items = [];
        let hasError = false;

        blocks.forEach(block => {
            const item_ata = block.querySelector('.sa-item-ata').value.trim();
            const descricao_item = block.querySelector('.sa-descricao').value.trim();
            const quantidade_ata = parseFloat(block.querySelector('.sa-qtde').value) || 0;
            const valor_unitario = parseCurrency(block.querySelector('.sa-vlrunit').value) || 0;
            const valor_total = parseCurrency(block.querySelector('.sa-vlrtot').value) || 0;

            items.push({
                contrato,
                item_ata,
                descricao_item,
                quantidade_ata,
                valor_unitario,
                valor_total
            });
        });

        if (hasError) return;

        try {
            const btn = document.querySelector('#modalSaldoAta button:last-child');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = 'Aguarde...';
            btn.disabled = true;

            let url = '/api/opme/saldo-ata';
            let method = 'POST';
            let bodyData = { items };

            if (currentSaldoAtaEditId) {
                url = `/api/opme/saldo-ata/${currentSaldoAtaEditId}`;
                method = 'PUT';
                bodyData = items[0]; // Na edição, enviamos apenas 1 objeto, não um array
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify(bodyData)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Erro ao salvar item(s)');
            }

            showToast(`Item(s) ${currentSaldoAtaEditId ? 'atualizado' : 'cadastrado'}(s) com sucesso!`, 'success');
            closeSaldoAtaModal();
            fetchData(); // Recarrega o grid

        } catch (err) {
            console.error('[OPME] Erro:', err);
            showToast(err.message, 'error');
        } finally {
            const btn = document.querySelector('#modalSaldoAta button:last-child');
            btn.innerHTML = `
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Salvar
            `;
            btn.disabled = false;
        }
    }

    // API pública
    return {
        openContratoModal,
        closeContratoModal,
        saveContrato,
        openUnidadeModal,
        closeUnidadeModal,
        saveUnidade,
        handleSort,
        openFilter,
        closeFilter,
        switchTab,
        clearContract,
        handleRowClick,
        closeDetailModal,
        openCirurgiaModal,
        openNewCirurgiaModal,
        closeCirurgiaModal,
        toggleCirurgiaProduct,
        addCirurgiaProduct,
        removeCirurgiaProduct,
        calculateTotalCirurgia,
        saveCirurgia,
        deleteCirurgia,
        closeDeleteModal,
        confirmDeleteCirurgia,
        fetchProdutoInfo,
        goToPage,
        selectContractByIdx,
        toggleContractStatus,
        openSaldoAtaModal,
        closeSaldoAtaModal,
        toggleSaldoAtaProduct,
        addSaldoAtaProduct,
        removeSaldoAtaProduct,
        calculateTotalSaldoAta,
        saveSaldoAta,
        closeAccessContractModal: () => {
            contractToAccess = null;
            document.getElementById('accessContractModal').classList.add('hidden');
        },
        confirmAccessContract: () => {
            if (contractToAccess) {
                selectContract(contractToAccess);
                contractToAccess = null;
                document.getElementById('accessContractModal').classList.add('hidden');
            }
        },
        closeToggleContractModal: () => {
            contractToToggle = null;
            document.getElementById('toggleContractModal').classList.add('hidden');
        },
        confirmToggleContract
    };
})();
