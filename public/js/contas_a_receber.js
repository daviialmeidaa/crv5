const ContasGrid = (function () {

    // 1. Definição das Colunas
    const columns = [
        { key: 'empresa', label: 'Empresa Vendedora', sticky: true },
        { key: 'nota', label: 'Nota', sticky: true },
        { key: 'codCliente', label: 'Cód. Cliente' },
        { key: 'cliente', label: 'Cliente' },
        { key: 'esfera', label: 'Esfera' },
        { key: 'uf', label: 'UF' },
        { key: 'contrato', label: 'Contrato' },
        { key: 'tipoContrato', label: 'Tipo Contrato' },
        { key: 'edital', label: 'Edital' },
        { key: 'classificacao', label: 'Classificação' },
        { key: 'empenho', label: 'Nº Empenho' },
        { key: 'documento', label: 'Nº Documento' },
        { key: 'valor', label: 'Valor Nota', type: 'currency' },
        { key: 'boletoEmitido', label: 'Boleto Emitido' },
        { key: 'valorRecebido', label: 'Valor Depósito', type: 'currency' },
        { key: 'dataEmissao', label: 'Data de Emissão', type: 'date' },
        { key: 'dataVencimento', label: 'Data de Vencimento', type: 'date' },
        { key: 'dataPagamento', label: 'Data de Pagamento', type: 'date' },
        {
            key: 'status', label: 'Status do Pagamento', render: v => {
                const badges = {
                    'Pago': { grad: 'linear-gradient(135deg, #1cc88a, #17a673)', color: '#fff' },
                    'Atrasado': { grad: 'linear-gradient(135deg, #e74a3b, #c0392b)', color: '#fff' },
                    'Pendente': { grad: 'linear-gradient(135deg, #f6c23e, #dda520)', color: '#fff' }
                };
                const s = badges[v] || { grad: 'linear-gradient(135deg, #858796, #6c6d7e)', color: '#fff' };
                return `<span style="background:${s.grad};color:${s.color};padding:1px 7px;border-radius:9999px;font-size:9px;font-weight:600;letter-spacing:0.03em;white-space:nowrap;display:inline-block;line-height:1.4;">${v}</span>`;
            }
        },
        { key: 'conta', label: 'Banco' },
        { key: 'retemIr', label: 'Retém IR?' }
    ];

    // 2. Estado Global
    const state = {
        rawData: [],
        filteredData: [],
        viewData: [],
        filters: {}, // { columnKey: Set(['Val1', 'Val2']) }
        sort: { key: 'dataEmissao', dir: 'desc' }, // Default order
        pagination: { current: 1, limit: 25, total: 0 }
    };

    // 3. Integração com Banco de Dados PostgreSQL
    async function fetchData() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/titulos', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Falha ao buscar dados');

            const data = await res.json();

            // Mapeando do DB (snake_case) para a grid (camelCase)
            state.rawData = data.map(row => ({
                cliente: row.cliente || '-',
                empresa: row.empresa || '-',
                nota: row.nota || '-',
                codCliente: row.cod_cliente || '-',
                esfera: row.esfera || '-',
                uf: row.uf || '-',
                contrato: row.contrato || '-',
                tipoContrato: row.tipo_contrato || '-',
                edital: row.edital || '-',
                classificacao: row.classificacao || '-',
                empenho: row.empenho || '-',
                documento: row.documento || '-',
                valor: row.valor_nota ? row.valor_nota.toString() : '0.00',
                boletoEmitido: row.boleto_emitido || 'Não',
                valorRecebido: row.valor_deposito ? row.valor_deposito.toString() : '0.00',
                dataEmissao: row.data_emissao ? row.data_emissao.split('T')[0] : '-',
                dataVencimento: row.data_vencimento ? row.data_vencimento.split('T')[0] : '-',
                dataPagamento: row.data_pagamento ? row.data_pagamento.split('T')[0] : '-',
                status: (() => {
                    const raw = row.status ? row.status.trim() : '';
                    if (raw.toUpperCase() === 'PAGO') return 'Pago';
                    // Pendente ou vazio: checar se está atrasado
                    if (row.data_vencimento) {
                        const venc = new Date(row.data_vencimento.split('T')[0]);
                        const hoje = new Date();
                        hoje.setHours(0, 0, 0, 0);
                        if (venc < hoje && (!row.data_pagamento)) return 'Atrasado';
                    }
                    return 'Pendente';
                })(),
                conta: row.banco || '-',
                retemIr: row.retem_ir || 'Não'
            }));

            processData();
        } catch (err) {
            console.error(err);
            document.getElementById('contasTableBody').innerHTML = `<tr><td colspan="22" class="px-6 py-12 text-center text-red-500">Erro ao carregar dados do servidor. O banco local está rodando?</td></tr>`;
        }
    }

    // 4. Lógica de Pipeline (Filtro -> Ordenação -> Paginação)
    function processData() {
        // 4.1 Aplicar Filtros Dinâmicos
        state.filteredData = state.rawData.filter(row => {
            for (let key in state.filters) {
                const selectedValues = state.filters[key];
                if (selectedValues.size > 0) {
                    if (!selectedValues.has(row[key])) {
                        return false; // Falhou em um dos filtros
                    }
                }
            }
            return true;
        });

        // 4.2 Aplicar Ordenação
        if (state.sort.key) {
            const col = columns.find(c => c.key === state.sort.key);
            const dir = state.sort.dir === 'asc' ? 1 : -1;

            state.filteredData.sort((a, b) => {
                let valA = a[state.sort.key];
                let valB = b[state.sort.key];

                if (col.type === 'currency') {
                    valA = parseFloat(valA) || 0;
                    valB = parseFloat(valB) || 0;
                } else if (col.type === 'date') {
                    // Trata as datas e joga vazios ('-') sempre para o final
                    const isValAEmpty = !valA || valA === '-';
                    const isValBEmpty = !valB || valB === '-';
                    
                    if (isValAEmpty && isValBEmpty) return 0;
                    if (isValAEmpty) return 1; // Joga vazio pro final independente da direção
                    if (isValBEmpty) return -1;
                    
                    valA = new Date(valA).getTime();
                    valB = new Date(valB).getTime();
                }

                if (valA < valB) return -1 * dir;
                if (valA > valB) return 1 * dir;
                
                // Empate no critério principal! Desempate (Tie-breaker)
                
                // 1º Desempate: Agrupar pela mesma Nota (Ordem Decrescente, notas mais novas primeiro)
                const notaA = a.nota || '';
                const notaB = b.nota || '';
                if (notaA > notaB) return -1;
                if (notaA < notaB) return 1;

                // 2º Desempate: Se for a mesma nota (ex: parcelamentos), ordenar pelo Documento Crescente (ex: -1 vem antes do -2)
                const docA = a.documento || '';
                const docB = b.documento || '';
                if (docA < docB) return -1;
                if (docA > docB) return 1;

                return 0;
            });
        }

        // 4.3 Aplicar Paginação
        state.pagination.total = state.filteredData.length;
        const totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        if (state.pagination.current > totalPages) state.pagination.current = Math.max(1, totalPages);

        const start = (state.pagination.current - 1) * state.pagination.limit;
        const end = start + state.pagination.limit;
        state.viewData = state.filteredData.slice(start, end);

        // Atualiza a tela
        renderTableBody();
        renderPagination();

        // Controlar visibilidade do botão Remover Filtros
        const btnClearAll = document.getElementById('btnClearAllFilters');
        if (btnClearAll) {
            let hasAnyFilter = false;
            for (let key in state.filters) {
                if (state.filters[key] && state.filters[key].size > 0 && !state.filters[key].has('__NONE__')) {
                    hasAnyFilter = true;
                    break;
                }
            }
            if (hasAnyFilter) {
                btnClearAll.classList.remove('hidden');
            } else {
                btnClearAll.classList.add('hidden');
            }
        }
    }

    // 5. Renderização (DOM)
    function formatCurrency(val) {
        if (val === '-' || !val) return '-';
        return parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatDate(val) {
        if (val === '-' || !val) return '-';
        const parts = val.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return val;
    }

    function renderHeaders() {
        const thead = document.getElementById('contasTableHeader');
        let html = '<tr class="text-steel-600 dark:text-gray-300 text-[12px] font-medium">';

        columns.forEach(col => {
            const isSticky = col.sticky ? 'sticky-col bg-gray-50 dark:bg-steel-900 border-r shadow-[1px_0_0_rgba(229,231,235,1)] dark:shadow-[1px_0_0_rgba(55,65,81,1)]' : '';
            const sortIcon = state.sort.key === col.key
                ? (state.sort.dir === 'asc' ? '↑' : '↓')
                : '↕';
            const hasFilter = state.filters[col.key] && state.filters[col.key].size > 0 && !state.filters[col.key].has('__NONE__');
            const hasNoneFilter = state.filters[col.key] && state.filters[col.key].has('__NONE__');
            const isFiltered = hasFilter || hasNoneFilter;
            const filterColor = isFiltered ? 'text-nexo-500' : 'text-steel-300 dark:text-steel-600 hover:text-steel-500';

            html += `
                <th class="px-3 py-2.5 border-b border-gray-200 dark:border-steel-700 whitespace-nowrap select-none ${isSticky}">
                    <div class="flex items-center justify-between gap-3">
                        <div class="cursor-pointer flex-1 hover:text-nexo-600 transition-colors" onclick="ContasGrid.toggleSort('${col.key}')">
                            ${col.label} <span class="text-[10px] ml-1 opacity-50">${sortIcon}</span>
                        </div>
                        <button onclick="ContasGrid.openFilter(event, '${col.key}')" class="p-1 rounded focus:outline-none ${filterColor}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </th>
            `;
        });
        html += '</tr>';
        thead.innerHTML = html;
    }

    function renderTableBody() {
        const tbody = document.getElementById('contasTableBody');

        if (state.viewData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${columns.length}" class="px-6 py-12 text-center text-steel-500">Nenhum registro encontrado com os filtros atuais.</td></tr>`;
            return;
        }

        let html = '';
        state.viewData.forEach(row => {
            html += '<tr class="hover:bg-nexo-50/80 dark:hover:bg-nexo-500/10 hover:shadow-md hover:scale-[1.001] relative z-0 hover:z-10 transition-all duration-200 group cursor-default">';
            columns.forEach(col => {
                let val = row[col.key];

                // Formatação
                if (col.type === 'currency') val = formatCurrency(val);
                else if (col.type === 'date') val = formatDate(val);

                // Custom render?
                if (col.render) val = col.render(val);

                const isSticky = col.sticky ? 'sticky-col bg-white dark:bg-steel-800 group-hover:bg-nexo-50 dark:group-hover:bg-[#1f3642] border-r border-gray-100 dark:border-steel-700 font-medium transition-colors duration-200' : '';

                html += `<td class="px-3 py-1.5 text-[12px] whitespace-nowrap ${isSticky}">${val}</td>`;
            });
            html += '</tr>';
        });
        tbody.innerHTML = html;
        renderHeaders(); // Atualiza ícones
    }

    function renderPagination() {
        const info = document.getElementById('paginationInfo');
        const controls = document.getElementById('paginationControls');

        const start = state.pagination.total === 0 ? 0 : ((state.pagination.current - 1) * state.pagination.limit) + 1;
        const end = Math.min(state.pagination.current * state.pagination.limit, state.pagination.total);
        info.textContent = `Mostrando ${start} a ${end} de ${state.pagination.total} registros`;

        const totalPages = Math.ceil(state.pagination.total / state.pagination.limit);

        let html = '';

        // First button
        html += `<button onclick="ContasGrid.setPage(1)" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.pagination.current === 1 ? 'disabled' : ''} title="Primeira Página">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>
                 </button>`;

        // Prev button
        html += `<button onclick="ContasGrid.setPage(${state.pagination.current - 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.pagination.current === 1 ? 'disabled' : ''} title="Anterior">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                 </button>`;

        // Simplificação de botões (mostra 5 páginas no máx)
        let startPage = Math.max(1, state.pagination.current - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

        for (let i = startPage; i <= endPage; i++) {
            if (i === state.pagination.current) {
                html += `<button class="px-3 py-1 text-sm font-medium rounded bg-nexo-50 dark:bg-nexo-900/30 text-nexo-600 dark:text-nexo-400">${i}</button>`;
            } else {
                html += `<button onclick="ContasGrid.setPage(${i})" class="px-3 py-1 text-sm font-medium rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700">${i}</button>`;
            }
        }

        // Next button
        html += `<button onclick="ContasGrid.setPage(${state.pagination.current + 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.pagination.current === totalPages || totalPages === 0 ? 'disabled' : ''} title="Próxima">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
                 </button>`;

        // Last button
        html += `<button onclick="ContasGrid.setPage(${totalPages})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.pagination.current === totalPages || totalPages === 0 ? 'disabled' : ''} title="Última Página">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414zm6 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                 </button>`;

        controls.innerHTML = html;
    }

    // 6. Componente do Dropdown de Filtro (Modal Flutuante)
    let activeFilterModal = null;

    function openFilter(event, colKey) {
        event.stopPropagation();
        closeFilter(); // Fecha anterior se existir

        const col = columns.find(c => c.key === colKey);

        // Coleta valores únicos para essa coluna
        const uniqueValues = [...new Set(state.rawData.map(row => row[colKey]))].sort();

        // Inicializa o state do filtro se não existir
        if (!state.filters[colKey]) {
            state.filters[colKey] = new Set();
        }

        // Criar DOM do Modal
        const modal = document.createElement('div');
        modal.id = 'filterModal';
        modal.className = 'absolute z-50 bg-white dark:bg-steel-800 rounded-lg shadow-xl border border-gray-200 dark:border-steel-700 w-64 flex flex-col font-sans text-sm animate-fade-in-up';

        // Evita que cliques dentro do modal propaguem para o document e fechem o filtro
        modal.addEventListener('click', (e) => e.stopPropagation());

        // Posicionamento abaixo do ícone clicado
        const rect = event.currentTarget.getBoundingClientRect();
        let left = rect.left;
        if (left + 256 > window.innerWidth) left = window.innerWidth - 266;

        modal.style.top = `${rect.bottom + window.scrollY + 8}px`;
        modal.style.left = `${left}px`;

        // Cabeçalho / Busca
        modal.innerHTML = `
            <div class="p-3 border-b border-gray-100 dark:border-steel-700">
                <input type="text" id="filterSearchInput" placeholder="Pesquisar..." class="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-steel-900 border border-gray-200 dark:border-steel-600 rounded outline-none focus:ring-1 focus:ring-nexo-500 text-steel-700 dark:text-gray-200">
            </div>
            <div class="flex-1 max-h-48 overflow-y-auto p-2" id="filterCheckboxList">
            </div>
            <div class="p-3 border-t border-gray-100 dark:border-steel-700 flex justify-between bg-gray-50 dark:bg-steel-800/50 rounded-b-lg">
                <button id="btnClearFilter" class="text-xs text-steel-500 hover:text-steel-700 dark:hover:text-gray-300 font-medium">Limpar</button>
                <button id="btnApplyFilter" class="text-xs bg-nexo-600 hover:bg-nexo-700 text-white px-3 py-1.5 rounded font-medium shadow-sm">Aplicar</button>
            </div>
        `;

        document.body.appendChild(modal);
        activeFilterModal = modal;

        const listContainer = modal.querySelector('#filterCheckboxList');
        const searchInput = modal.querySelector('#filterSearchInput');

        // Estado temporário para as seleções no modal explícito:
        const tempSelected = new Set(state.filters[colKey]);
        // Se filtro global estiver limpo, significa que tudo está visivel
        if (tempSelected.size === 0 || tempSelected.has('__NONE__')) {
            if (!tempSelected.has('__NONE__')) {
                uniqueValues.forEach(v => tempSelected.add(v));
            } else {
                tempSelected.clear();
            }
        }

        // Estado de expansão do modal (árvore de datas)
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

            // Botão "Selecionar Tudo"
            const allChecked = tempSelected.size === uniqueValues.length;
            const selectAllDiv = document.createElement('div');
            selectAllDiv.className = 'flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer mb-1 border-b border-gray-100 dark:border-steel-700';
            selectAllDiv.innerHTML = `
                <input type="checkbox" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${allChecked ? 'checked' : ''}>
                <span class="font-medium text-steel-700 dark:text-gray-300">(Selecionar Tudo)</span>
            `;
            selectAllDiv.querySelector('input').onclick = (e) => {
                if (e.target.checked) {
                    uniqueValues.forEach(v => tempSelected.add(v));
                } else {
                    tempSelected.clear();
                }
                renderCheckboxes(searchTerm);
            };
            listContainer.appendChild(selectAllDiv);

            if (col.type === 'date' && !searchTerm) {
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
                    const [y, m, d] = val.split('-');
                    if (!y || !m || !d) {
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
                        renderCheckboxes(searchTerm);
                    };

                    Object.keys(tree[year]).sort((a,b) => b.localeCompare(a)).forEach(month => {
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
                            renderCheckboxes(searchTerm);
                        };

                        monthVals.forEach(val => {
                            const isChecked = tempSelected.has(val);
                            const dHeader = document.createElement('div');
                            dHeader.className = 'flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer';
                            let displayVal = formatDate(val);
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
                // Flat rendering (lista simples) para outros tipos de dados ou durante pesquisa
                filteredVals.forEach(val => {
                    const isChecked = tempSelected.has(val);

                    const div = document.createElement('div');
                    div.className = 'flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer';

                    let displayVal = val;
                    if (col.type === 'currency') displayVal = formatCurrency(val);
                    if (col.type === 'date') displayVal = formatDate(val);

                    div.innerHTML = `
                        <input type="checkbox" value="${val}" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${isChecked ? 'checked' : ''}>
                        <span class="truncate text-steel-600 dark:text-gray-400" title="${displayVal}">${displayVal}</span>
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

        searchInput.addEventListener('input', (e) => {
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

    // Fechar filtro ao clicar fora
    document.addEventListener('click', (e) => {
        if (activeFilterModal && !activeFilterModal.contains(e.target)) {
            closeFilter();
        }
    });

    // 7. API Exposta Globalmente
    return {
        init: function () {
            // Busca dados do backend
            fetchData();

            // Listeners da interface (Ex: Items per page)
            const selectLimit = document.getElementById('itemsPerPage');
            if (selectLimit) {
                selectLimit.addEventListener('change', (e) => {
                    state.pagination.limit = parseInt(e.target.value);
                    state.pagination.current = 1;
                    processData();
                });
            }

            // Botão de Exportar
            const btnExport = document.getElementById('btnExport');
            if (btnExport) {
                btnExport.addEventListener('click', () => {
                    ContasGrid.exportToExcel();
                });
            }

            // Botão Remover Filtros
            const btnClearAll = document.getElementById('btnClearAllFilters');
            if (btnClearAll) {
                btnClearAll.addEventListener('click', () => {
                    state.filters = {};
                    state.pagination.current = 1;
                    processData();
                });
            }

            // Botão de Sincronização com Modal
            const btnSync = document.getElementById('btnSyncSupra');
            if (btnSync) {
                btnSync.addEventListener('click', async () => {
                    btnSync.disabled = true;
                    btnSync.classList.add('opacity-70', 'cursor-not-allowed');

                    // Helpers do Modal
                    const modal = document.getElementById('syncModal');
                    const modalContent = document.getElementById('syncModalContent');
                    const stateLoading = document.getElementById('syncStateLoading');
                    const stateSuccess = document.getElementById('syncStateSuccess');
                    const stateNoChanges = document.getElementById('syncStateNoChanges');
                    const stateError = document.getElementById('syncStateError');
                    const footer = document.getElementById('syncModalFooter');
                    const stepText = document.getElementById('syncStepText');
                    const subtitle = document.getElementById('syncModalSubtitle');
                    const title = document.getElementById('syncModalTitle');

                    function resetModal() {
                        stateLoading.classList.remove('hidden');
                        stateSuccess.classList.add('hidden');
                        stateNoChanges.classList.remove('flex'); stateNoChanges.classList.add('hidden');
                        stateError.classList.remove('flex'); stateError.classList.add('hidden');
                        footer.classList.add('hidden'); footer.classList.remove('flex');
                        title.textContent = 'Sincronizando com o Supra';
                        subtitle.textContent = 'Conectando ao servidor...';
                        stepText.textContent = 'Estabelecendo conexão...';
                        modalContent.classList.remove('scale-100'); modalContent.classList.add('scale-95');
                    }

                    function openModal() {
                        resetModal();
                        modal.classList.remove('hidden');
                        modal.classList.add('flex');
                        requestAnimationFrame(() => {
                            modal.style.opacity = '1';
                            modalContent.classList.remove('scale-95');
                            modalContent.classList.add('scale-100');
                        });
                    }

                    function showFooter() {
                        footer.classList.remove('hidden');
                        footer.classList.add('flex');
                    }

                    function closeModal() {
                        modal.style.opacity = '0';
                        modalContent.classList.remove('scale-100');
                        modalContent.classList.add('scale-95');
                        setTimeout(() => {
                            modal.classList.remove('flex');
                            modal.classList.add('hidden');
                        }, 300);
                        btnSync.disabled = false;
                        btnSync.classList.remove('opacity-70', 'cursor-not-allowed');
                    }

                    document.getElementById('syncModalClose').onclick = closeModal;

                    // Abrir modal e iniciar
                    openModal();

                    // Simular passos dinâmicos do loading
                    const steps = [
                        'Conectando ao SQL Server do Supra...',
                        'Buscando registros da Nexomed...',
                        'Atualizando dados locais da Nexomed...',
                        'Buscando registros da BML...',
                        'Atualizando dados locais da BML...',
                        'Verificando novos lançamentos...',
                        'Finalizando sincronização...'
                    ];
                    let stepIdx = 0;
                    const stepInterval = setInterval(() => {
                        stepIdx++;
                        if (stepIdx < steps.length) {
                            stepText.textContent = steps[stepIdx];
                            subtitle.textContent = `Etapa ${stepIdx + 1} de ${steps.length}`;
                        }
                    }, 3000);

                    try {
                        const token = localStorage.getItem('token');
                        const res = await fetch('/api/titulos/sync', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        clearInterval(stepInterval);

                        if (!res.ok) {
                            const errData = await res.json().catch(() => ({}));
                            throw new Error(errData.error || 'Erro desconhecido no servidor.');
                        }

                        const data = await res.json();
                        const d = data.details;
                        const totalChanges = d.totalUpdated + d.totalNew + d.totalDeleted;

                        // Esconder Loading
                        stateLoading.classList.add('hidden');

                        if (totalChanges === 0) {
                            // Estado: Sem Mudanças
                            title.textContent = 'Sincronização Completa';
                            subtitle.textContent = `${data.details.totalAnalyzed} registro(s) analisado(s). Nenhuma alteração detectada.`;
                            stateNoChanges.classList.remove('hidden');
                            stateNoChanges.classList.add('flex');
                        } else {
                            // Estado: Sucesso com detalhes
                            title.textContent = 'Sincronização Completa';
                            subtitle.textContent = `${data.details.totalAnalyzed} registro(s) analisado(s). ${totalChanges} alteração(ões) processada(s).`;

                            let resultsHtml = '';
                            d.empresas.forEach(emp => {
                                resultsHtml += `
                                    <div class="bg-gray-50 dark:bg-steel-700/50 rounded-lg p-3">
                                        <p class="font-semibold text-steel-800 dark:text-gray-200 mb-1.5">${emp.empresa}</p>
                                        <div class="grid grid-cols-4 gap-2 text-xs">
                                            <div class="flex flex-col items-center bg-white dark:bg-steel-800 rounded-md p-2">
                                                <span class="text-lg font-bold" style="color:#007BFF;">${emp.analyzed}</span>
                                                <span class="text-steel-500 dark:text-steel-400">Analisados</span>
                                            </div>
                                            <div class="flex flex-col items-center bg-white dark:bg-steel-800 rounded-md p-2">
                                                <span class="text-lg font-bold" style="color:#0097A7;">${emp.updated}</span>
                                                <span class="text-steel-500 dark:text-steel-400">Atualizados</span>
                                            </div>
                                            <div class="flex flex-col items-center bg-white dark:bg-steel-800 rounded-md p-2">
                                                <span class="text-lg font-bold" style="color:#1cc88a;">${emp.new}</span>
                                                <span class="text-steel-500 dark:text-steel-400">Novos</span>
                                            </div>
                                            <div class="flex flex-col items-center bg-white dark:bg-steel-800 rounded-md p-2">
                                                <span class="text-lg font-bold" style="color:#e74a3b;">${emp.deleted}</span>
                                                <span class="text-steel-500 dark:text-steel-400">Excluídos</span>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            });
                            document.getElementById('syncResultsContainer').innerHTML = resultsHtml;
                            stateSuccess.classList.remove('hidden');

                            // Recarregar dados da tabela
                            fetchData();
                        }
                        showFooter();

                    } catch (err) {
                        clearInterval(stepInterval);
                        console.error(err);

                        stateLoading.classList.add('hidden');
                        title.textContent = 'Erro na Sincronização';
                        subtitle.textContent = 'Não foi possível completar';
                        document.getElementById('syncErrorMessage').textContent = err.message || 'Verifique a conexão com o servidor do Supra.';
                        stateError.classList.remove('hidden');
                        stateError.classList.add('flex');
                        showFooter();
                    }
                });
            }
        },
        toggleSort: function (key) {
            if (state.sort.key === key) {
                state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
            } else {
                state.sort.key = key;
                state.sort.dir = 'asc';
            }
            processData();
        },
        setPage: function (page) {
            state.pagination.current = page;
            processData();
        },
        openFilter: openFilter,
        exportToExcel: function () {
            if (state.filteredData.length === 0) {
                alert("Nenhum dado para exportar com os filtros atuais.");
                return;
            }

            // Mapeia usando os labels corretos das colunas
            const exportData = state.filteredData.map(row => {
                const rowObj = {};
                columns.forEach(col => {
                    let val = row[col.key];
                    
                    // Formatações nativas para o Excel aceitar melhor os dados
                    if (col.type === 'currency' && val !== '-' && val !== null) {
                        val = parseFloat(val) || 0;
                    } else if (col.type === 'date' && val !== '-' && val !== null) {
                        const parts = val.split('-');
                        if (parts.length === 3) {
                            val = `${parts[2]}/${parts[1]}/${parts[0]}`; // Formato BR (DD/MM/YYYY)
                        }
                    }
                    
                    rowObj[col.label] = val;
                });
                return rowObj;
            });

            // Cria a planilha em memória usando a lib XLSX (SheetJS)
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Contas_a_Receber");

            // Gera o arquivo
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            XLSX.writeFile(workbook, `Contas_Receber_Export_${dateStr}.xlsx`);
        }
    };

})();

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    ContasGrid.init();
});
