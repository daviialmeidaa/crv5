/**
 * Itens Arrematados - Frontend Controller v2
 * Grid idêntico ao Contas a Receber: filtros em cascata, tipografia, hover, paginação.
 * Modal de Contrato ao clicar no número do contrato.
 */
const IA = (() => {

    // ==========================================
    // 1. Definição das Colunas
    // ==========================================
    const columns = [
        { key: 'COD_CONTRATO_CONCAT', label: 'Contrato', link: true },
        { key: 'EDITAL', label: 'Edital' },
        { key: 'ORGAO', label: 'Órgão' },
        { key: 'MUNICIPIO', label: 'Município' },
        { key: 'UF', label: 'UF' },
        { key: 'CLASSIFICACAO', label: 'Classificação' },
        { key: 'MATERIAL', label: 'Material' },
        { key: 'QTDE', label: 'Qtde', type: 'number' },
        { key: 'VALOR_UNITARIO', label: 'Vlr. Unit.', type: 'currency' },
        { key: 'VALOR_TOTAL', label: 'Vlr. Total', type: 'currency' },
        { key: 'SITUACAO_STATUS', label: 'Status' },
        { key: 'DATA_INICIO', label: 'Início' },
        { key: 'DATA_TERMINO', label: 'Término' },
        { key: 'VIGENCIA', label: 'Vigência' },
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
    // 3. Helpers
    // ==========================================
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
            const param = currentTab === 'BML' ? '?participante=BML' : '';
            const response = await fetch(`/api/itens_arrematados${param}`, {
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
            document.getElementById('iaTableBody').innerHTML = `<tr><td colspan="${columns.length + 1}" class="px-6 py-12 text-center text-red-500">Erro ao carregar dados do servidor.</td></tr>`;
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
        } else {
            // Ordenação padrão customizada por COD_CONTRATO_CONCAT
            state.filteredData.sort((a, b) => {
                const ccA = (a.COD_CONTRATO_CONCAT || '').toUpperCase();
                const ccB = (b.COD_CONTRATO_CONCAT || '').toUpperCase();
                const numA = parseInt(ccA.replace(/[^0-9]/g, '')) || 0;
                const numB = parseInt(ccB.replace(/[^0-9]/g, '')) || 0;

                if (currentTab === 'NEXOMED') {
                    // BIO primeiro (maior número no topo), ML no final
                    const aIsBio = ccA.includes('BIO');
                    const bIsBio = ccB.includes('BIO');
                    const aIsMl = ccA.includes('ML');
                    const bIsMl = ccB.includes('ML');

                    // Prioridade: BIO > outros > ML
                    const prioA = aIsBio ? 0 : (aIsMl ? 2 : 1);
                    const prioB = bIsBio ? 0 : (bIsMl ? 2 : 1);

                    if (prioA !== prioB) return prioA - prioB;
                    // Dentro do mesmo grupo, maior número primeiro
                    return numB - numA;
                } else {
                    // BML: maior número primeiro (simples)
                    return numB - numA;
                }
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
        const thead = document.getElementById('iaTableHeader');
        let html = '<tr class="text-steel-600 dark:text-gray-300 text-[12px] font-medium">';

        columns.forEach(col => {
            const sortIcon = state.sort.key === col.key ? (state.sort.dir === 'asc' ? '↑' : '↓') : '↕';
            const hasFilter = state.filters[col.key] && state.filters[col.key].size > 0 && !state.filters[col.key].has('__NONE__');
            const hasNoneFilter = state.filters[col.key] && state.filters[col.key].has('__NONE__');
            const isFiltered = hasFilter || hasNoneFilter;
            const filterColor = isFiltered ? 'text-nexo-500' : 'text-steel-300 dark:text-steel-600 hover:text-steel-500';

            html += `
                <th class="px-3 py-2.5 border-b border-gray-200 dark:border-steel-700 whitespace-nowrap select-none relative align-middle">
                    <div class="flex items-center justify-center gap-3 w-full h-full">
                        <div class="cursor-pointer hover:text-nexo-600 transition-colors text-center" onclick="IA.toggleSort('${col.key}')">
                            ${col.label} <span class="text-[10px] ml-1 opacity-50">${sortIcon}</span>
                        </div>
                        <button onclick="IA.openFilter(event, '${col.key}')" class="p-1 rounded focus:outline-none flex-shrink-0 ${filterColor} absolute right-2 top-1/2 -translate-y-1/2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </th>
            `;
        });

        // Coluna de ações
        html += '<th class="px-3 py-2.5 border-b border-gray-200 dark:border-steel-700 whitespace-nowrap select-none text-center align-middle">Ações</th>';
        html += '</tr>';
        thead.innerHTML = html;
    }

    function renderTableBody() {
        const tbody = document.getElementById('iaTableBody');
        if (state.viewData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${columns.length + 1}" class="px-6 py-12 text-center text-steel-500">Nenhum registro encontrado com os filtros atuais.</td></tr>`;
            return;
        }

        let html = '';
        state.viewData.forEach(row => {
            html += '<tr class="h-[150px] hover:bg-nexo-50/80 dark:hover:bg-nexo-500/10 transition-colors duration-200 group cursor-default">';
            columns.forEach(col => {
                let val = row[col.key];
                let displayVal;

                if (col.type === 'currency') {
                    displayVal = formatCurrency(val);
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
                        <a href="#" onclick="IA.openContratoModal('${safeContrato}'); return false;" class="text-steel-800 dark:text-gray-100 group-hover/link:text-nexo-600 dark:group-hover/link:text-nexo-400 font-medium transition-colors">${val}</a>
                        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 invisible group-hover/link:opacity-100 group-hover/link:visible transition-all duration-200 z-10 whitespace-nowrap bg-steel-800 dark:bg-gray-100 text-white dark:text-steel-900 text-[10px] font-medium py-1 px-2 rounded shadow-sm pointer-events-none">
                            Ver Contrato
                            <svg class="absolute text-steel-800 dark:text-gray-100 h-2 w-full left-0 top-full" viewBox="0 0 255 255"><polygon class="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                        </div>
                    </div>`;
                }

                let alignClass = 'text-center whitespace-nowrap';
                if (col.key === 'ORGAO' || col.key === 'MATERIAL') {
                    alignClass = 'text-left whitespace-normal break-words min-w-[250px] max-w-[350px]';
                } else if (col.key === 'SITUACAO_STATUS') {
                    alignClass = 'text-center whitespace-normal break-words min-w-[120px] max-w-[200px]';
                }

                html += `<td class="px-3 py-1.5 text-[12px] align-middle ${alignClass}" title="${String(row[col.key] || '').replace(/"/g, '&quot;')}">${displayVal}</td>`;
            });

            // Ações
            html += `<td class="px-3 py-1.5 text-[12px] align-middle text-center whitespace-nowrap">
                <div class="flex items-center justify-center gap-1">
                    <button onclick="IA.editItem(${row.CHAVE})" class="p-1.5 text-steel-400 hover:text-nexo-500 hover:bg-nexo-50 dark:hover:bg-nexo-900/20 rounded-lg transition-all" title="Editar">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onclick="IA.requestDelete(${row.CHAVE})" class="p-1.5 text-steel-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Excluir">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </td>`;
            html += '</tr>';
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
        html += `<button onclick="IA.setPage(1)" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.pagination.current === 1 ? 'disabled' : ''} title="Primeira Página">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>
        </button>`;
        // Prev
        html += `<button onclick="IA.setPage(${state.pagination.current - 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.pagination.current === 1 ? 'disabled' : ''} title="Anterior">
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
                html += `<button onclick="IA.setPage(${i})" class="px-3 py-1 text-sm font-medium rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700">${i}</button>`;
            }
        }
        // Next
        html += `<button onclick="IA.setPage(${state.pagination.current + 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.pagination.current === totalPages || totalPages === 0 ? 'disabled' : ''} title="Próxima">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
        </button>`;
        // Last
        html += `<button onclick="IA.setPage(${totalPages})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.pagination.current === totalPages || totalPages === 0 ? 'disabled' : ''} title="Última Página">
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

        function renderCheckboxes(term = '') {
            listContainer.innerHTML = '';
            const filtered = uniqueValues.filter(v => !term || String(v).toLowerCase().includes(term.toLowerCase()));
            if (filtered.length === 0) { listContainer.innerHTML = '<p class="text-xs text-steel-400 p-2 text-center">Nenhum valor encontrado.</p>'; return; }

            // Select All
            const allChecked = filtered.length > 0 && filtered.every(v => tempSelected.has(v));
            const saDiv = document.createElement('div');
            saDiv.className = 'flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer mb-1 border-b border-gray-100 dark:border-steel-700';
            saDiv.innerHTML = `<input type="checkbox" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${allChecked ? 'checked' : ''}><span class="font-medium text-steel-700 dark:text-gray-300">(Selecionar Tudo)</span>`;
            saDiv.querySelector('input').onclick = e => {
                if (e.target.checked) filtered.forEach(v => tempSelected.add(v));
                else filtered.forEach(v => tempSelected.delete(v));
                renderCheckboxes(term);
            };
            listContainer.appendChild(saDiv);

            // Flat list
            filtered.forEach(val => {
                const isChecked = tempSelected.has(val);
                const div = document.createElement('div');
                div.className = 'flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer';
                let display = val;
                if (col && col.type === 'currency') display = formatCurrency(val);
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
    // 10. Modal de Contrato (Agrupado por COD_CONTRATO_CONCAT)
    // ==========================================
    function openContratoModal(contratoConcat) {
        const items = state.rawData.filter(r => r.COD_CONTRATO_CONCAT === contratoConcat);
        if (items.length === 0) return;

        const ref = items[0]; // Dados de cabeçalho do contrato (comuns a todas as linhas)

        // Construir HTML do modal
        const modal = document.getElementById('contratoModal');
        document.getElementById('contratoModalTitle').textContent = `Contrato: ${contratoConcat}`;

        // Dados do cabeçalho (comuns)
        document.getElementById('cmOrgao').textContent = (ref.ORGAO || '-').toUpperCase();
        document.getElementById('cmMunicipio').textContent = (ref.MUNICIPIO || '-').toUpperCase();
        document.getElementById('cmUF').textContent = (ref.UF || '-').toUpperCase();
        document.getElementById('cmEdital').textContent = ref.EDITAL || '-';
        document.getElementById('cmParticipante').textContent = ref.PARTICIPANTE || '-';
        document.getElementById('cmTipoContrato').textContent = ref.TIPO_CONTRATO || '-';
        document.getElementById('cmStatus').textContent = getStatusBadge(ref.SITUACAO_STATUS);
        document.getElementById('cmVigencia').textContent = ref.VIGENCIA || '-';
        document.getElementById('cmDataInicio').textContent = ref.DATA_INICIO || '-';
        document.getElementById('cmDataTermino').textContent = ref.DATA_TERMINO || '-';
        document.getElementById('cmInstrumental').textContent = ref.INSTRUMENTAL || '-';
        document.getElementById('cmInstrumentador').textContent = ref.INSTRUMENTADOR || '-';
        document.getElementById('cmLocalEntrega').textContent = ref.LOCAL_ENTREGA || '-';
        document.getElementById('cmPrazoEntrega').textContent = ref.PRAZO_ENTREGA || '-';

        // Tabela de itens do contrato (1..N linhas)
        const tbody = document.getElementById('cmItensBody');
        let total = 0;
        let html = '';
        items.forEach((item, idx) => {
            const vt = parseFloat(item.VALOR_TOTAL) || 0;
            total += vt;
            html += `<tr class="hover:bg-nexo-50/50 dark:hover:bg-nexo-500/5 transition-colors">
                <td class="px-3 py-2 text-[12px] text-center text-steel-700 dark:text-gray-300">${item.LOTE_ITEM || '-'}</td>
                <td class="px-3 py-2 text-[12px] text-left text-steel-700 dark:text-gray-300 max-w-[300px] truncate" title="${(item.MATERIAL || '').replace(/"/g, '&quot;')}">${(item.MATERIAL || '-').toUpperCase()}</td>
                <td class="px-3 py-2 text-[12px] text-center text-steel-700 dark:text-gray-300">${item.QTDE || '-'}</td>
                <td class="px-3 py-2 text-[12px] text-center text-steel-700 dark:text-gray-300">${item.UNIDADE || '-'}</td>
                <td class="px-3 py-2 text-[12px] text-center text-steel-700 dark:text-gray-300">${item.FORNECEDOR || '-'}</td>
                <td class="px-3 py-2 text-[12px] text-center text-steel-700 dark:text-gray-300 font-medium">${formatCurrency(item.VALOR_UNITARIO)}</td>
                <td class="px-3 py-2 text-[12px] text-center text-steel-700 dark:text-gray-300 font-medium">${formatCurrency(item.VALOR_TOTAL)}</td>
                <td class="px-3 py-2 text-[12px] text-center">
                    <button onclick="IA.editItem(${item.CHAVE})" class="p-1 text-steel-400 hover:text-nexo-500 hover:bg-nexo-50 dark:hover:bg-nexo-900/20 rounded transition-all" title="Editar item"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
        document.getElementById('cmTotalValor').textContent = formatCurrency(total);
        document.getElementById('cmTotalItens').textContent = `${items.length} ${items.length === 1 ? 'item' : 'itens'}`;

        modal.classList.remove('hidden');
    }

    function closeContratoModal() {
        document.getElementById('contratoModal').classList.add('hidden');
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
        
        document.getElementById('itemForm').reset();
        document.getElementById('formChave').value = '';
        document.getElementById('produtosContainer').innerHTML = ''; // Limpa os produtos
        document.getElementById('formMunicipio').placeholder = 'Selecione a UF...'; // Reseta placeholder

        if (chave) {
            title.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-nexo-500 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> Editar Item Arrematado`;
            if (deleteBtn) deleteBtn.classList.remove('hidden');
            document.getElementById('btnAddProduto').classList.add('hidden');
            const row = state.rawData.find(r => r.CHAVE === chave);
            if (row) populateForm(row);
        } else {
            title.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-nexo-500 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg> Novo Item Arrematado`;
            if (deleteBtn) deleteBtn.classList.add('hidden');
            document.getElementById('formParticipante').value = currentTab === 'BML' ? 'BML HOSPITALAR' : 'NEXOMED';
            document.getElementById('btnAddProduto').classList.remove('hidden');
            addProdutoBox(); // Adiciona 1 produto vazio
        }
        modal.classList.remove('hidden');
    }

    function closeModal() {
        document.getElementById('itemModal').classList.add('hidden');
        editingChave = null;
    }

    function renumberProdutoBoxes() {
        const boxes = document.querySelectorAll('.produto-box');
        boxes.forEach((box, i) => {
            const badge = box.querySelector('.produto-number');
            if (badge) badge.textContent = `Produto #${i + 1}`;
        });
    }

    function addProdutoBox(data = {}) {
        const container = document.getElementById('produtosContainer');
        const count = container.querySelectorAll('.produto-box').length + 1;
        const hasSupra = !!(data.COD_SUPRA || data.NOME_SUPRA);
        
        const div = document.createElement('div');
        div.className = 'produto-box border-l-4 border-l-nexo-500 border border-gray-200 dark:border-steel-600 rounded-lg bg-gray-50/50 dark:bg-steel-800/50 relative overflow-hidden transition-all duration-300';

        div.innerHTML = `
            <!-- Header do Card -->
            <div class="flex items-center justify-between px-4 py-2.5 bg-white/60 dark:bg-steel-700/40 border-b border-gray-100 dark:border-steel-600">
                <span class="produto-number text-xs font-bold text-nexo-600 dark:text-nexo-400 tracking-wide uppercase">Produto #${count}</span>
                <button type="button" class="btn-remove-produto flex items-center gap-1 text-[11px] text-steel-400 hover:text-red-500 transition-colors" title="Remover Produto">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                    Remover
                </button>
            </div>

            <!-- Campos do Produto -->
            <div class="p-4 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Lote / Item</label>
                        <input type="text" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all prod-lote" value="${data.LOTE_ITEM || ''}">
                    </div>
                    <div class="md:col-span-3">
                        <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Material</label>
                        <input type="text" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all prod-material" value="${data.MATERIAL || ''}">
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Qtde</label>
                        <input type="number" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all prod-qtde" value="${data.QTDE || ''}">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Unidade</label>
                        <input type="text" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all prod-unidade" value="${data.UNIDADE || ''}">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Fornecedor</label>
                        <input type="text" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all prod-fornecedor" value="${data.FORNECEDOR || ''}">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Valor Unitário</label>
                        <input type="number" step="0.01" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all prod-vunit" value="${data.VALOR_UNITARIO || ''}">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Valor Total</label>
                        <input type="number" step="0.01" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all prod-vtotal" value="${data.VALOR_TOTAL || ''}">
                    </div>
                </div>

                <!-- Supra: Chip toggle -->
                <div class="pt-2">
                    <button type="button" class="toggle-supra inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all duration-200 ${hasSupra ? 'bg-nexo-500/15 text-nexo-600 dark:text-nexo-400 ring-1 ring-nexo-500/30' : 'bg-gray-100 dark:bg-steel-700 text-steel-500 dark:text-steel-400 hover:bg-nexo-500/10 hover:text-nexo-600 dark:hover:text-nexo-400'}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Vincular Supra
                    </button>
                    <div class="supra-fields overflow-hidden transition-all duration-300 ease-in-out ${hasSupra ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'}">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Cód. Supra</label>
                                <input type="number" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all prod-codsupra" value="${data.COD_SUPRA || ''}">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Nome Supra</label>
                                <input type="text" class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all prod-nomesupra" value="${data.NOME_SUPRA || ''}">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove button handler
        div.querySelector('.btn-remove-produto').addEventListener('click', () => {
            if (document.querySelectorAll('.produto-box').length > 1) {
                div.style.maxHeight = div.scrollHeight + 'px';
                requestAnimationFrame(() => {
                    div.style.transition = 'max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease';
                    div.style.maxHeight = '0';
                    div.style.opacity = '0';
                    div.style.marginTop = '0';
                    div.style.marginBottom = '0';
                    div.style.overflow = 'hidden';
                });
                setTimeout(() => { div.remove(); renumberProdutoBoxes(); }, 320);
            } else {
                showToast('O contrato precisa ter pelo menos um produto.', 'error');
            }
        });

        // Supra toggle handler
        const toggleBtn = div.querySelector('.toggle-supra');
        const supraFields = div.querySelector('.supra-fields');

        toggleBtn.addEventListener('click', () => {
            const isOpen = supraFields.classList.contains('max-h-40');
            if (isOpen) {
                supraFields.classList.remove('max-h-40', 'opacity-100', 'mt-3');
                supraFields.classList.add('max-h-0', 'opacity-0');
                toggleBtn.classList.remove('bg-nexo-500/15', 'text-nexo-600', 'dark:text-nexo-400', 'ring-1', 'ring-nexo-500/30');
                toggleBtn.classList.add('bg-gray-100', 'dark:bg-steel-700', 'text-steel-500', 'dark:text-steel-400');
            } else {
                supraFields.classList.remove('max-h-0', 'opacity-0');
                supraFields.classList.add('max-h-40', 'opacity-100', 'mt-3');
                toggleBtn.classList.remove('bg-gray-100', 'dark:bg-steel-700', 'text-steel-500', 'dark:text-steel-400');
                toggleBtn.classList.add('bg-nexo-500/15', 'text-nexo-600', 'dark:text-nexo-400', 'ring-1', 'ring-nexo-500/30');
            }
        });

        container.appendChild(div);
    }

    function populateForm(r) {
        document.getElementById('formChave').value = r.CHAVE;
        document.getElementById('formCodContrato').value = r.COD_CONTRATO || '';
        document.getElementById('formCodContratoConcat').value = r.COD_CONTRATO_CONCAT || '';
        document.getElementById('formEdital').value = r.EDITAL || '';
        document.getElementById('formParticipante').value = r.PARTICIPANTE || 'NEXOMED';
        document.getElementById('formOrgao').value = r.ORGAO || '';
        document.getElementById('formUF').value = r.UF || '';
        document.getElementById('formMunicipio').value = r.MUNICIPIO || '';
        document.getElementById('formTipoContrato').value = r.TIPO_CONTRATO || '';
        document.getElementById('formClassificacao').value = r.CLASSIFICACAO || '';
        document.getElementById('formDataPregao').value = r.DATA_PREGAO ? r.DATA_PREGAO.split('T')[0] : '';
        document.getElementById('formDataProposta').value = r.DATA_PROPOSTA ? r.DATA_PROPOSTA.split('T')[0] : '';
        document.getElementById('formSituacaoStatus').value = r.SITUACAO_STATUS || '';
        document.getElementById('formVigencia').value = r.VIGENCIA || '';
        document.getElementById('formDataInicio').value = r.DATA_INICIO || '';
        document.getElementById('formDataTermino').value = r.DATA_TERMINO || '';
        document.getElementById('formDataEmpenho').value = r.DATA_EMPENHO || '';
        document.getElementById('formDataAdjudicacao').value = r.DATA_ADJUDICACAO || '';
        document.getElementById('formInstrumental').value = r.INSTRUMENTAL || '';
        document.getElementById('formInstrumentador').value = r.INSTRUMENTADOR || '';
        document.getElementById('formLocalEntrega').value = r.LOCAL_ENTREGA || '';
        document.getElementById('formPrazoEntrega').value = r.PRAZO_ENTREGA || '';
        document.getElementById('formDetalhamento').value = r.DETALHAMENTO || '';
        document.getElementById('formDescricaoDatabase').value = r.DESCRICAO_DATABASE || '';
        addProdutoBox(r);
    }

    async function saveItem(event) {
        if (event) event.preventDefault();
        
        const baseData = {
            COD_CONTRATO: document.getElementById('formCodContrato').value || null,
            COD_CONTRATO_CONCAT: document.getElementById('formCodContratoConcat').value || null,
            EDITAL: document.getElementById('formEdital').value || null,
            PARTICIPANTE: document.getElementById('formParticipante').value || null,
            ORGAO: document.getElementById('formOrgao').value || null,
            MUNICIPIO: document.getElementById('formMunicipio').value || null,
            UF: document.getElementById('formUF').value || null,
            TIPO_CONTRATO: document.getElementById('formTipoContrato').value || null,
            CLASSIFICACAO: document.getElementById('formClassificacao').value || null,
            DATA_PREGAO: document.getElementById('formDataPregao').value || null,
            DATA_PROPOSTA: document.getElementById('formDataProposta').value || null,
            SITUACAO_STATUS: document.getElementById('formSituacaoStatus').value || null,
            VIGENCIA: document.getElementById('formVigencia').value || null,
            DATA_INICIO: document.getElementById('formDataInicio').value || null,
            DATA_TERMINO: document.getElementById('formDataTermino').value || null,
            DATA_EMPENHO: document.getElementById('formDataEmpenho').value || null,
            DATA_ADJUDICACAO: document.getElementById('formDataAdjudicacao').value || null,
            INSTRUMENTAL: document.getElementById('formInstrumental').value || null,
            INSTRUMENTADOR: document.getElementById('formInstrumentador').value || null,
            LOCAL_ENTREGA: document.getElementById('formLocalEntrega').value || null,
            PRAZO_ENTREGA: document.getElementById('formPrazoEntrega').value || null,
            DETALHAMENTO: document.getElementById('formDetalhamento').value || null,
            DESCRICAO_DATABASE: document.getElementById('formDescricaoDatabase').value || null,
        };

        const pp = currentTab === 'BML' ? '?participante=BML' : '';
        const boxes = document.querySelectorAll('.produto-box');
        
        try {
            if (editingChave) {
                // Modo Edição (1 produto apenas)
                const box = boxes[0];
                const productData = {
                    LOTE_ITEM: box.querySelector('.prod-lote').value || null,
                    MATERIAL: box.querySelector('.prod-material').value || null,
                    QTDE: box.querySelector('.prod-qtde').value || null,
                    UNIDADE: box.querySelector('.prod-unidade').value || null,
                    FORNECEDOR: box.querySelector('.prod-fornecedor').value || null,
                    VALOR_UNITARIO: box.querySelector('.prod-vunit').value || null,
                    VALOR_TOTAL: box.querySelector('.prod-vtotal').value || null,
                    COD_SUPRA: box.querySelector('.prod-codsupra').value || null,
                    NOME_SUPRA: box.querySelector('.prod-nomesupra').value || null,
                };
                const data = { ...baseData, ...productData };
                
                const res = await fetch(`/api/itens_arrematados/${editingChave}${pp}`, { 
                    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data) 
                });
                if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erro ao salvar'); }
                
            } else {
                // Modo Criação (Múltiplos produtos via chamadas simultâneas)
                const fetchPromises = Array.from(boxes).map(box => {
                    const productData = {
                        LOTE_ITEM: box.querySelector('.prod-lote').value || null,
                        MATERIAL: box.querySelector('.prod-material').value || null,
                        QTDE: box.querySelector('.prod-qtde').value || null,
                        UNIDADE: box.querySelector('.prod-unidade').value || null,
                        FORNECEDOR: box.querySelector('.prod-fornecedor').value || null,
                        VALOR_UNITARIO: box.querySelector('.prod-vunit').value || null,
                        VALOR_TOTAL: box.querySelector('.prod-vtotal').value || null,
                        COD_SUPRA: box.querySelector('.prod-codsupra').value || null,
                        NOME_SUPRA: box.querySelector('.prod-nomesupra').value || null,
                    };
                    const data = { ...baseData, ...productData };
                    return fetch(`/api/itens_arrematados${pp}`, { 
                        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data) 
                    });
                });
                
                const responses = await Promise.all(fetchPromises);
                for (let r of responses) {
                    if (!r.ok) { const err = await r.json(); throw new Error(err.error || 'Erro ao salvar produto'); }
                }
            }

            showToast(editingChave ? 'Item atualizado com sucesso!' : 'Itens criados com sucesso!');
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
        const pp = currentTab === 'BML' ? '?participante=BML' : '';
        try {
            const res = await fetch(`/api/itens_arrematados/${deleteChave}${pp}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
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
        const ws = XLSX.utils.json_to_sheet(state.filteredData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `IA_${currentTab}`);
        XLSX.writeFile(wb, `itens_arrematados_${currentTab.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);
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

        const updateCodContratoConcat = () => {
            const participante = document.getElementById('formParticipante').value;
            const cod = document.getElementById('formCodContrato').value;
            const prefix = participante === 'NEXOMED' ? 'BIO' : (participante === 'BML HOSPITALAR' ? 'BML' : '');
            document.getElementById('formCodContratoConcat').value = cod ? `${prefix}${cod}` : '';
        };
        document.getElementById('formParticipante').addEventListener('change', updateCodContratoConcat);
        document.getElementById('formCodContrato').addEventListener('input', updateCodContratoConcat);

        // Setup Custom Dropdowns
        function setupCustomDropdown(inputId, dropdownId, listId, dataFetcher = null, onChange = null) {
            const input = document.getElementById(inputId);
            const dropdown = document.getElementById(dropdownId);
            const ul = document.getElementById(listId);
            let optionsData = [];

            const renderOptions = (filter = '') => {
                ul.innerHTML = '';
                const filtered = optionsData.filter(opt => opt.includes(filter.toUpperCase()));
                if (filtered.length === 0) {
                    ul.innerHTML = '<li class="px-4 py-2 text-steel-400 text-xs text-center italic">Nenhum resultado</li>';
                    return;
                }
                filtered.forEach(opt => {
                    const li = document.createElement('li');
                    li.textContent = opt;
                    li.className = 'px-4 py-2 cursor-pointer hover:bg-nexo-50 dark:hover:bg-steel-700 transition-colors text-steel-700 dark:text-gray-200';
                    li.onmousedown = (e) => { // mousedown dispara antes do blur
                        e.preventDefault();
                        input.value = opt;
                        dropdown.classList.add('hidden');
                        if (onChange) onChange(opt);
                    };
                    ul.appendChild(li);
                });
            };

            const loadData = async () => {
                if (dataFetcher && optionsData.length === 0) {
                    optionsData = await dataFetcher();
                }
                renderOptions(input.value);
            };

            input.addEventListener('focus', async () => {
                dropdown.classList.remove('hidden');
                await loadData();
                renderOptions();
            });

            input.addEventListener('input', async (e) => {
                dropdown.classList.remove('hidden');
                await loadData();
                renderOptions(e.target.value);
            });

            input.addEventListener('blur', () => { dropdown.classList.add('hidden'); });

            return {
                setOptions: (data) => { optionsData = data; renderOptions(); },
                clearOptions: () => { optionsData = []; }
            };
        }

        const ufs = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
        
        let munDropdown;
        const ufDropdown = setupCustomDropdown('formUF', 'ufDropdown', 'ufList', null, (uf) => {
            document.getElementById('formMunicipio').value = '';
            if (munDropdown) munDropdown.clearOptions();
        });
        ufDropdown.setOptions(ufs);

        munDropdown = setupCustomDropdown('formMunicipio', 'municipioDropdown', 'municipiosList', async () => {
            const uf = document.getElementById('formUF').value;
            if (!uf) return [];
            try {
                const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
                const data = await res.json();
                return data.map(m => m.nome.toUpperCase());
            } catch (e) {
                return [];
            }
        });

        // Botão Adicionar Produto
        document.getElementById('btnAddProduto').addEventListener('click', () => addProdutoBox());

        fetchData();
    }

    document.addEventListener('DOMContentLoaded', init);

    // Public API
    return {
        switchTab, toggleSort: key => { if (state.sort.key === key) state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc'; else { state.sort.key = key; state.sort.dir = 'asc'; } processData(); },
        setPage: p => { state.pagination.current = p; processData(); },
        openFilter, openModal, closeModal, editItem: chave => openModal(chave), saveItem,
        requestDelete, closeDeleteModal, confirmDelete, deleteFromModal,
        openContratoModal, closeContratoModal, exportXLS,
    };
})();
