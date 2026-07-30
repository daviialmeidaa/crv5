/**
 * Agenda de Licitações - Frontend Controller v2
 * Grid idêntico ao Contas a Receber: filtros em cascata, tipografia, hover, paginação.
 * Modal de Contrato ao clicar no número do contrato.
 */
const AL = (() => {

    // ==========================================
    // 1. Definição das Colunas
    // ==========================================
    const columns = [
        { key: 'data_limite', label: 'Data Limite da Proposta', type: 'date' },
        { key: 'hora_limite', label: 'Hora Limite da Proposta' },
        { key: 'data_lances', label: 'Data dos Lances', type: 'date' },
        { key: 'hora_lances', label: 'Horário dos Lances' },
        { key: 'modalidade', label: 'Modalidade' },
        { key: 'pregao', label: 'Nº do Pregão' },
        { key: 'orgao', label: 'Órgão/Instituição' },
        { key: 'uf', label: 'UF' },
        { key: 'categoria', label: 'Categoria/Classe do Material' },
        { key: 'objeto', label: 'Objeto/Especialidade' },
        { key: 'portal', label: 'Portal/Plataforma do Pregão' },
        { key: 'data_cadastro', label: 'Data de Cadastro da Proposta', type: 'date' },
        { key: 'observacoes_status', label: 'Observações/Status' },
        { key: 'antecedencia', label: 'Antecedência do Cadastro (Dia Útil)', type: 'number' }
    ];

    // ==========================================
    // 2. Estado Global
    // ==========================================
    const state = {
        rawData: [],
        filteredData: [],
        viewData: [],
        filters: {},
        sort: { key: null, dir: 'desc' },
        pagination: { current: 1, limit: 25, total: 0 }
    };

    let currentTab = 'NEXOMED';
    let activeFilterModal = null;

    // ==========================================
    // 3. Helpers e Permissões
    // ==========================================
    let userRole = '';
    try {
        const u = JSON.parse(localStorage.getItem('user'));
        if (u && u.role) userRole = u.role;
    } catch(e) {}
    const canDelete = ['ADMIN', 'LC3', 'LC4'].includes(userRole);

    function formatCurrency(val) {
        if (val === null || val === undefined || val === '' || val === '-') return '-';
        const num = parseFloat(val);
        if (isNaN(num)) return val;
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatDate(val) {
        if (!val || val === '-') return '-';
        if (typeof val === 'string' && val.includes('-') && val.length >= 10) {
            const parts = val.split('T')[0].split('-');
            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return val;
    }

    function getStatusBadge(v) {
        if (!v || v === '-') return '-';
        return String(v).toUpperCase();
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.className = `toast ${type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-amber-500' : 'bg-emerald-600'} text-white`;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
    }

    function getToken() { return localStorage.getItem('token'); }

    // ==========================================
    // 4. Data Fetching
    // ==========================================
    async function fetchData() {
        document.getElementById('tableLoading').classList.remove('hidden');
        try {
            const param = `?empresa=${currentTab}`;
            const response = await fetch(`/api/agenda_licitacoes${param}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!response.ok) throw new Error('Erro ao buscar dados');
            state.rawData = await response.json();
            state.filters = {};
            state.pagination.current = 1;
            processData();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            showToast('Erro ao carregar dados do servidor', 'error');
            document.getElementById('alTableBody').innerHTML = `<tr><td colspan="${columns.length + 1}" class="px-6 py-12 text-center text-red-500">Erro ao carregar dados do servidor.</td></tr>`;
        } finally {
            document.getElementById('tableLoading').classList.add('hidden');
        }
    }

    // ==========================================
    // 6. Pipeline: Filtro -> Ordenação -> Paginação
    // ==========================================
    function processData() {
        // 6.1 Filtros em cascata
        state.filteredData = state.rawData.filter(row => {
            for (let key in state.filters) {
                const selected = state.filters[key];
                if (selected && selected.size > 0) {
                    if (selected.has('__NONE__')) { return false; }
                    const val = row[key] !== null && row[key] !== undefined ? String(row[key]) : '-';
                    if (!selected.has(val)) return false;
                }
            }
            return true;
        });

        // 6.2 Ordenação
        if (state.sort.key) {
            // Ordenação por coluna selecionada pelo usuário
            const col = columns.find(c => c.key === state.sort.key);
            const dir = state.sort.dir === 'asc' ? 1 : -1;
            state.filteredData.sort((a, b) => {
                let valA = a[state.sort.key];
                let valB = b[state.sort.key];
                const aEmpty = valA === null || valA === undefined || valA === '' || valA === '-';
                const bEmpty = valB === null || valB === undefined || valB === '' || valB === '-';
                if (aEmpty && bEmpty) return 0;
                if (aEmpty) return 1;
                if (bEmpty) return -1;
                if (col && col.type === 'currency') { valA = parseFloat(valA) || 0; valB = parseFloat(valB) || 0; }
                else if (col && col.type === 'number') { valA = parseInt(valA) || 0; valB = parseInt(valB) || 0; }
                else { valA = String(valA).toLowerCase(); valB = String(valB).toLowerCase(); }
                if (valA < valB) return -1 * dir;
                if (valA > valB) return 1 * dir;
                return 0;
            });
        }

        // 6.3 Paginação
        state.pagination.total = state.filteredData.length;
        const totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        if (state.pagination.current > totalPages) state.pagination.current = Math.max(1, totalPages);
        const start = (state.pagination.current - 1) * state.pagination.limit;
        state.viewData = state.filteredData.slice(start, start + state.pagination.limit);

        renderHeaders();
        renderTableBody();
        renderPagination();

        // Controlar botão Limpar Filtros
        const btnClear = document.getElementById('btnClearFilters');
        let hasAnyFilter = false;
        for (let key in state.filters) {
            if (state.filters[key] && state.filters[key].size > 0) { hasAnyFilter = true; break; }
        }
        if (hasAnyFilter) {
            btnClear.classList.remove('hidden'); btnClear.classList.add('flex');
        } else {
            btnClear.classList.add('hidden'); btnClear.classList.remove('flex');
        }
    }

    // ==========================================
    // 7. Renderização (DOM) — Idêntico ao Contas a Receber
    // ==========================================
    function renderHeaders() {
        const thead = document.getElementById('alTableHeader');
        let html = '<tr class="text-steel-600 dark:text-gray-300 text-[12px] font-medium">';

        columns.forEach(col => {
            const sortIcon = state.sort.key === col.key ? (state.sort.dir === 'asc' ? '↑' : '↓') : '↕';
            const hasFilter = state.filters[col.key] && state.filters[col.key].size > 0 && !state.filters[col.key].has('__NONE__');
            const hasNoneFilter = state.filters[col.key] && state.filters[col.key].has('__NONE__');
            const isFiltered = hasFilter || hasNoneFilter;
            const filterColor = isFiltered ? 'text-nexo-500' : 'text-steel-300 dark:text-steel-600 hover:text-steel-500';

            html += `
                <th class="px-3 py-2 border-b border-gray-200 dark:border-steel-700 whitespace-normal break-words h-[70px] select-none relative align-middle">
                    <div class="flex items-center justify-center gap-1.5 w-full h-full px-4">
                        <div class="cursor-pointer hover:text-nexo-600 transition-colors text-center" onclick="AL.toggleSort('${col.key}')">
                            ${col.label} <span class="text-[10px] ml-1 opacity-50">${sortIcon}</span>
                        </div>
                        <button onclick="AL.openFilter(event, '${col.key}')" class="p-1 rounded focus:outline-none flex-shrink-0 ${filterColor} absolute right-2 top-1/2 -translate-y-1/2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </th>
            `;
        });

        // Coluna de ações (apenas excluir)
        html += `<th class="px-3 py-2.5 border-b border-gray-200 dark:border-steel-700 whitespace-nowrap select-none text-center align-middle w-[50px]">
            <svg class="w-3.5 h-3.5 mx-auto text-steel-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </th>`;
        html += '</tr>';
        thead.innerHTML = html;
    }

    function renderTableBody() {
        const tbody = document.getElementById('alTableBody');
        if (state.viewData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${columns.length + 1}" class="px-6 py-12 text-center text-steel-500">Nenhum registro encontrado com os filtros atuais.</td></tr>`;
            return;
        }

        let html = '';
        state.viewData.forEach(row => {
            html += `<tr onclick="AL.openModal(${row.CHAVE})" class="h-[150px] hover:bg-nexo-50/80 dark:hover:bg-nexo-500/10 transition-colors duration-200 group cursor-pointer">`;
            columns.forEach(col => {
                let val = row[col.key];
                let displayVal;

                if (col.type === 'currency') {
                    displayVal = formatCurrency(val);
                } else if (col.type === 'date' && val) {
                    const d = new Date(val);
                    displayVal = !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : val;
                } else if (col.key === 'SITUACAO_STATUS') {
                    displayVal = getStatusBadge(val);
                } else if (col.key === 'DATA_INICIO' || col.key === 'DATA_TERMINO') {
                    displayVal = val || '-';
                } else {
                    displayVal = (val !== null && val !== undefined && val !== '') ? val : '-';
                }

                if (['ORGAO', 'MUNICIPIO', 'UF', 'CLASSIFICACAO', 'MATERIAL'].includes(col.key) && displayVal !== '-') {
                    displayVal = String(displayVal).toUpperCase();
                }

                // Link clicável no contrato
                if (col.link && displayVal !== '-') {
                    const safeContrato = String(val).replace(/'/g, "\\'");
                    displayVal = `<div class="relative group/link inline-block">
                        <a href="#" onclick="AL.openContratoModal('${safeContrato}'); return false;" class="text-steel-800 dark:text-gray-100 group-hover/link:text-nexo-600 dark:group-hover/link:text-nexo-400 font-medium transition-colors">${val}</a>
                        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 invisible group-hover/link:opacity-100 group-hover/link:visible transition-all duration-200 z-10 whitespace-nowrap bg-steel-800 dark:bg-gray-100 text-white dark:text-steel-900 text-[10px] font-medium py-1 px-2 rounded shadow-sm pointer-events-none">
                            Abrir Contrato
                            <svg class="absolute text-steel-800 dark:text-gray-100 h-2 w-full left-0 top-full" viewBox="0 0 255 255"><polygon class="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                        </div>
                    </div>`;
                }

                let alignClass = 'text-center whitespace-normal break-words';
                if (col.key === 'ORGAO' || col.key === 'MATERIAL' || col.key === 'OBJETO' || col.key === 'CATEGORIA') {
                    alignClass = 'text-left whitespace-normal break-words min-w-[150px]';
                } else if (col.key === 'SITUACAO_STATUS' || col.key === 'observacoes_status') {
                    alignClass = 'text-center whitespace-normal break-words min-w-[120px]';
                }

                html += `<td class="px-3 py-1.5 text-[12px] align-middle ${alignClass}" title="${String(row[col.key] || '').replace(/"/g, '&quot;')}">${displayVal}</td>`;
            });

            // Ações (apenas excluir)
            html += `<td class="px-3 py-1.5 text-[12px] align-middle text-center whitespace-nowrap">`;
            if (canDelete) {
                html += `
                <button onclick="event.stopPropagation(); AL.requestDelete(${row.CHAVE})" class="p-1.5 text-steel-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Excluir">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>`;
            } else {
                html += `-`;
            }
            html += `</td></tr>`;
        });
        tbody.innerHTML = html;
    }

    // ==========================================
    // 8. Paginação — Idêntica ao Contas a Receber (SVGs)
    // ==========================================
    function renderPagination() {
        const info = document.getElementById('paginationInfo');
        const controls = document.getElementById('paginationControls');
        const start = state.pagination.total === 0 ? 0 : ((state.pagination.current - 1) * state.pagination.limit) + 1;
        const end = Math.min(state.pagination.current * state.pagination.limit, state.pagination.total);
        info.textContent = `Mostrando ${start} a ${end} de ${state.pagination.total} registros`;

        const totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        let html = '';

        // First
        html += `<button onclick="AL.setPage(1)" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.pagination.current === 1 ? 'disabled' : ''} title="Primeira Página">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>
        </button>`;
        // Prev
        html += `<button onclick="AL.setPage(${state.pagination.current - 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.pagination.current === 1 ? 'disabled' : ''} title="Anterior">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
        </button>`;
        // Pages
        let startPage = Math.max(1, state.pagination.current - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
        for (let i = startPage; i <= endPage; i++) {
            if (i === state.pagination.current) {
                html += `<button class="px-3 py-1 text-sm font-medium rounded bg-nexo-50 dark:bg-nexo-900/30 text-nexo-600 dark:text-nexo-400">${i}</button>`;
            } else {
                html += `<button onclick="AL.setPage(${i})" class="px-3 py-1 text-sm font-medium rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700">${i}</button>`;
            }
        }
        // Next
        html += `<button onclick="AL.setPage(${state.pagination.current + 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.pagination.current === totalPages || totalPages === 0 ? 'disabled' : ''} title="Próxima">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
        </button>`;
        // Last
        html += `<button onclick="AL.setPage(${totalPages})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.pagination.current === totalPages || totalPages === 0 ? 'disabled' : ''} title="Última Página">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414zm6 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
        </button>`;
        controls.innerHTML = html;
    }

    // ==========================================
    // 9. Filtros em Cascata (idênticos ao Contas a Receber)
    // ==========================================
    function openFilter(event, colKey) {
        event.stopPropagation();
        closeFilter();

        const col = columns.find(c => c.key === colKey);

        // Valores respeitando filtros de outras colunas (cascata)
        const preFilteredData = state.rawData.filter(row => {
            for (let key in state.filters) {
                if (key === colKey) continue;
                const selected = state.filters[key];
                if (selected && selected.size > 0 && !selected.has('__NONE__')) {
                    const val = row[key] !== null && row[key] !== undefined ? String(row[key]) : '-';
                    if (!selected.has(val)) return false;
                }
            }
            return true;
        });
        const uniqueValues = [...new Set(preFilteredData.map(row => {
            const v = row[colKey];
            return (v !== null && v !== undefined && v !== '') ? String(v) : '-';
        }))].sort();

        if (!state.filters[colKey]) state.filters[colKey] = new Set();

        const modal = document.createElement('div');
        modal.id = 'filterModal';
        modal.className = 'absolute z-50 bg-white dark:bg-steel-800 rounded-lg shadow-xl border border-gray-200 dark:border-steel-700 w-64 flex flex-col font-sans text-sm';
        modal.style.cssText = 'animation: fadeInUp 0.15s ease-out;';
        modal.addEventListener('click', e => e.stopPropagation());

        const rect = event.currentTarget.getBoundingClientRect();
        let left = rect.left;
        if (left + 256 > window.innerWidth) left = window.innerWidth - 266;
        modal.style.top = `${rect.bottom + window.scrollY + 8}px`;
        modal.style.left = `${left}px`;

        modal.innerHTML = `
            <div class="p-3 border-b border-gray-100 dark:border-steel-700">
                <input type="text" id="filterSearchInput" placeholder="Pesquisar..." class="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-steel-900 border border-gray-200 dark:border-steel-600 rounded outline-none focus:ring-1 focus:ring-nexo-500 text-steel-700 dark:text-gray-200">
            </div>
            <div class="flex-1 max-h-48 overflow-y-auto p-2 custom-scrollbar" id="filterCheckboxList"></div>
            <div class="p-3 border-t border-gray-100 dark:border-steel-700 flex justify-between bg-gray-50 dark:bg-steel-800/50 rounded-b-lg">
                <button id="btnClearFilter" class="text-xs text-steel-500 hover:text-steel-700 dark:hover:text-gray-300 font-medium">Limpar</button>
                <button id="btnApplyFilter" class="text-xs bg-nexo-600 hover:bg-nexo-700 text-white px-3 py-1.5 rounded font-medium shadow-sm">Aplicar</button>
            </div>
        `;
        document.body.appendChild(modal);
        activeFilterModal = modal;

        const listContainer = modal.querySelector('#filterCheckboxList');
        const searchInput = modal.querySelector('#filterSearchInput');
        const tempSelected = new Set(state.filters[colKey]);
        if (tempSelected.size === 0 || tempSelected.has('__NONE__')) {
            if (!tempSelected.has('__NONE__')) uniqueValues.forEach(v => tempSelected.add(v));
            else tempSelected.clear();
        }

        let expandedState = {};

        function renderCheckboxes(term = '') {
            listContainer.innerHTML = '';
            
            const filteredVals = uniqueValues.filter(v => {
                if (!term) return true;
                let displayVal = v;
                if (col && col.type === 'currency') displayVal = formatCurrency(v);
                if (col && col.type === 'date') displayVal = formatDate(v);
                return String(displayVal).toLowerCase().includes(term.toLowerCase());
            });

            if (filteredVals.length === 0) {
                listContainer.innerHTML = '<p class="text-xs text-steel-400 p-2 text-center">Nenhum valor encontrado.</p>';
                return;
            }

            // Select All
            const allChecked = filteredVals.length > 0 && filteredVals.every(v => tempSelected.has(v));
            const selectAllDiv = document.createElement('div');
            selectAllDiv.className = 'flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer mb-1 border-b border-gray-100 dark:border-steel-700';
            selectAllDiv.innerHTML = `
                <input type="checkbox" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${allChecked ? 'checked' : ''}>
                <span class="font-medium text-steel-700 dark:text-gray-300">(Selecionar Tudo)</span>
            `;
            selectAllDiv.querySelector('input').onclick = (e) => {
                if (e.target.checked) {
                    filteredVals.forEach(v => tempSelected.add(v));
                } else {
                    filteredVals.forEach(v => tempSelected.delete(v));
                }
                renderCheckboxes(term);
            };
            listContainer.appendChild(selectAllDiv);

            if (col && col.type === 'date' && !term) {
                // Renderização hierárquica (Ano > Mês > Dia)
                const tree = {};
                const monthsNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                
                filteredVals.forEach(val => {
                    if (val === '-' || !val) {
                        if (!tree['-']) tree['-'] = {};
                        if (!tree['-']['-']) tree['-']['-'] = [];
                        tree['-']['-'].push(val);
                        return;
                    }
                    
                    let y, m, d;
                    const valStr = String(val);
                    
                    if (valStr.includes('-') && valStr.split('-').length >= 3) {
                        const datePart = valStr.split('T')[0];
                        const parts = datePart.split('-');
                        if (parts.length === 3) {
                            [y, m, d] = parts;
                        }
                    } else if (valStr.includes('/') && valStr.split('/').length >= 3) {
                        const datePart = valStr.split(' ')[0];
                        const parts = datePart.split('/');
                        if (parts.length === 3) {
                            d = parts[0];
                            m = parts[1];
                            y = parts[2];
                        }
                    }

                    if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) {
                        if (!tree['Outros']) tree['Outros'] = {};
                        if (!tree['Outros']['-']) tree['Outros']['-'] = [];
                        tree['Outros']['-'].push(val);
                        return;
                    }
                    if (!tree[y]) tree[y] = {};
                    if (!tree[y][m]) tree[y][m] = [];
                    tree[y][m].push(val);
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
                        <input type="checkbox" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${yearAllChecked ? 'checked' : ''}>
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
                        renderCheckboxes(term);
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
                            <input type="checkbox" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${monthAllChecked ? 'checked' : ''}>
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
                            renderCheckboxes(term);
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
                                <input type="checkbox" value="${val}" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${isChecked ? 'checked' : ''}>
                                <span class="truncate text-steel-500 dark:text-gray-500 text-[11px]">${displayVal}</span>
                            `;
                            const dCb = dHeader.querySelector('input');
                            dHeader.onclick = (e) => {
                                if (e.target !== dCb) dCb.checked = !dCb.checked;
                                if (dCb.checked) tempSelected.add(val);
                                else tempSelected.delete(val);
                                renderCheckboxes(term);
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
                // Flat list
                filteredVals.forEach(val => {
                    const isChecked = tempSelected.has(val);
                    const div = document.createElement('div');
                    div.className = 'flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer';
                    let display = val;
                    if (col && col.type === 'currency') display = formatCurrency(val);
                    if (col && col.type === 'date') display = formatDate(val);
                    div.innerHTML = `<input type="checkbox" value="${val}" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${isChecked ? 'checked' : ''}><span class="truncate text-steel-600 dark:text-gray-400" title="${display}">${display}</span>`;
                    const cb = div.querySelector('input');
                    div.onclick = e => {
                        if (e.target !== cb) cb.checked = !cb.checked;
                        if (cb.checked) tempSelected.add(val); else tempSelected.delete(val);
                        renderCheckboxes(term);
                    };
                    listContainer.appendChild(div);
                });
            }
        }

        renderCheckboxes();
        searchInput.focus();
        let hasTyped = false;
        searchInput.addEventListener('input', e => {
            if (!hasTyped && e.target.value.length > 0) { tempSelected.clear(); hasTyped = true; }
            renderCheckboxes(e.target.value);
        });

        modal.querySelector('#btnApplyFilter').onclick = () => {
            if (tempSelected.size === uniqueValues.length) state.filters[colKey] = new Set();
            else if (tempSelected.size === 0) state.filters[colKey] = new Set(['__NONE__']);
            else state.filters[colKey] = new Set(tempSelected);
            state.pagination.current = 1;
            processData();
            closeFilter();
        };
        modal.querySelector('#btnClearFilter').onclick = () => {
            if (state.filters[colKey]) state.filters[colKey].clear();
            state.pagination.current = 1;
            processData();
            closeFilter();
        };
    }

    function closeFilter() {
        if (activeFilterModal) { activeFilterModal.remove(); activeFilterModal = null; }
    }
    document.addEventListener('click', e => { if (activeFilterModal && !activeFilterModal.contains(e.target)) closeFilter(); });

    // ==========================================
        // ==========================================
    // 10. Lógica de Dias Úteis
    // ==========================================
    function calculateBusinessDays(startDate, endDate) {
        if (!startDate || !endDate) return '';
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

        // Ignorar tempo
        start.setUTCHours(0,0,0,0);
        end.setUTCHours(0,0,0,0);

        if (start > end) return '';

        let count = 0;
        let current = new Date(start);

        while (current <= end) {
            const dayOfWeek = current.getUTCDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                count++;
            }
            current.setUTCDate(current.getUTCDate() + 1);
        }

        return count;
    }

    function initBusinessDaysAutoCalc() {
        const inputCadastro = document.getElementById('formDataCadastro');
        const inputLimite = document.getElementById('formDataLimite');
        const inputAntecedencia = document.getElementById('formAntecedencia');

        const updateCalc = () => {
            const valCadastro = inputCadastro.value;
            const valLimite = inputLimite.value;
            if (valCadastro && valLimite) {
                const result = calculateBusinessDays(valCadastro, valLimite);
                inputAntecedencia.value = result;
            } else {
                inputAntecedencia.value = '';
            }
        };

        if (inputCadastro && inputLimite) {
            inputCadastro.addEventListener('change', updateCalc);
            inputLimite.addEventListener('change', updateCalc);
        }
    }

    // ==========================================
    // 11. CRUD Modal (Criar / Editar Item)
    // ==========================================
    let editingChave = null;
    let deleteChave = null;

    function openModal(chave = null) {
        editingChave = chave;
        const modal = document.getElementById('itemModal');
        const title = document.getElementById('modalTitle');
        const deleteBtn = document.getElementById('btnDeleteFromModal');
        const form = document.getElementById('itemForm');

        form.reset();

        if (chave) {
            // Edição
            const item = state.rawData.find(r => String(r.CHAVE) === String(chave));
            if (!item) return;

            title.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-nexo-500 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> Editar Item ${chave}`;
            if (deleteBtn && canDelete) deleteBtn.classList.remove('hidden');

            document.getElementById('formEmpresa').value = item.empresa || currentTab;
            document.getElementById('formPregao').value = item.pregao || '';
            document.getElementById('formModalidade').value = item.modalidade || '';
            document.getElementById('formOrgao').value = item.orgao || '';
            document.getElementById('formUF').value = item.uf || '';
            document.getElementById('formCategoria').value = item.categoria || '';
            document.getElementById('formObjeto').value = item.objeto || '';
            document.getElementById('formPortal').value = item.portal || '';
            document.getElementById('formObservacoes').value = item.observacoes_status || '';

            // Datas
            const inputCadastro = document.getElementById('formDataCadastro');
            const inputLimite = document.getElementById('formDataLimite');
            const inputLances = document.getElementById('formDataLances');
            const horaLimite = document.getElementById('formHoraLimite');
            const horaLances = document.getElementById('formHoraLances');

            inputCadastro.value = item.data_cadastro ? item.data_cadastro.split('T')[0] : '';
            inputLimite.value = item.data_limite ? item.data_limite.split('T')[0] : '';
            horaLimite.value = item.hora_limite || '';
            inputLances.value = item.data_lances ? item.data_lances.split('T')[0] : '';
            horaLances.value = item.hora_lances || '';
            document.getElementById('formAntecedencia').value = item.antecedencia !== null ? item.antecedencia : '';

            // Sincronizar com datepickers visuais customizados
            inputCadastro.dispatchEvent(new Event('change'));
            inputLimite.dispatchEvent(new Event('change'));
            inputLances.dispatchEvent(new Event('change'));
            horaLimite.dispatchEvent(new Event('change'));
            horaLances.dispatchEvent(new Event('change'));

        } else {
            // Criação
            title.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-nexo-500 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg> Novo Item da Agenda`;
            if (deleteBtn) deleteBtn.classList.add('hidden');
            document.getElementById('formEmpresa').value = currentTab;

            document.getElementById('formDataCadastro').dispatchEvent(new Event('change'));
            document.getElementById('formDataLimite').dispatchEvent(new Event('change'));
            document.getElementById('formDataLances').dispatchEvent(new Event('change'));
            document.getElementById('formHoraLimite').dispatchEvent(new Event('change'));
            document.getElementById('formHoraLances').dispatchEvent(new Event('change'));
        }

        if (typeof initCustomDatepickers === 'function') initCustomDatepickers();
        if (typeof initCustomTimepickers === 'function') initCustomTimepickers();

        // Initialize business days auto calc if not yet initialized on these inputs
        initBusinessDaysAutoCalc();

        modal.classList.remove('hidden');
    }

    function closeModal() {
        document.getElementById('itemModal').classList.add('hidden');
        editingChave = null;
    }

    async function saveItem(event) {
        if (event) event.preventDefault();
        
        const data = {
            empresa: document.getElementById('formEmpresa').value || null,
            pregao: document.getElementById('formPregao').value || null,
            modalidade: document.getElementById('formModalidade').value || null,
            orgao: document.getElementById('formOrgao').value || null,
            uf: document.getElementById('formUF').value || null,
            categoria: document.getElementById('formCategoria').value || null,
            objeto: document.getElementById('formObjeto').value || null,
            portal: document.getElementById('formPortal').value || null,
            observacoes_status: document.getElementById('formObservacoes').value || null,
            data_cadastro: document.getElementById('formDataCadastro').value || null,
            data_limite: document.getElementById('formDataLimite').value || null,
            hora_limite: document.getElementById('formHoraLimite').value || null,
            data_lances: document.getElementById('formDataLances').value || null,
            hora_lances: document.getElementById('formHoraLances').value || null,
            antecedencia: document.getElementById('formAntecedencia').value !== '' ? parseInt(document.getElementById('formAntecedencia').value) : null
        };

        const pp = currentTab === 'BML' ? '?empresa=BML' : '';
        
        try {
            let res;
            if (editingChave) {
                // PUT
                res = await fetch(`/api/agenda_licitacoes/${editingChave}${pp}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data)
                });
            } else {
                // POST
                res = await fetch(`/api/agenda_licitacoes${pp}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data)
                });
            }

            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erro ao salvar item'); }

            showToast(editingChave ? 'Item atualizado com sucesso!' : 'Item criado com sucesso!');
            closeModal();
            await fetchData();
        } catch (error) { 
            console.error('Erro ao salvar:', error); 
            showToast(error.message || 'Erro ao salvar item', 'error');  
        }
    }

    // ==========================================
    // 12. Delete
    // ==========================================
    function requestDelete(chave) {
        deleteChave = chave;
        const row = state.rawData.find(r => r.CHAVE === chave);
        document.getElementById('deleteModalText').textContent = `Tem certeza que deseja excluir o item "${row?.COD_CONTRATO_CONCAT || chave}"? Esta ação não pode ser desfeita.`;
        document.getElementById('deleteModal').classList.remove('hidden');
    }
    function closeDeleteModal() { document.getElementById('deleteModal').classList.add('hidden'); deleteChave = null; }
    async function confirmDelete() {
        if (!deleteChave) return;
        const pp = currentTab === 'BML' ? '?empresa=BML' : '';
        try {
            const res = await fetch(`/api/agenda_licitacoes/${deleteChave}${pp}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erro ao excluir'); }
            showToast('Item excluído com sucesso!'); closeDeleteModal(); closeModal(); await fetchData();
        } catch (error) { showToast(error.message || 'Erro ao excluir item', 'error'); }
    }
    function deleteFromModal() { if (editingChave) requestDelete(editingChave); }

    // ==========================================
    // 13. Tab Switching
    // ==========================================
    function switchTab(tab) {
        currentTab = tab;
        const tN = document.getElementById('tabNexomed'), tB = document.getElementById('tabBml');
        const ac = 'bg-white dark:bg-steel-600 text-steel-800 dark:text-white shadow-sm';
        const ic = 'text-steel-500 dark:text-steel-400 hover:text-steel-700 dark:hover:text-gray-200';
        tN.className = `px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${tab === 'NEXOMED' ? ac : ic}`;
        tB.className = `px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${tab === 'BML' ? ac : ic}`;
        fetchData();
    }

    // ==========================================
    // 14. Export
    // ==========================================
    function exportXLS() {
        if (state.filteredData.length === 0) { showToast('Nenhum dado para exportar', 'warning'); return; }

        const exportData = state.filteredData.map(row => {
            let exportedRow = {};
            columns.forEach(col => {
                let val = row[col.key];
                let displayVal = val;
                
                if (col.type === 'date' && val) {
                    const d = new Date(val);
                    displayVal = !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : val;
                } else if (col.type === 'currency') {
                    displayVal = typeof formatCurrency === 'function' ? formatCurrency(val) : val;
                } else if (col.key === 'SITUACAO_STATUS' || col.key === 'observacoes_status') {
                    displayVal = val;
                } else {
                    displayVal = (val !== null && val !== undefined && val !== '') ? val : '';
                }

                if (['ORGAO', 'MUNICIPIO', 'UF', 'CLASSIFICACAO', 'MATERIAL'].includes(col.key) && displayVal) {
                    displayVal = String(displayVal).toUpperCase();
                }

                exportedRow[col.label] = displayVal;
            });
            exportedRow['Empresa Participante'] = currentTab;
            return exportedRow;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Agenda_${currentTab}`);
        XLSX.writeFile(wb, `agenda_licitacoes_${currentTab.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast('Exportação concluída!');
    }

    // ==========================================
    // 15. Init
    // ==========================================
    function init() {
        document.getElementById('btnClearFilters').addEventListener('click', () => {
            state.filters = {};
            state.sort = { key: null, dir: 'desc' };
            state.pagination.current = 1;
            processData();
        });
        document.getElementById('itemsPerPage').addEventListener('change', e => {
            state.pagination.limit = parseInt(e.target.value);
            state.pagination.current = 1;
            processData();
        });

        fetchData();
    }

    document.addEventListener('DOMContentLoaded', init);

    // Public API
    return {
        switchTab, toggleSort: key => { if (state.sort.key === key) state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc'; else { state.sort.key = key; state.sort.dir = 'asc'; } processData(); },
        setPage: p => { state.pagination.current = p; processData(); },
        openFilter, openModal, closeModal, saveItem,
        requestDelete, closeDeleteModal, confirmDelete,
        exportXLS,
    };
})();
