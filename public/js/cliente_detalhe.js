/**
 * Gerenciamento da Tela de Detalhe do Cliente
 * Ficha Cadastral + KPIs + Grid de Notas Fiscais (dados mockados).
 */
const ClienteDetalhe = (() => {

    // ==========================================
    // 1. Extrair ID do Cliente da URL
    // ==========================================
    const clienteId = window.location.pathname.split('/').pop();

    // ==========================================
    // 2. Dados Mockados (Ficha Cadastral)
    // ==========================================
    const clienteMock = {
        codigo: clienteId,
        razaoSocial: 'Hospital Santa Casa de Misericórdia de Belo Horizonte',
        nomeFantasia: 'Santa Casa BH',
        classificacao: 'Pessoa Jurídica',
        cnpj: '17.214.847/0001-06',
        endereco: 'Av. Francisco Sales, 1111 - Santa Efigênia',
        cidade: 'Belo Horizonte',
        uf: 'MG',
        cep: '30150-221',
        email: 'compras@santacasabh.org.br',
        telefone: '(31) 3238-8100'
    };

    // ==========================================
    // 3. Dados Mockados (Notas Fiscais)
    // ==========================================
    const notasMock = [
        { numNota: 15423, serie: '1', dataEmissao: '2026-01-15', dataVencimento: '2026-02-14', valorNota: 45200.00, valorPago: 45200.00, status: 'PAGO' },
        { numNota: 15487, serie: '1', dataEmissao: '2026-02-10', dataVencimento: '2026-03-12', valorNota: 32780.50, valorPago: 32780.50, status: 'PAGO' },
        { numNota: 15512, serie: '1', dataEmissao: '2026-03-05', dataVencimento: '2026-04-04', valorNota: 18950.00, valorPago: 0, status: 'ATRASADO' },
        { numNota: 15534, serie: '1', dataEmissao: '2026-03-20', dataVencimento: '2026-04-19', valorNota: 67400.00, valorPago: 67400.00, status: 'PAGO' },
        { numNota: 15601, serie: '1', dataEmissao: '2026-04-08', dataVencimento: '2026-05-08', valorNota: 23100.75, valorPago: 0, status: 'ATRASADO' },
        { numNota: 15645, serie: '1', dataEmissao: '2026-04-22', dataVencimento: '2026-05-22', valorNota: 51800.00, valorPago: 51800.00, status: 'PAGO' },
        { numNota: 15702, serie: '1', dataEmissao: '2026-05-10', dataVencimento: '2026-06-09', valorNota: 14300.00, valorPago: 14300.00, status: 'PAGO' },
        { numNota: 15756, serie: '1', dataEmissao: '2026-05-28', dataVencimento: '2026-06-27', valorNota: 89200.00, valorPago: 0, status: 'PENDENTE' },
        { numNota: 15801, serie: '1', dataEmissao: '2026-06-15', dataVencimento: '2026-07-15', valorNota: 37600.25, valorPago: 0, status: 'PENDENTE' },
        { numNota: 15834, serie: '1', dataEmissao: '2026-06-30', dataVencimento: '2026-07-30', valorNota: 42150.00, valorPago: 42150.00, status: 'PAGO' },
        { numNota: 15890, serie: '1', dataEmissao: '2026-07-12', dataVencimento: '2026-08-11', valorNota: 28700.00, valorPago: 0, status: 'PENDENTE' },
        { numNota: 15923, serie: '1', dataEmissao: '2026-07-25', dataVencimento: '2026-08-24', valorNota: 55430.50, valorPago: 0, status: 'PENDENTE' },
    ];

    // ==========================================
    // 4. Definição das Colunas do Grid
    // ==========================================
    const columns = [
        { key: 'numNota', label: 'Nº Nota', type: 'number' },
        { key: 'serie', label: 'Série' },
        { key: 'dataEmissao', label: 'Data Emissão', type: 'date' },
        { key: 'dataVencimento', label: 'Data Vencimento', type: 'date' },
        { key: 'valorNota', label: 'Valor Nota', type: 'currency' },
        { key: 'valorPago', label: 'Valor Pago', type: 'currency' },
        {
            key: 'status', label: 'Status', render: v => {
                const styles = {
                    'PAGO': { grad: 'linear-gradient(135deg, #1cc88a, #17a673)', color: '#fff' },
                    'ATRASADO': { grad: 'linear-gradient(135deg, #e74a3b, #c0392b)', color: '#fff' },
                    'PENDENTE': { grad: 'linear-gradient(135deg, #f6c23e, #dda520)', color: '#fff' }
                };
                const s = styles[v] || { grad: 'linear-gradient(135deg, #858796, #6c6d7e)', color: '#fff' };
                return `<span style="background:${s.grad};color:${s.color};padding:1px 7px;border-radius:9999px;font-size:9px;font-weight:600;letter-spacing:0.03em;white-space:nowrap;display:inline-block;line-height:1.4;">${v}</span>`;
            }
        }
    ];

    // ==========================================
    // 5. Estado Global do Grid
    // ==========================================
    const state = {
        rawData: [],
        filteredData: [],
        viewData: [],
        filters: {},
        sort: { key: 'numNota', dir: 'desc' },
        pagination: { current: 1, limit: 25, total: 0 }
    };

    let activeFilterModal = null;

    // ==========================================
    // 6. Elementos DOM
    // ==========================================
    const elements = {};

    // ==========================================
    // 7. Inicialização
    // ==========================================
    const init = () => {
        elements.tableHeader = document.getElementById('notasTableHeader');
        elements.tableBody = document.getElementById('notasTableBody');
        elements.btnClearFilters = document.getElementById('btnClearFiltersNotas');

        // Preencher ficha cadastral
        renderFichaCadastral();

        // Carregar dados mockados
        state.rawData = [...notasMock];

        // Montar grid
        processData();

        // Items per page
        const perPage = document.getElementById('notasPerPage');
        if (perPage) {
            perPage.addEventListener('change', (e) => {
                state.pagination.limit = parseInt(e.target.value);
                state.pagination.current = 1;
                processData();
            });
        }

        // Fechar filtro ao clicar fora
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('notasFilterModal');
            if (modal && !modal.classList.contains('hidden') && !modal.contains(e.target) && !e.target.closest('[data-filter-btn]')) {
                modal.classList.add('hidden');
                activeFilterModal = null;
            }
        });
    };

    // ==========================================
    // 8. Ficha Cadastral
    // ==========================================
    const renderFichaCadastral = () => {
        document.getElementById('breadcrumbClientName').textContent = clienteMock.razaoSocial;
        document.getElementById('clienteNome').textContent = clienteMock.razaoSocial;
        document.getElementById('clienteFantasia').textContent = clienteMock.nomeFantasia;
        document.getElementById('clienteClassificacao').textContent = clienteMock.classificacao;
        document.getElementById('clienteCnpj').textContent = clienteMock.cnpj;
        document.getElementById('clienteEndereco').textContent = clienteMock.endereco;
        document.getElementById('clienteCidade').textContent = clienteMock.cidade;
        document.getElementById('clienteUf').textContent = clienteMock.uf;
        document.getElementById('clienteCep').textContent = clienteMock.cep;
        document.getElementById('clienteEmail').textContent = clienteMock.email;
        document.getElementById('clienteTelefone').textContent = clienteMock.telefone;
    };

    // ==========================================
    // 9. Processamento de Dados (Filtrar + Ordenar + Paginar)
    // ==========================================
    const processData = () => {
        // 1. Filtragem
        let data = [...state.rawData];
        for (const [colKey, allowedSet] of Object.entries(state.filters)) {
            if (allowedSet && allowedSet.size > 0) {
                data = data.filter(row => {
                    let val = row[colKey];
                    if (val === null || val === undefined || val === '') val = '__EMPTY__';
                    else val = String(val);
                    return allowedSet.has(val);
                });
            }
        }
        state.filteredData = data;

        // 2. Ordenação
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

                if (col && (col.type === 'number' || col.type === 'currency')) {
                    valA = parseFloat(valA) || 0;
                    valB = parseFloat(valB) || 0;
                } else {
                    valA = String(valA).toLowerCase();
                    valB = String(valB).toLowerCase();
                }

                if (valA < valB) return -1 * dir;
                if (valA > valB) return 1 * dir;
                return 0;
            });
        }

        // 3. Paginação
        state.pagination.total = state.filteredData.length;
        const totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        if (state.pagination.current > totalPages) state.pagination.current = Math.max(1, totalPages);
        const start = (state.pagination.current - 1) * state.pagination.limit;
        state.viewData = state.filteredData.slice(start, start + state.pagination.limit);

        // Controlar botão "Remover Filtros"
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

        // Atualizar KPIs com dados filtrados
        updateKpis();

        renderHeaders();
        renderTableBody();
        renderPagination();
    };

    // ==========================================
    // 10. Atualizar KPIs
    // ==========================================
    const formatBRL = (value) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const updateKpis = () => {
        const data = state.filteredData;
        const vendido = data.reduce((sum, r) => sum + (r.valorNota || 0), 0);
        const pago = data.reduce((sum, r) => sum + (r.valorPago || 0), 0);
        const aberto = data.filter(r => r.status === 'PENDENTE' || r.status === 'ATRASADO').reduce((sum, r) => sum + (r.valorNota || 0), 0);
        const processos = data.filter(r => r.status === 'PENDENTE' || r.status === 'ATRASADO').length;

        document.getElementById('kpiVendido').textContent = formatBRL(vendido);
        document.getElementById('kpiPago').textContent = formatBRL(pago);
        document.getElementById('kpiAberto').textContent = formatBRL(aberto);
        document.getElementById('kpiProcessos').textContent = processos;
    };

    // ==========================================
    // 11. Renderização de Cabeçalhos
    // ==========================================
    const renderHeaders = () => {
        if (!elements.tableHeader) return;
        let html = '<tr class="text-steel-600 dark:text-gray-300 text-[12px] font-medium">';

        columns.forEach(col => {
            const sortIcon = state.sort.key === col.key ? (state.sort.dir === 'asc' ? '↑' : '↓') : '↕';
            const hasFilter = state.filters[col.key] && state.filters[col.key].size > 0;
            const filterColor = hasFilter ? 'text-nexo-500' : 'text-steel-300 dark:text-steel-600 hover:text-steel-500';

            html += `
                <th class="px-3 py-2.5 border-b border-gray-200 dark:border-steel-700 whitespace-nowrap select-none relative align-middle">
                    <div class="flex items-center justify-center w-full h-full">
                        <div class="cursor-pointer hover:text-nexo-600 transition-colors text-center" onclick="ClienteDetalhe.toggleSort('${col.key}')">
                            ${col.label} <span class="text-[10px] ml-1 opacity-50">${sortIcon}</span>
                        </div>
                    </div>
                    <button data-filter-btn onclick="ClienteDetalhe.openFilter(event, '${col.key}')" class="p-1 rounded focus:outline-none flex-shrink-0 ${filterColor} absolute right-2 top-1/2 -translate-y-1/2 z-10">
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

    // ==========================================
    // 12. Renderização do Corpo da Tabela
    // ==========================================
    const renderTableBody = () => {
        if (!elements.tableBody) return;
        if (state.viewData.length === 0) {
            elements.tableBody.innerHTML = `<tr><td colspan="${columns.length}" class="px-6 py-12 text-center text-steel-500">Nenhum registro encontrado.</td></tr>`;
            return;
        }

        let html = '';
        state.viewData.forEach(row => {
            html += `<tr class="h-[52px] hover:bg-gray-50 dark:hover:bg-steel-700/30 transition-colors duration-200">`;

            columns.forEach(col => {
                let val = row[col.key];
                if (val === null || val === undefined) val = '-';

                // Formatação por tipo
                if (col.type === 'currency' && val !== '-') {
                    val = parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                } else if (col.type === 'date' && val !== '-') {
                    const d = new Date(val + 'T00:00:00');
                    if (!isNaN(d)) val = d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                }

                // Render customizado (ex: status badge)
                if (col.render && row[col.key] !== null && row[col.key] !== undefined) {
                    val = col.render(row[col.key]);
                }

                html += `<td class="px-4 py-2 text-[13px] whitespace-nowrap text-center">${val}</td>`;
            });

            html += '</tr>';
        });
        elements.tableBody.innerHTML = html;
    };

    // ==========================================
    // 13. Paginação (Padrão minimalista do sistema)
    // ==========================================
    const renderPagination = () => {
        const info = document.getElementById('notasPaginationInfo');
        const controls = document.getElementById('notasPaginationControls');
        if (!info || !controls) return;

        const { current, limit, total } = state.pagination;
        const totalPages = Math.ceil(total / limit) || 1;
        const start = Math.min((current - 1) * limit + 1, total);
        const end = Math.min(current * limit, total);

        info.textContent = `Mostrando ${start} a ${end} de ${total} registros`;

        let html = '';

        // First
        html += `<button onclick="ClienteDetalhe.changePage(1)" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${current === 1 ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>
        </button>`;

        // Prev
        html += `<button onclick="ClienteDetalhe.changePage(${current - 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${current === 1 ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
        </button>`;

        // Page numbers
        let startPage = Math.max(1, current - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === current;
            html += `<button onclick="ClienteDetalhe.changePage(${i})" class="w-8 h-8 rounded text-sm font-medium transition-colors ${isActive ? 'bg-nexo-500 text-white shadow-sm' : 'text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700'}">${i}</button>`;
        }

        // Next
        html += `<button onclick="ClienteDetalhe.changePage(${current + 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${current === totalPages ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
        </button>`;

        // Last
        html += `<button onclick="ClienteDetalhe.changePage(${totalPages})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${current === totalPages ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414zm6 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
        </button>`;

        controls.innerHTML = html;
    };

    // ==========================================
    // 14. Filtros (Modal Dinâmico)
    // ==========================================
    const openFilter = (event, colKey) => {
        event.stopPropagation();

        // Criar ou reutilizar o modal
        let modal = document.getElementById('notasFilterModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'notasFilterModal';
            modal.className = 'hidden fixed z-50 bg-white dark:bg-steel-800 rounded-lg shadow-xl border border-gray-200 dark:border-steel-700 w-72 flex flex-col max-h-96';
            modal.innerHTML = `
                <div class="p-3 border-b border-gray-200 dark:border-steel-700 sticky top-0 bg-white dark:bg-steel-800 rounded-t-lg z-10 shrink-0">
                    <input type="text" id="notasFilterSearch" placeholder="Pesquisar..." class="w-full text-xs px-3 py-1.5 border border-gray-200 dark:border-steel-600 bg-gray-50 dark:bg-steel-700 rounded text-steel-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-nexo-500">
                </div>
                <div class="p-2 overflow-y-auto custom-scrollbar flex-1" id="notasFilterOptions"></div>
                <div class="p-3 border-t border-gray-200 dark:border-steel-700 sticky bottom-0 bg-white dark:bg-steel-800 rounded-b-lg z-10 flex justify-between gap-2 shrink-0">
                    <button id="notasFilterClear" class="flex-1 text-xs px-2 py-1.5 text-steel-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-steel-700 rounded transition-colors">Limpar</button>
                    <button id="notasFilterApply" class="flex-1 text-xs px-2 py-1.5 bg-nexo-500 hover:bg-nexo-600 text-white rounded transition-colors">Aplicar</button>
                </div>
            `;
            document.body.appendChild(modal);

            // Injetar custom-scrollbar style
            if (!document.getElementById('filterScrollStyle')) {
                const style = document.createElement('style');
                style.id = 'filterScrollStyle';
                style.textContent = `
                    #notasFilterOptions::-webkit-scrollbar { width: 6px; }
                    #notasFilterOptions::-webkit-scrollbar-track { background: transparent; }
                    #notasFilterOptions::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                    .dark #notasFilterOptions::-webkit-scrollbar-thumb { background: #475569; }
                `;
                document.head.appendChild(style);
            }
        }

        activeFilterModal = colKey;

        // Coletar valores únicos da coluna
        const uniqueVals = new Set();
        state.rawData.forEach(row => {
            let val = row[colKey];
            if (val === null || val === undefined || val === '') {
                uniqueVals.add('__EMPTY__');
            } else {
                uniqueVals.add(String(val));
            }
        });
        const sortedVals = [...uniqueVals].sort((a, b) => {
            if (a === '__EMPTY__') return 1;
            if (b === '__EMPTY__') return -1;
            return a.localeCompare(b, 'pt-BR', { numeric: true });
        });

        // Determinar quais estão marcados
        const currentFilter = state.filters[colKey];
        const hasActiveFilter = currentFilter && currentFilter.size > 0;

        // Renderizar opções
        const optionsList = document.getElementById('notasFilterOptions');
        let optHtml = '';

        // (Selecionar Tudo)
        const allChecked = !hasActiveFilter;
        optHtml += `
            <label class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-steel-700/50 cursor-pointer transition-colors select-all-option" data-val="__ALL__">
                <input type="checkbox" class="w-3.5 h-3.5 rounded border-gray-300 text-nexo-500 focus:ring-nexo-500 accent-nexo-500" ${allChecked ? 'checked' : ''}>
                <span class="text-xs font-semibold text-steel-700 dark:text-gray-200">(Selecionar Tudo)</span>
            </label>
        `;

        sortedVals.forEach(val => {
            const displayVal = val === '__EMPTY__' ? '(Vazio)' : val;
            const isChecked = allChecked || (hasActiveFilter && currentFilter.has(val));
            optHtml += `
                <label class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-steel-700/50 cursor-pointer transition-colors filter-option" data-val="${val}">
                    <input type="checkbox" class="w-3.5 h-3.5 rounded border-gray-300 text-nexo-500 focus:ring-nexo-500 accent-nexo-500" ${isChecked ? 'checked' : ''}>
                    <span class="text-xs text-steel-600 dark:text-gray-300 truncate">${displayVal}</span>
                </label>
            `;
        });

        optionsList.innerHTML = optHtml;

        // Bindings
        const selectAllCb = optionsList.querySelector('.select-all-option input');
        const optionCbs = optionsList.querySelectorAll('.filter-option input');

        selectAllCb.addEventListener('change', () => {
            optionCbs.forEach(cb => cb.checked = selectAllCb.checked);
        });
        optionCbs.forEach(cb => {
            cb.addEventListener('change', () => {
                const allCheckedNow = [...optionCbs].every(c => c.checked);
                selectAllCb.checked = allCheckedNow;
            });
        });

        // Search
        const searchInput = document.getElementById('notasFilterSearch');
        searchInput.value = '';
        searchInput.oninput = () => {
            const term = searchInput.value.toLowerCase();
            optionsList.querySelectorAll('.filter-option').forEach(label => {
                const text = label.querySelector('span').textContent.toLowerCase();
                label.style.display = text.includes(term) ? '' : 'none';
            });
        };

        // Buttons
        document.getElementById('notasFilterClear').onclick = () => {
            delete state.filters[colKey];
            modal.classList.add('hidden');
            activeFilterModal = null;
            processData();
        };

        document.getElementById('notasFilterApply').onclick = () => {
            const checkedVals = new Set();
            optionsList.querySelectorAll('.filter-option').forEach(label => {
                const cb = label.querySelector('input');
                if (cb.checked) {
                    checkedVals.add(label.dataset.val);
                }
            });

            // Se todos marcados, equivale a "sem filtro"
            if (checkedVals.size === sortedVals.length || selectAllCb.checked) {
                delete state.filters[colKey];
            } else {
                state.filters[colKey] = checkedVals;
            }

            state.pagination.current = 1;
            modal.classList.add('hidden');
            activeFilterModal = null;
            processData();
        };

        // Posicionar o modal
        modal.classList.remove('hidden');
        const btn = event.currentTarget;
        const rect = btn.getBoundingClientRect();
        modal.style.top = (rect.bottom + 4) + 'px';
        modal.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 300)) + 'px';

        // Focus no search
        setTimeout(() => searchInput.focus(), 50);
    };

    // ==========================================
    // 15. Ações Públicas
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

    const changePage = (page) => {
        const totalPages = Math.ceil(state.pagination.total / state.pagination.limit) || 1;
        if (page < 1 || page > totalPages) return;
        state.pagination.current = page;
        processData();
    };

    const clearAllFilters = () => {
        state.filters = {};
        state.pagination.current = 1;
        processData();
    };

    // ==========================================
    // 16. Boot
    // ==========================================
    document.addEventListener('DOMContentLoaded', init);

    return {
        toggleSort,
        changePage,
        clearAllFilters,
        openFilter
    };
})();
