/**
 * Gerenciamento do Data Grid de Clientes
 * Grid com filtros em cascata, ordenação e paginação.
 */
const ClientesGrid = (() => {

    // ==========================================
    // 1. Definição das Colunas
    // ==========================================
    const columns = [
        { key: 'codigo', label: 'Código', type: 'number' },
        { key: 'razaoSocial', label: 'Razão Social' },
        { key: 'nomeFantasia', label: 'Nome Fantasia' },
        { key: 'cidade', label: 'Cidade' },
        { key: 'uf', label: 'UF' },
        { key: 'cnpj', label: 'CNPJ' }
    ];

    // ==========================================
    // 2. Estado Global
    // ==========================================
    const state = {
        rawData: [],
        filteredData: [],
        viewData: [],
        filters: {}, // { columnKey: Set(['val1', 'val2', '__NONE__']) }
        sort: { key: 'codigo', dir: 'asc' }, // Default sort: codigo ASC
        pagination: { current: 1, limit: 25, total: 0 }
    };

    let activeFilterModal = null;

    // DOM Elements
    const elements = {
        searchInput: document.getElementById('searchClientInput'),
        tableHeader: document.getElementById('clientesTableHeader'),
        tableBody: document.getElementById('clientesTableBody'),
        itemsPerPage: document.getElementById('itemsPerPage'),
        btnClearFilters: document.getElementById('btnClearFilters')
    };

    // ==========================================
    // 3. Helper e Token
    // ==========================================
    const getToken = () => localStorage.getItem('token');

    // ==========================================
    // 4. Data Fetching
    // ==========================================
    const loadData = async () => {
        elements.tableBody.innerHTML = `<tr><td colspan="${columns.length}" class="px-6 py-12 text-center text-steel-400">Carregando clientes do Supra...</td></tr>`;
        
        try {
            const response = await fetch('/api/clientes', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            
            if (!response.ok) throw new Error('Erro ao buscar clientes');
            
            const data = await response.json();
            state.rawData = data || [];
            processData();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            elements.tableBody.innerHTML = `<tr><td colspan="${columns.length}" class="px-6 py-12 text-center text-red-500">Erro ao carregar dados do servidor.</td></tr>`;
        }
    };

    const processData = () => {
        // 1. Busca Global
        const query = (elements.searchInput.value || '').trim().toLowerCase();
        let baseData = state.rawData;
        
        if (query) {
            baseData = baseData.filter(c => 
                Object.values(c).some(val => 
                    String(val).toLowerCase().includes(query)
                )
            );
        }

        // 2. Filtros em cascata
        state.filteredData = baseData.filter(row => {
            for (let key in state.filters) {
                const selected = state.filters[key];
                if (selected && selected.size > 0 && !selected.has('__NONE__')) {
                    const val = row[key] !== null && row[key] !== undefined && row[key] !== '' ? String(row[key]) : '(Vazio)';
                    if (!selected.has(val)) return false;
                } else if (selected && selected.has('__NONE__')) {
                    return false;
                }
            }
            return true;
        });

        // 3. Ordenação
        if (state.sort.key) {
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
                
                if (col && col.type === 'number') {
                    valA = parseInt(valA) || 0;
                    valB = parseInt(valB) || 0;
                } else {
                    valA = String(valA).toLowerCase();
                    valB = String(valB).toLowerCase();
                }
                
                if (valA < valB) return -1 * dir;
                if (valA > valB) return 1 * dir;
                return 0;
            });
        }

        // 4. Paginação
        state.pagination.total = state.filteredData.length;
        const totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        if (state.pagination.current > totalPages) state.pagination.current = Math.max(1, totalPages);
        const start = (state.pagination.current - 1) * state.pagination.limit;
        state.viewData = state.filteredData.slice(start, start + state.pagination.limit);

        // Controlar visibilidade do botão Remover Filtros
        let hasAnyFilter = false;
        for (let key in state.filters) {
            if (state.filters[key] && state.filters[key].size > 0) {
                hasAnyFilter = true; break;
            }
        }
        
        if (hasAnyFilter) {
            elements.btnClearFilters.classList.remove('hidden');
            elements.btnClearFilters.classList.add('flex');
        } else {
            elements.btnClearFilters.classList.add('hidden');
            elements.btnClearFilters.classList.remove('flex');
        }

        renderHeaders();
        renderTableBody();
        renderPagination();
    };

    // ==========================================
    // 5. Renderização (DOM)
    // ==========================================
    const renderHeaders = () => {
        if (!elements.tableHeader) return;
        let html = '<tr class="text-steel-600 dark:text-gray-300 text-[12px] font-medium">';
        
        columns.forEach(col => {
            const sortIcon = state.sort.key === col.key ? (state.sort.dir === 'asc' ? '↑' : '↓') : '↕';
            const hasFilter = state.filters[col.key] && state.filters[col.key].size > 0 && !state.filters[col.key].has('__NONE__');
            const hasNoneFilter = state.filters[col.key] && state.filters[col.key].has('__NONE__');
            const isFiltered = hasFilter || hasNoneFilter;
            const filterColor = isFiltered ? 'text-nexo-500' : 'text-steel-300 dark:text-steel-600 hover:text-steel-500';
            const isSticky = col.sticky ? 'sticky-col bg-gray-50 dark:bg-steel-900 border-r border-gray-200 dark:border-steel-700 shadow-[1px_0_0_rgba(229,231,235,1)] dark:shadow-[1px_0_0_rgba(55,65,81,1)]' : '';

            html += `
                <th class="px-3 py-2.5 border-b border-gray-200 dark:border-steel-700 whitespace-nowrap select-none relative align-middle ${isSticky}">
                    <div class="flex items-center justify-center w-full h-full">
                        <div class="cursor-pointer hover:text-nexo-600 transition-colors text-center" onclick="ClientesGrid.toggleSort('${col.key}')">
                            ${col.label} <span class="text-[10px] ml-1 opacity-50">${sortIcon}</span>
                        </div>
                    </div>
                    <button onclick="ClientesGrid.openFilter(event, '${col.key}')" class="p-1 rounded focus:outline-none flex-shrink-0 ${filterColor} absolute right-2 top-1/2 -translate-y-1/2 z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </th>
            `;
        });
        
        html += '</tr>';
        
        elements.tableHeader.innerHTML = html;
    };

    const renderTableBody = () => {
        if (!elements.tableBody) return;
        if (state.viewData.length === 0) {
            elements.tableBody.innerHTML = `<tr><td colspan="${columns.length}" class="px-6 py-12 text-center text-steel-500">Nenhum registro encontrado.</td></tr>`;
            return;
        }

        let html = '';
        state.viewData.forEach(row => {
            html += `<tr class="h-[60px] hover:bg-nexo-50/80 dark:hover:bg-nexo-500/10 transition-colors duration-200 group cursor-pointer" onauxclick="if(event.button === 1) window.open('/clientes/${row.codigo}', '_blank')" onclick="if(event.ctrlKey || event.metaKey) window.open('/clientes/${row.codigo}', '_blank'); else window.location.href='/clientes/${row.codigo}'">`;
            
            columns.forEach(col => {
                let val = row[col.key];
                if (val === null || val === undefined) val = '-';
                const isSticky = col.sticky ? 'sticky-col bg-white dark:bg-steel-800 group-hover:bg-nexo-50/80 dark:group-hover:bg-nexo-500/10 border-r border-gray-100 dark:border-steel-700 font-medium' : '';
                html += `<td class="px-4 py-2 text-[13px] whitespace-nowrap text-center ${isSticky}">${val}</td>`;
            });
            
            html += '</tr>';
        });
        elements.tableBody.innerHTML = html;
    };

    const renderPagination = () => {
        const info = document.getElementById('paginationInfo');
        const controls = document.getElementById('paginationControls');
        if (!info || !controls) return;

        const { current, limit, total } = state.pagination;
        const totalPages = Math.ceil(total / limit) || 1;
        const start = total === 0 ? 0 : ((current - 1) * limit) + 1;
        const end = Math.min(current * limit, total);
        
        info.textContent = `Mostrando ${start} a ${end} de ${total} registros`;
        
        let html = '';

        // First
        html += `<button onclick="ClientesGrid.changePage(1)" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${current === 1 ? 'disabled' : ''} title="Primeira Página">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>
        </button>`;
        // Prev
        html += `<button onclick="ClientesGrid.changePage(${current - 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${current === 1 ? 'disabled' : ''} title="Anterior">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
        </button>`;
        // Pages
        let startPage = Math.max(1, current - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
        for (let i = startPage; i <= endPage; i++) {
            if (i === current) {
                html += `<button class="px-3 py-1 text-sm font-medium rounded bg-nexo-50 dark:bg-nexo-900/30 text-nexo-600 dark:text-nexo-400">${i}</button>`;
            } else {
                html += `<button onclick="ClientesGrid.changePage(${i})" class="px-3 py-1 text-sm font-medium rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700">${i}</button>`;
            }
        }
        // Next
        html += `<button onclick="ClientesGrid.changePage(${current + 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${current === totalPages || totalPages === 0 ? 'disabled' : ''} title="Próxima">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
        </button>`;
        // Last
        html += `<button onclick="ClientesGrid.changePage(${totalPages})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${current === totalPages || totalPages === 0 ? 'disabled' : ''} title="Última Página">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414zm6 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
        </button>`;
        
        controls.innerHTML = html;
    };

    // ==========================================
    // 6. Lógica de Filtros Modal (Excel-like Padrão do Sistema)
    // ==========================================
    const openFilter = (event, columnKey) => {
        event.stopPropagation();
        
        if (activeFilterModal) {
            closeFilterModal();
        }
        
        const col = columns.find(c => c.key === columnKey);
        
        // Valores únicos respeitando os outros filtros (cascata)
        const baseForFilter = state.rawData.filter(row => {
            for (let k in state.filters) {
                if (k === columnKey) continue;
                const sel = state.filters[k];
                if (sel && sel.size > 0 && !sel.has('__NONE__')) {
                    const v = row[k] !== null && row[k] !== undefined && row[k] !== '' ? String(row[k]) : '(Vazio)';
                    if (!sel.has(v)) return false;
                } else if (sel && sel.has('__NONE__')) {
                    return false;
                }
            }
            return true;
        });

        const rawValuesMapped = baseForFilter.map(row => {
            const v = row[columnKey];
            return (v !== null && v !== undefined && v !== '') ? String(v) : '(Vazio)';
        });

        const uniqueValues = [...new Set(rawValuesMapped)].sort((a, b) => {
            if (a === '(Vazio)') return 1;
            if (b === '(Vazio)') return -1;
            if (typeof a === 'number' && typeof b === 'number') return a - b;
            return String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
        });
        
        if (!state.filters[columnKey]) state.filters[columnKey] = new Set();
        
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
            <div class="p-3 border-t border-gray-100 dark:border-steel-700 flex justify-between items-center bg-gray-50 dark:bg-steel-800/50 rounded-b-lg">
                <button id="btnClearFilter" class="text-xs text-steel-500 hover:text-steel-700 dark:hover:text-gray-300 font-medium">Limpar</button>
                <button id="btnApplyFilter" class="text-xs bg-nexo-600 hover:bg-nexo-700 text-white px-3 py-1.5 rounded font-medium shadow-sm">Aplicar</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        activeFilterModal = modal;

        const listContainer = modal.querySelector('#filterCheckboxList');
        const searchInput = modal.querySelector('#filterSearchInput');
        
        const tempSelected = new Set(state.filters[columnKey]);
        
        if (tempSelected.size === 0 || tempSelected.has('__NONE__')) {
            if (!tempSelected.has('__NONE__')) uniqueValues.forEach(v => tempSelected.add(v));
            else tempSelected.clear();
        }

        const renderCheckboxes = (term = '') => {
            listContainer.innerHTML = '';
            
            const filteredVals = uniqueValues.filter(v => {
                if (!term) return true;
                return String(v).toLowerCase().includes(term.toLowerCase());
            });

            if (filteredVals.length === 0) {
                listContainer.innerHTML = '<p class="text-xs text-steel-400 p-2 text-center">Nenhum valor encontrado.</p>';
                return;
            }

            // (Selecionar Tudo)
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
                    tempSelected.clear(); // Limpa totalmente para facilitar nova seleção
                }
                renderCheckboxes(term);
            };
            listContainer.appendChild(selectAllDiv);

            // Valores Normais
            filteredVals.forEach(val => {
                const isChecked = tempSelected.has(val);
                const div = document.createElement('div');
                div.className = 'flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer';
                const display = (val === '-') ? '(Vazio / Não Nulo)' : val;
                div.innerHTML = `<input type="checkbox" value="${val}" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${isChecked ? 'checked' : ''}><span class="truncate text-steel-600 dark:text-gray-400" title="${display}">${display}</span>`;
                const cb = div.querySelector('input');
                div.onclick = e => {
                    if (e.target !== cb) cb.checked = !cb.checked;
                    if (cb.checked) tempSelected.add(val); else tempSelected.delete(val);
                    renderCheckboxes(term);
                };
                listContainer.appendChild(div);
            });
        };
        
        renderCheckboxes();
        searchInput.focus();
        searchInput.oninput = (ev) => renderCheckboxes(ev.target.value);
        
        modal.querySelector('#btnClearFilter').onclick = () => {
            delete state.filters[columnKey];
            closeFilterModal();
            processData();
        };
        
        modal.querySelector('#btnApplyFilter').onclick = () => {
            const term = searchInput.value.trim().toLowerCase();
            let finalSet = new Set(tempSelected);

            // UX Inteligente: Se o usuário clicou em Aplicar com uma pesquisa ativa E não havia desmarcado nada 
            // (ou seja, tempSelected tem tudo), assumimos que ele quer filtrar apenas os resultados daquela pesquisa.
            if (term && uniqueValues.every(v => tempSelected.has(v))) {
                finalSet.clear();
                uniqueValues.forEach(v => {
                    if (String(v).toLowerCase().includes(term)) {
                        finalSet.add(v);
                    }
                });
            }

            const hasAll = uniqueValues.every(v => finalSet.has(v));
            if (hasAll && !finalSet.has('__NONE__')) {
                delete state.filters[columnKey];
            } else if (finalSet.size === 0) {
                state.filters[columnKey] = new Set(['__NONE__']);
            } else {
                state.filters[columnKey] = finalSet;
            }
            closeFilterModal();
            processData();
        };
    };

    const closeFilterModal = () => {
        if (activeFilterModal) {
            activeFilterModal.remove();
            activeFilterModal = null;
        }
    };

    // ==========================================
    // 7. Ações Expostas (Public API)
    // ==========================================
    const toggleSort = (key) => {
        if (state.sort.key === key) {
            state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
        } else {
            state.sort.key = key;
            state.sort.dir = 'asc';
        }
        processData();
    };

    const changePage = (p) => {
        state.pagination.current = p;
        processData();
    };

    const clearAllFilters = () => {
        state.filters = {};
        if (elements.searchInput) elements.searchInput.value = '';
        state.pagination.current = 1;
        processData();
    };

    // Fechar modais ao clicar fora
    document.addEventListener('click', (e) => {
        if (activeFilterModal && !activeFilterModal.contains(e.target)) {
            if (!e.target.closest('button[onclick^="ClientesGrid.openFilter"]')) {
                closeFilterModal();
            }
        }
    });

    const init = () => {
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', () => {
                state.pagination.current = 1;
                processData();
            });
        }
        
        if (elements.itemsPerPage) {
            elements.itemsPerPage.addEventListener('change', (e) => {
                state.pagination.limit = parseInt(e.target.value);
                state.pagination.current = 1;
                processData();
            });
        }

        loadData();
    };

    return {
        init,
        toggleSort,
        changePage,
        openFilter,
        clearAllFilters
    };

})();

document.addEventListener('DOMContentLoaded', ClientesGrid.init);
