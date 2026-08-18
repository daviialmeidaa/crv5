/**
 * Cirurgias OPME - Frontend Controller
 * Sistema de abas com grids filtráveis: Contratos, Cirurgias, Unidades, Saldo Ata, Saldo Ata Hospital, Banco de Códigos.
 */
const OPME = (() => {

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
                // Contratos não filtra por contrato (exibe todos)
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
                const selected = state.filters[key];
                if (selected && selected.size > 0) {
                    if (selected.has('__NONE__')) return false;
                    const val = row[key] !== null && row[key] !== undefined ? String(row[key]).trim() : '-';
                    if (!selected.has(val)) return false;
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

        let html = '<tr>';
        cols.forEach(col => {
            const isSorted = state.sort.key === col.key;
            const arrow = isSorted ? (state.sort.dir === 'asc' ? '↑' : '↓') : '';
            const hasFilter = state.filters[col.key] && state.filters[col.key].size > 0;
            const filterColor = hasFilter ? 'text-nexo-400' : 'text-steel-400 dark:text-steel-500 opacity-0 group-hover:opacity-100';

            html += `
                <th class="group relative px-3 py-3 h-[50px] text-center text-[11px] font-semibold uppercase tracking-wider text-steel-500 dark:text-steel-400 whitespace-normal break-words cursor-pointer select-none border-b border-gray-200 dark:border-steel-700 bg-gray-50 dark:bg-steel-800/50 transition-colors hover:bg-gray-100 dark:hover:bg-steel-700/50"
                     data-col="${col.key}">
                    <div class="flex items-center justify-center w-full h-full" onclick="OPME.handleSort('${col.key}')">
                        <span>${col.label}</span>
                        ${arrow ? `<span class="ml-1 text-nexo-400">${arrow}</span>` : ''}
                    </div>
                    ${(col.key !== '_deadline' && col.type !== 'actions') ? `
                    <button class="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded transition-all ${filterColor}"
                            onclick="event.stopPropagation(); OPME.openFilter('${col.key}')">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
                        </svg>
                    </button>` : ''}
                </th>`;
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
            const isContratosTab = state.currentTab === 'contratos';
            const cursorClass = isContratosTab ? '' : 'cursor-pointer';
            const hoverClass = 'hover:bg-nexo-50/80 dark:hover:bg-nexo-500/10 hover:shadow-md hover:scale-[1.001] relative z-0 hover:z-10 group';
            const clickHandler = isContratosTab ? '' : `onclick="OPME.handleRowClick(${idx}, '${state.currentTab}')"`;

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

                    html += `<td class="px-3 py-3 text-center w-24">
                        <div class="flex items-center justify-center gap-2">
                            <button onclick="event.stopPropagation(); OPME.selectContractByIdx(${idx})" class="p-1.5 text-steel-500 hover:text-nexo-600 hover:bg-nexo-50 dark:text-steel-400 dark:hover:text-nexo-400 dark:hover:bg-steel-700 rounded-lg transition-colors" title="Acessar Contrato">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            </button>
                            <button onclick="event.stopPropagation(); OPME.toggleContractStatus(${row.id}, ${isInactive})" class="p-1.5 rounded-lg transition-colors ${toggleColor}" title="${toggleTitle}">
                                ${toggleIcon}
                            </button>
                        </div>
                    </td>`;
                } else {
                    const val = formatCell(col.key === '_deadline' ? null : row[col.key], col, row);
                    const extraClass = getCellClass(col, row);
                    const alignClass = (col.type === 'currency' || col.type === 'number' || col.type === 'deadline') ? 'text-right' : 'text-center';
                    
                    html += `<td class="px-3 py-3 text-[13px] text-steel-700 dark:text-gray-300 ${alignClass} whitespace-nowrap ${extraClass}">${val}</td>`;
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
                html += `<button onclick="OPME.goToPage(${p})" class="w-8 h-8 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-nexo-500 text-white shadow-sm' : 'text-steel-600 dark:text-steel-400 hover:bg-gray-100 dark:hover:bg-steel-700'}">${p}</button>`;
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
    function openFilter(colKey) {
        closeFilter();

        const cols = tabColumns[state.currentTab];
        const col = cols.find(c => c.key === colKey);
        if (!col) return;

        // Coletar valores únicos
        const valuesSet = new Set();
        state.rawData.forEach(row => {
            let val = row[colKey];
            if (col.type === 'date') val = formatDate(val);
            else val = val !== null && val !== undefined && val !== '' ? String(val).trim() : '-';
            valuesSet.add(val);
        });
        const sortedValues = [...valuesSet].sort((a, b) => {
            if (a === '-') return 1;
            if (b === '-') return 1;
            return a.localeCompare(b, 'pt-BR');
        });

        const selected = state.filters[colKey] || new Set();
        const allSelected = selected.size === 0;

        // Encontrar a posição do th
        const th = document.querySelector(`th[data-col="${colKey}"]`);
        if (!th) return;
        const rect = th.getBoundingClientRect();

        const modal = document.createElement('div');
        modal.id = 'filterModal';
        modal.className = 'fixed z-50';
        modal.style.top = `${rect.bottom + 4}px`;
        modal.style.left = `${Math.max(8, rect.left - 60)}px`;

        let listHtml = '';
        sortedValues.forEach(val => {
            const checked = allSelected || selected.has(val) ? 'checked' : '';
            const escaped = val.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            listHtml += `
                <label class="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-steel-700 cursor-pointer text-sm text-steel-700 dark:text-gray-300 transition-colors">
                    <input type="checkbox" value="${escaped}" ${checked} class="filter-cb rounded border-gray-300 dark:border-steel-600 text-nexo-500 focus:ring-nexo-400 focus:ring-offset-0">
                    <span class="truncate">${val}</span>
                </label>`;
        });

        modal.innerHTML = `
            <div class="bg-white dark:bg-steel-800 rounded-xl shadow-2xl border border-gray-200 dark:border-steel-700 w-64 max-h-80 flex flex-col overflow-hidden animate-fadeIn">
                <div class="px-3 py-2 border-b border-gray-100 dark:border-steel-700 flex items-center justify-between">
                    <span class="text-xs font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wider">${col.label}</span>
                    <button onclick="OPME.closeFilter()" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-steel-700 text-steel-400">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <label class="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-steel-700 cursor-pointer text-sm font-medium text-nexo-600 dark:text-nexo-400">
                    <input type="checkbox" id="filterSelectAll" ${allSelected ? 'checked' : ''} class="rounded border-gray-300 dark:border-steel-600 text-nexo-500 focus:ring-nexo-400 focus:ring-offset-0">
                    <span>(Selecionar Tudo)</span>
                </label>
                <div class="overflow-y-auto custom-scrollbar flex-1">
                    ${listHtml}
                </div>
                <div class="px-3 py-2 border-t border-gray-100 dark:border-steel-700">
                    <button onclick="OPME.applyFilter('${colKey}')" class="w-full py-1.5 bg-nexo-600 hover:bg-nexo-700 text-white text-sm font-medium rounded-lg transition-colors">Aplicar</button>
                </div>
            </div>`;

        document.body.appendChild(modal);
        activeFilterModal = colKey;

        // Select All toggle
        const selectAllCb = modal.querySelector('#filterSelectAll');
        const checkboxes = modal.querySelectorAll('.filter-cb');
        selectAllCb.addEventListener('change', () => {
            checkboxes.forEach(cb => cb.checked = selectAllCb.checked);
        });

        // Click outside
        setTimeout(() => {
            document.addEventListener('click', handleFilterOutsideClick);
        }, 10);
    }

    function handleFilterOutsideClick(e) {
        const modal = document.getElementById('filterModal');
        if (modal && !modal.contains(e.target) && !e.target.closest('th')) {
            closeFilter();
        }
    }

    function closeFilter() {
        const modal = document.getElementById('filterModal');
        if (modal) modal.remove();
        activeFilterModal = null;
        document.removeEventListener('click', handleFilterOutsideClick);
    }

    function applyFilter(colKey) {
        const modal = document.getElementById('filterModal');
        if (!modal) return;

        const selectAll = modal.querySelector('#filterSelectAll');
        if (selectAll && selectAll.checked) {
            delete state.filters[colKey];
        } else {
            const checked = modal.querySelectorAll('.filter-cb:checked');
            if (checked.length === 0) {
                state.filters[colKey] = new Set(['__NONE__']);
            } else {
                const values = new Set();
                checked.forEach(cb => values.add(cb.value));
                state.filters[colKey] = values;
            }
        }

        closeFilter();
        state.pagination.current = 1;
        processData();
    }

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
        if (tabId !== 'contratos' && !state.selectedContract) return;

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
        const tabsContainer = document.getElementById('tabsContainer');
        if (kpisContainer) kpisContainer.classList.add('hidden');
        if (tabsContainer) tabsContainer.classList.remove('hidden');

        // Mostrar banner
        const banner = document.getElementById('contractBanner');
        if (banner) {
            const label = `${row.id_contrato} — ${(row.material || '').trim()} — ${(row.cliente || '').trim().substring(0, 60)}`;
            document.getElementById('contractBannerText').textContent = label;
            banner.classList.remove('hidden');
        }

        // Navegar para aba Cirurgias
        switchTab('cirurgias');
    }

    function selectContractByIdx(idx) {
        const row = state.viewData[idx];
        if (row) selectContract(row);
    }

    async function toggleContractStatus(id, currentStatus) {
        if (!confirm(`Deseja realmente ${currentStatus ? 'ativar' : 'desativar'} este contrato?`)) return;
        
        try {
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
        } catch (error) {
            console.error(error);
            alert('Não foi possível alterar o status do contrato.');
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
        const tabsContainer = document.getElementById('tabsContainer');
        if (kpisContainer) kpisContainer.classList.remove('hidden');
        if (tabsContainer) tabsContainer.classList.add('hidden');

        // Esconder banner
        const banner = document.getElementById('contractBanner');
        if (banner) banner.classList.add('hidden');

        switchTab('contratos');
    }

    // ==========================================
    // 11. Clique na Linha
    // ==========================================
    function handleRowClick(idx, tab) {
        const row = state.viewData[idx];
        if (!row) return;

        if (tab === 'contratos') {
            selectContract(row);
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

    // API pública
    return {
        handleSort,
        openFilter,
        closeFilter,
        applyFilter,
        switchTab,
        clearContract,
        handleRowClick,
        closeDetailModal,
        goToPage,
        selectContractByIdx,
        toggleContractStatus
    };
})();
