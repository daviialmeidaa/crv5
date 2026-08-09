/**
 * Gerenciamento da Tela de Detalhe do Cliente
 * Ficha Cadastral + KPIs + Grid de Notas Fiscais (dados mockados).
 */
const ClienteDetalhe = (() => {

    // ==========================================
    // 1. Extrair ID do Cliente da URL
    // ==========================================
    const clienteId = window.location.pathname.split('/').pop();

    // Os dados do cliente agora são buscados via API no init().

    

    // ==========================================
    // 4. Definição das Colunas do Grid
    // ==========================================
    const columns = [
        { key: 'empresa', label: 'Empresa Vendedora' },
        { key: 'nota', label: 'Nota', type: 'number' },
        { key: 'posicao', label: 'Posição' },
        { key: 'contrato', label: 'Contrato' },
        { key: 'pregao', label: 'Pregão' },
        { key: 'tipoContrato', label: 'Tipo Contrato' },
        { key: 'classificacao', label: 'Classificação' },
        { key: 'empenho', label: 'Empenho' },
        { key: 'documento', label: 'Documento' },
        { key: 'valor', label: 'Valor', type: 'currency' },
        { key: 'dataEmissao', label: 'Data de Emissão', type: 'date' },
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
        sort: { key: null, dir: null },
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

        // Buscar e preencher dados da ficha cadastral
        fetchClienteData();

        // Buscar notas fiscais
        fetchNotasData();

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

    const fetchClienteData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/clientes/${clienteId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) {
                throw new Error('Falha ao buscar dados do cliente');
            }
            const data = await res.json();
            
            document.getElementById('breadcrumbClientName').textContent = data.razaoSocial || '-';
            document.getElementById('clienteCodigo').textContent = data.codigo || clienteId || '-';
            document.getElementById('clienteNome').textContent = data.razaoSocial || '-';
            document.getElementById('clienteFantasia').textContent = data.nomeFantasia || '-';
            document.getElementById('clienteClassificacao').textContent = data.classificacao || '-';
            document.getElementById('clienteCnpj').textContent = data.cnpj || '-';
            
            // Concatenação do Endereço
            let endParts = [];
            if (data.tipoLogradouro) endParts.push(data.tipoLogradouro);
            if (data.logradouro) endParts.push(data.logradouro);
            if (data.numero) endParts.push(data.numero);
            
            let comp = data.complemento ? String(data.complemento).trim() : '';
            if (comp && comp.toLowerCase() !== '<null>') {
                endParts.push(comp);
            }
            
            if (data.bairro) endParts.push(data.bairro);
            document.getElementById('clienteEndereco').textContent = endParts.join(' ') || '-';
            
            document.getElementById('clienteCidade').textContent = data.cidade || '-';
            document.getElementById('clienteUf').textContent = data.uf || '-';
            document.getElementById('clienteCep').textContent = data.cep || '-';
            document.getElementById('clienteEmail').textContent = data.email || '-';
            
            // Concatenação do Telefone
            let tel = '';
            if (data.ddd) tel += `(${String(data.ddd).trim()}) `;
            if (data.telefone) tel += String(data.telefone).trim();
            document.getElementById('clienteTelefone').textContent = tel || '-';
            
        } catch (error) {
            console.error('Erro ao buscar dados do cliente:', error);
            document.getElementById('clienteNome').textContent = 'Erro ao carregar';
        }
    };

    
    // ==========================================
    // 8.5 Buscar Notas Fiscais
    // ==========================================
    const fetchNotasData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/clientes/${clienteId}/notas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Falha ao buscar notas fiscais');
            const data = await res.json();
            
            // Ajustar datas para YYYY-MM-DD se vierem em ISO (garante que os filtros funcionem)
            state.rawData = data.map(row => {
                if (row.dataEmissao && row.dataEmissao.includes('T')) {
                    row.dataEmissao = row.dataEmissao.split('T')[0];
                }
                return row;
            });
            processData();
        } catch (error) {
            console.error('Erro ao buscar notas:', error);
            state.rawData = [];
            processData();
        }
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
        const vendido = data.reduce((sum, r) => sum + (parseFloat(r.valor) || 0), 0);
        const pago = data.filter(r => r.status === 'PAGO').reduce((sum, r) => sum + (parseFloat(r.valor) || 0), 0);
        const aberto = data.filter(r => r.status === 'PENDENTE' || r.status === 'ATRASADO').reduce((sum, r) => sum + (parseFloat(r.valor) || 0), 0);
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
            html += `<tr class="h-[52px] hover:bg-nexo-50/80 dark:hover:bg-nexo-500/10 transition-colors duration-200 group cursor-default">`;

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
    const formatCurrency = (val) => {
        if (val === '-' || !val) return '-';
        return parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatDate = (val) => {
        if (val === '-' || !val) return '-';
        const parts = String(val).split('T')[0].split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return val;
    };

    // Declaração de activeFilterModal removida pois já existe no topo do arquivo.

    const closeFilter = () => {
        if (activeFilterModal) {
            activeFilterModal.remove();
            activeFilterModal = null;
        }
    };

    const openFilter = (event, colKey) => {
        event.stopPropagation();
        closeFilter(); // Fecha anterior se existir

        const col = columns.find(c => c.key === colKey);

        // Coleta valores únicos para essa coluna respeitando os filtros já aplicados em outras colunas (Filtro em cascata)
        const preFilteredData = state.rawData.filter(row => {
            for (let key in state.filters) {
                if (key === colKey) continue; // Ignora o filtro da própria coluna que estamos abrindo
                const selectedValues = state.filters[key];
                if (selectedValues && selectedValues.size > 0 && !selectedValues.has('__NONE__')) {
                    if (!selectedValues.has(row[key])) {
                        return false; 
                    }
                }
            }
            return true;
        });
        const uniqueValues = [...new Set(preFilteredData.map(row => {
            let val = row[colKey];
            if (val === null || val === undefined || val === '') return '__EMPTY__';
            return String(val);
        }))].sort();

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
        
        // Injetar custom-scrollbar se não existir
        if (!document.getElementById('filterScrollStyle')) {
            const style = document.createElement('style');
            style.id = 'filterScrollStyle';
            style.textContent = `
                #filterCheckboxList::-webkit-scrollbar { width: 6px; }
                #filterCheckboxList::-webkit-scrollbar-track { background: transparent; }
                #filterCheckboxList::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                .dark #filterCheckboxList::-webkit-scrollbar-thumb { background: #475569; }
            `;
            document.head.appendChild(style);
        }

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
                let displayVal = v === '__EMPTY__' ? '(Vazio)' : v;
                if (col.type === 'currency' && v !== '__EMPTY__') displayVal = formatCurrency(v);
                if (col.type === 'date' && v !== '__EMPTY__') displayVal = formatDate(v);
                return String(displayVal).toLowerCase().includes(searchTerm.toLowerCase());
            });

            if (filteredVals.length === 0) {
                listContainer.innerHTML = '<p class="text-xs text-steel-400 p-2 text-center">Nenhum valor encontrado.</p>';
                return;
            }

            // Botão "Selecionar Tudo"
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
                renderCheckboxes(searchTerm);
            };
            listContainer.appendChild(selectAllDiv);

            if (col.type === 'date' && !searchTerm) {
                // Renderização hierárquica (Ano > Mês > Dia)
                const tree = {};
                const monthsNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                
                filteredVals.forEach(val => {
                    if (val === '__EMPTY__' || val === '-' || !val) {
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
                            let displayVal = val === '__EMPTY__' ? '(Vazio)' : formatDate(val);
                            
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

                    let displayVal = val === '__EMPTY__' ? '(Vazio)' : val;
                    if (col.type === 'currency' && val !== '__EMPTY__') displayVal = formatCurrency(val);
                    if (col.type === 'date' && val !== '__EMPTY__') displayVal = formatDate(val);

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

        let hasTyped = false;
        searchInput.addEventListener('input', (e) => {
            // Limpa tudo apenas no PRIMEIRO caractere digitado na busca, permitindo acúmulo de buscas manuais depois
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
    };

    // Fechar filtro ao clicar fora
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('filterModal');
        if (modal && !modal.contains(e.target) && !e.target.closest('[data-filter-btn]')) {
            closeFilter();
        }
    });

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
