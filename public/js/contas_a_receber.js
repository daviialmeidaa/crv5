const ContasGrid = (function() {
    
    // 1. Definição das Colunas
    const columns = [
        { key: 'cliente', label: 'Cliente', sticky: true },
        { key: 'empresa', label: 'Empresa' },
        { key: 'nota', label: 'Nota' },
        { key: 'codCliente', label: 'Cód. Cliente' },
        { key: 'esfera', label: 'Esfera' },
        { key: 'uf', label: 'UF' },
        { key: 'contrato', label: 'Contrato' },
        { key: 'marcador', label: 'Marcador' },
        { key: 'pregao', label: 'Nº Pregão' },
        { key: 'classificacao', label: 'Classificação' },
        { key: 'empenho', label: 'Nº Empenho' },
        { key: 'documento', label: 'Documento' },
        { key: 'valor', label: 'Valor (R$)', type: 'currency' },
        { key: 'boletoEmitido', label: 'Boleto Emitido' },
        { key: 'valorRecebido', label: 'Valor Recebido (R$)', type: 'currency' },
        { key: 'dataEmissao', label: 'Data Emissão', type: 'date' },
        { key: 'dataVencimento', label: 'Data Vencimento', type: 'date' },
        { key: 'dataPagamento', label: 'Data Pagamento', type: 'date' },
        { key: 'status', label: 'Status', render: v => {
            const colors = {
                'Pendente': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                'Pago': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                'Atrasado': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            };
            const c = colors[v] || 'bg-gray-100 text-gray-700';
            return `<span class="px-2.5 py-1 rounded-full text-xs font-medium ${c}">${v}</span>`;
        }},
        { key: 'conta', label: 'Conta' },
        { key: 'atraso', label: 'Atraso?' },
        { key: 'retemIr', label: 'Retém IR?' }
    ];

    // 2. Estado Global
    const state = {
        rawData: [],
        filteredData: [],
        viewData: [],
        filters: {}, // { columnKey: Set(['Val1', 'Val2']) }
        sort: { key: null, dir: 'asc' }, // dir: 'asc' | 'desc'
        pagination: { current: 1, limit: 10, total: 0 }
    };

    // 3. Mock Data Generator (Para testes do protótipo)
    function generateMockData() {
        const empresas = ['Nexomed Ltda', 'Nexomed Filial RJ', 'SupraSoft'];
        const clientes = ['Prefeitura de SP', 'Hospital das Clínicas', 'Secretaria de Saúde MG', 'UPA Zona Sul', 'Hospital Unimed'];
        const esferas = ['Municipal', 'Estadual', 'Federal', 'Privada'];
        const ufs = ['SP', 'RJ', 'MG', 'PR', 'SC'];
        const statusList = ['Pendente', 'Pago', 'Atrasado'];

        const data = [];
        for(let i=1; i<=150; i++) {
            const status = statusList[Math.floor(Math.random() * statusList.length)];
            data.push({
                cliente: clientes[Math.floor(Math.random() * clientes.length)],
                empresa: empresas[Math.floor(Math.random() * empresas.length)],
                nota: `NF-${10000 + i}`,
                codCliente: `C-${1000 + Math.floor(Math.random() * 900)}`,
                esfera: esferas[Math.floor(Math.random() * esferas.length)],
                uf: ufs[Math.floor(Math.random() * ufs.length)],
                contrato: `CT-202${Math.floor(Math.random() * 5)}/${Math.floor(Math.random() * 12)+1}`,
                marcador: i % 3 === 0 ? 'Licitação' : 'Direta',
                pregao: i % 3 === 0 ? `PG-0${Math.floor(Math.random() * 50)}/2023` : '-',
                classificacao: 'Material Médico',
                empenho: `EMP-${2024000 + i}`,
                documento: `${Math.floor(Math.random() * 99)}.345.678/0001-90`,
                valor: (Math.random() * 50000).toFixed(2),
                boletoEmitido: Math.random() > 0.5 ? 'Sim' : 'Não',
                valorRecebido: status === 'Pago' ? (Math.random() * 50000).toFixed(2) : '0.00',
                dataEmissao: `2026-0${Math.floor(Math.random()*6)+1}-${Math.floor(Math.random()*28)+1}`,
                dataVencimento: `2026-0${Math.floor(Math.random()*6)+4}-${Math.floor(Math.random()*28)+1}`,
                dataPagamento: status === 'Pago' ? `2026-06-${Math.floor(Math.random()*28)+1}` : '-',
                status: status,
                conta: 'Itaú C/C',
                atraso: status === 'Atrasado' ? 'Sim' : 'Não',
                retemIr: Math.random() > 0.8 ? 'Sim' : 'Não'
            });
        }
        return data;
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
                } else if (col.type === 'date' && valA !== '-' && valB !== '-') {
                    valA = new Date(valA).getTime();
                    valB = new Date(valB).getTime();
                }

                if (valA < valB) return -1 * dir;
                if (valA > valB) return 1 * dir;
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
    }

    // 5. Renderização (DOM)
    function formatCurrency(val) {
        if(val === '-' || !val) return '-';
        return parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatDate(val) {
        if(val === '-' || !val) return '-';
        const parts = val.split('-');
        if(parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return val;
    }

    function renderHeaders() {
        const thead = document.getElementById('contasTableHeader');
        let html = '<tr class="text-steel-500 dark:text-steel-400 text-xs font-semibold uppercase tracking-wider">';
        
        columns.forEach(col => {
            const isSticky = col.sticky ? 'sticky-col bg-gray-50 dark:bg-steel-900 border-r shadow-[1px_0_0_rgba(229,231,235,1)] dark:shadow-[1px_0_0_rgba(55,65,81,1)]' : '';
            const sortIcon = state.sort.key === col.key 
                ? (state.sort.dir === 'asc' ? '↑' : '↓') 
                : '↕';
            const hasFilter = state.filters[col.key] && state.filters[col.key].size > 0;
            const filterColor = hasFilter ? 'text-nexo-500' : 'text-steel-300 dark:text-steel-600 hover:text-steel-500';

            html += `
                <th class="px-5 py-3 border-b border-gray-200 dark:border-steel-700 whitespace-nowrap select-none ${isSticky}">
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
            html += '<tr class="hover:bg-gray-50/50 dark:hover:bg-steel-800/50 transition-colors group">';
            columns.forEach(col => {
                let val = row[col.key];
                
                // Formatação
                if (col.type === 'currency') val = formatCurrency(val);
                else if (col.type === 'date') val = formatDate(val);
                
                // Custom render?
                if (col.render) val = col.render(val);

                const isSticky = col.sticky ? 'sticky-col bg-white dark:bg-steel-800 group-hover:bg-gray-50 dark:group-hover:bg-steel-800 border-r border-gray-100 dark:border-steel-700 font-medium' : '';
                
                html += `<td class="px-5 py-3 whitespace-nowrap ${isSticky}">${val}</td>`;
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
        
        // Prev button
        html += `<button onclick="ContasGrid.setPage(${state.pagination.current - 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.pagination.current === 1 ? 'disabled' : ''}>
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
        html += `<button onclick="ContasGrid.setPage(${state.pagination.current + 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.pagination.current === totalPages || totalPages === 0 ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
                 </button>`;

        controls.innerHTML = html;
    }

    // 6. Componente do Dropdown de Filtro (Modal Flutuante)
    let activeFilterModal = null;

    function openFilter(event, colKey) {
        event.stopPropagation();
        closeFilter(); // Fecha anterior se existir

        const col = columns.find(c => c.key === colKey);
        
        // Coleta valores únicos para essa coluna ignorando os filtros atuais (para mostrar todas opções sempre, ou mostrar apenas opções compatíveis? Padrão Excel: Mostrar todas)
        const uniqueValues = [...new Set(state.rawData.map(row => row[colKey]))].sort();

        // Inicializa o state do filtro se não existir
        if (!state.filters[colKey]) {
            state.filters[colKey] = new Set();
        }

        // Criar DOM do Modal
        const modal = document.createElement('div');
        modal.id = 'filterModal';
        modal.className = 'absolute z-50 bg-white dark:bg-steel-800 rounded-lg shadow-xl border border-gray-200 dark:border-steel-700 w-64 flex flex-col font-sans text-sm animate-fade-in-up';
        
        // Posicionamento abaixo do ícone clicado
        const rect = event.currentTarget.getBoundingClientRect();
        // Evita sair da tela pela direita
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
                <button id="btnApplyFilter" class="text-xs bg-nexo-600 hover:bg-nexo-700 text-white px-3 py-1.5 rounded font-medium">Aplicar</button>
            </div>
        `;

        document.body.appendChild(modal);
        activeFilterModal = modal;

        const listContainer = modal.querySelector('#filterCheckboxList');
        const searchInput = modal.querySelector('#filterSearchInput');

        // Estado temporário para as seleções no modal (só aplica ao clicar em Aplicar)
        const tempSelected = new Set(state.filters[colKey]);

        function renderCheckboxes(searchTerm = '') {
            listContainer.innerHTML = '';
            const filteredVals = uniqueValues.filter(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()));
            
            if (filteredVals.length === 0) {
                listContainer.innerHTML = '<p class="text-xs text-steel-400 p-2 text-center">Nenhum valor encontrado.</p>';
                return;
            }

            // Botão "Selecionar Tudo"
            const allChecked = tempSelected.size === 0 || tempSelected.size === uniqueValues.length;
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

            filteredVals.forEach(val => {
                const isChecked = tempSelected.has(val) || tempSelected.size === 0; // se 0, significa que tudo tá visível
                
                const div = document.createElement('div');
                div.className = 'flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer';
                
                let displayVal = val;
                if(col.type === 'currency') displayVal = formatCurrency(val);
                if(col.type === 'date') displayVal = formatDate(val);

                div.innerHTML = `
                    <input type="checkbox" value="${val}" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${isChecked ? 'checked' : ''}>
                    <span class="truncate text-steel-600 dark:text-gray-400" title="${displayVal}">${displayVal}</span>
                `;
                
                const checkbox = div.querySelector('input');
                div.onclick = (e) => {
                    if(e.target !== checkbox) checkbox.checked = !checkbox.checked;
                    
                    if (checkbox.checked) {
                        tempSelected.add(val);
                    } else {
                        // Se tava "Selecionar Tudo", populamos o set e excluímos o atual
                        if (tempSelected.size === 0) {
                            uniqueValues.forEach(v => tempSelected.add(v));
                        }
                        tempSelected.delete(val);
                    }
                };
                
                listContainer.appendChild(div);
            });
        }

        renderCheckboxes();
        searchInput.focus();

        searchInput.addEventListener('input', (e) => {
            renderCheckboxes(e.target.value);
        });

        modal.querySelector('#btnApplyFilter').onclick = () => {
            // Se todas estiverem selecionadas, a gente limpa o filtro pra otimizar
            if (tempSelected.size === uniqueValues.length) {
                state.filters[colKey].clear();
            } else {
                state.filters[colKey] = new Set(tempSelected);
            }
            state.pagination.current = 1; // Reseta paginação
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
        init: function() {
            state.rawData = generateMockData();
            
            // Listeners da interface (Ex: Items per page)
            const selectLimit = document.getElementById('itemsPerPage');
            if(selectLimit) {
                selectLimit.addEventListener('change', (e) => {
                    state.pagination.limit = parseInt(e.target.value);
                    state.pagination.current = 1;
                    processData();
                });
            }

            processData(); // Start
        },
        toggleSort: function(key) {
            if (state.sort.key === key) {
                state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
            } else {
                state.sort.key = key;
                state.sort.dir = 'asc';
            }
            processData();
        },
        setPage: function(page) {
            state.pagination.current = page;
            processData();
        },
        openFilter: openFilter
    };

})();

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    ContasGrid.init();
});
