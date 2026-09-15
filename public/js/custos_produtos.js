/**
 * custos_produtos.js
 * Módulo principal da página de Custos de Produtos.
 * Gerencia 3 abas: Resumo, Custos Nulos, Histórico.
 */

const CustosApp = (() => {
    'use strict';
    function formatDate(val) {
        if (val === '-' || !val) return '-';
        if (typeof val === 'string' && val.includes('T')) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            }
        }
        const parts = String(val).split('T')[0].split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return val;
    }


    // ==========================================
    // UTILS
    // ==========================================
    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const TRIMESTRES = ['1º Trimestre', '2º Trimestre', '3º Trimestre', '4º Trimestre'];

    function formatCurrency(value) {
        const num = parseFloat(value) || 0;
        const abs = Math.abs(num);
        const formatted = abs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (num < 0) return `(${formatted})`;
        return formatted;
    }

    function populateYearSelect(selectEl, startYear = 2023) {
        const currentYear = new Date().getFullYear();
        selectEl.innerHTML = '';
        for (let y = currentYear; y >= startYear; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            selectEl.appendChild(opt);
        }
    }

    function getToken() {
        return localStorage.getItem('token') || '';
    }

    async function apiFetch(url) {
        const resp = await fetch(url, { headers: { 'Authorization': 'Bearer ' + getToken() } });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
    }

    // ==========================================
    // TABS
    // ==========================================
    function initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => {
                    b.classList.remove('active', 'text-nexo-600', 'dark:text-nexo-400', 'font-semibold');
                    b.classList.add('text-steel-500', 'dark:text-steel-400', 'font-medium');
                });
                document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

                btn.classList.add('active', 'text-nexo-600', 'dark:text-nexo-400', 'font-semibold');
                btn.classList.remove('text-steel-500', 'dark:text-steel-400', 'font-medium');
                const tabId = 'tab-' + btn.dataset.tab;
                const tabEl = document.getElementById(tabId);
                if (tabEl) {
                    tabEl.classList.add('active');
                    tabEl.classList.remove('fade-in-up');
                    void tabEl.offsetWidth;
                    tabEl.classList.add('fade-in-up');
                }
            });
        });
    }

    // ==========================================
    // TAB 1: RESUMO
    // ==========================================
    function initResumo() {
        const select = document.getElementById('resumoAnoSelect');
        populateYearSelect(select);
        select.addEventListener('change', () => loadResumoData(parseInt(select.value)));
        loadResumoData(parseInt(select.value));
    }

    async function loadResumoData(ano) {
        try {
            const data = await apiFetch(`/api/financeiro/custos/resumo?ano=${ano}`);
            renderTotaisGerais(data.totaisGerais);
            renderMensais('mensaisNexoBody', data.mensais.nexo);
            renderMensais('mensaisBmlBody', data.mensais.bml);
            renderTrimestrais('trimestraisNexoBody', data.trimestrais.nexo);
            renderTrimestrais('trimestraisBmlBody', data.trimestrais.bml);
        } catch (err) {
            console.error('Erro ao carregar resumo:', err);
        }
    }

    function renderTotaisGerais(data) {
        const n = data.nexo;
        const b = data.bml;

        document.getElementById('tg-vendas-nexo').textContent = formatCurrency(n.vendas);
        document.getElementById('tg-vendas-bml').textContent = formatCurrency(b.vendas);
        document.getElementById('tg-vendas-total').textContent = formatCurrency(n.vendas + b.vendas);

        document.getElementById('tg-devolvidas-nexo').textContent = formatCurrency(n.devolvidas);
        document.getElementById('tg-devolvidas-bml').textContent = formatCurrency(b.devolvidas);
        document.getElementById('tg-devolvidas-total').textContent = formatCurrency(n.devolvidas + b.devolvidas);

        document.getElementById('tg-custos-nexo').textContent = formatCurrency(n.custos);
        document.getElementById('tg-custos-bml').textContent = formatCurrency(b.custos);
        document.getElementById('tg-custos-total').textContent = formatCurrency(n.custos + b.custos);

        document.getElementById('tg-custos-dev-nexo').textContent = formatCurrency(n.custosDev);
        document.getElementById('tg-custos-dev-bml').textContent = formatCurrency(b.custosDev);
        document.getElementById('tg-custos-dev-total').textContent = formatCurrency(n.custosDev + b.custosDev);

        // Total = (vendas + devolvidas) - (custos + custosDev)
        const totalNexo = (n.vendas + n.devolvidas) - (n.custos + n.custosDev);
        const totalBml = (b.vendas + b.devolvidas) - (b.custos + b.custosDev);
        document.getElementById('tg-total-nexo').textContent = formatCurrency(totalNexo);
        document.getElementById('tg-total-bml').textContent = formatCurrency(totalBml);
        document.getElementById('tg-total-geral').textContent = formatCurrency(totalNexo + totalBml);
    }

    function renderMensais(bodyId, monthData) {
        const tbody = document.getElementById(bodyId);
        let html = '';
        for (let i = 0; i < 12; i++) {
            const d = monthData[i];
            const total = (d.vendas + d.devolvidas) - (d.custos + d.custosDev);
            const isEven = i % 2 === 0;
            html += `<tr class="${isEven ? '' : 'bg-gray-50/50 dark:bg-steel-700/10'} hover:bg-nexo-50/30 dark:hover:bg-steel-700/30 transition-colors">
                <td class="px-3 py-2 font-medium text-steel-700 dark:text-gray-300 text-xs">${MESES[i]}</td>
                <td class="px-3 py-2 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(d.vendas)}</td>
                <td class="px-3 py-2 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(d.devolvidas)}</td>
                <td class="px-3 py-2 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(d.custos)}</td>
                <td class="px-3 py-2 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(d.custosDev)}</td>
                <td class="px-3 py-2 text-right font-semibold text-steel-800 dark:text-gray-100 text-xs">${formatCurrency(total)}</td>
            </tr>`;
        }
        tbody.innerHTML = html;
    }

    function renderTrimestrais(bodyId, quarterData) {
        const tbody = document.getElementById(bodyId);
        let html = '';
        for (let i = 0; i < 4; i++) {
            const d = quarterData[i];
            const total = (d.vendas + d.devolvidas) - (d.custos + d.custosDev);
            const isEven = i % 2 === 0;
            html += `<tr class="${isEven ? '' : 'bg-gray-50/50 dark:bg-steel-700/10'} hover:bg-nexo-50/30 dark:hover:bg-steel-700/30 transition-colors">
                <td class="px-3 py-2.5 font-medium text-steel-700 dark:text-gray-300 text-xs">${TRIMESTRES[i]}</td>
                <td class="px-3 py-2.5 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(d.vendas)}</td>
                <td class="px-3 py-2.5 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(d.devolvidas)}</td>
                <td class="px-3 py-2.5 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(d.custos)}</td>
                <td class="px-3 py-2.5 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(d.custosDev)}</td>
                <td class="px-3 py-2.5 text-right font-semibold text-steel-800 dark:text-gray-100 text-xs">${formatCurrency(total)}</td>
            </tr>`;
        }
        tbody.innerHTML = html;
    }

    // ==========================================
    // TAB 2: CUSTOS NULOS
    // ==========================================
    const nulosState = {
        rawData: [],
        filteredData: [],
        filters: {},
        page: 1,
        perPage: 25,
        sortCol: null,
        sortDir: 'asc'
    };

    const NULOS_COLUMNS = [
        { key: 'empresa', label: 'Empresa', type: 'text', width: 'w-24' },
        { key: 'nota_fiscal', label: 'Nota Fiscal', type: 'number', width: 'w-24' },
        { key: 'cliente', label: 'Cliente', type: 'text', width: 'w-48' },
        { key: 'tipo_nota', label: 'Tipo', type: 'text', width: 'w-32' },
        { key: 'cod_produto', label: 'Cód. Produto', type: 'text', width: 'w-28' },
        { key: 'produto', label: 'Produto', type: 'text', width: 'w-48' },
        { key: 'lote', label: 'Lote', type: 'text', width: 'w-24' },
        { key: 'classificacao', label: 'Classificação', type: 'text', width: 'w-32' },
        { key: 'quantidade', label: 'Qtd', type: 'number', width: 'w-16' },
        { key: 'custo_unitario', label: 'Custo Unit.', type: 'input', width: 'w-32' },
    ];

    function initCustosNulos() {
        const anoSelect = document.getElementById('nulosAnoSelect');
        const mesSelect = document.getElementById('nulosMesSelect');
        populateYearSelect(anoSelect);

        anoSelect.addEventListener('change', () => loadCustosNulos());
        mesSelect.addEventListener('change', () => loadCustosNulos());

        document.getElementById('nulosItemsPerPage').addEventListener('change', (e) => {
            nulosState.perPage = parseInt(e.target.value);
            nulosState.page = 1;
            renderNulosGrid();
        });

        document.getElementById('nulosBtnRefresh').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Sincronizando...`;
            btn.disabled = true;
            btn.classList.add('opacity-75', 'cursor-not-allowed');

            try {
                const ano = document.getElementById('nulosAnoSelect').value;
                const mes = document.getElementById('nulosMesSelect').value;
                
                const resp = await fetch('/api/financeiro/custos/sincronizar', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken() 
                    },
                    body: JSON.stringify({ ano, mes })
                });
                
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.error || 'Erro ao sincronizar');
                
                alert(`Sincronização concluída!\\nNotas analisadas: ${data.analisadas}\\nNovos itens: ${data.inseridas}`);
                loadCustosNulos(); // Recarrega o grid e o badge
            } catch (err) {
                console.error(err);
                alert(err.message);
            } finally {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
                btn.classList.remove('opacity-75', 'cursor-not-allowed');
            }
        });

        document.getElementById('nulosBtnExport').addEventListener('click', () => {
            if (!nulosState.filteredData.length) return;
            exportToExcel(nulosState.filteredData, NULOS_COLUMNS.filter(c => c.type !== 'input'), 'custos_nulos');
        });

        renderNulosHeader();
        loadCustosNulos();
    }

    async function loadCustosNulos() {
        const ano = document.getElementById('nulosAnoSelect').value;
        const mes = document.getElementById('nulosMesSelect').value;
        let url = `/api/financeiro/custos/nulos?ano=${ano}`;
        if (mes) url += `&mes=${mes}`;

        const tbody = document.getElementById('nulosTableBody');
        tbody.innerHTML = `<tr><td colspan="${NULOS_COLUMNS.length}" class="p-8 text-center text-steel-400">
            <svg class="animate-spin h-6 w-6 text-nexo-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Carregando...
        </td></tr>`;

        try {
            const data = await apiFetch(url);
            nulosState.rawData = data;
            nulosState.filteredData = [...data];
            nulosState.page = 1;

            // Update badge
            const badge = document.getElementById('nullCostsBadge');
            if (data.length > 0) {
                badge.textContent = data.length;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }

            applyNulosFilters();
        } catch (err) {
            console.error('Erro ao carregar custos nulos:', err);
            tbody.innerHTML = `<tr><td colspan="${NULOS_COLUMNS.length}" class="p-8 text-center text-red-500">Erro ao carregar dados.</td></tr>`;
        }
    }

    
    
    function applyNulosFilters() {
        let result = nulosState.rawData;

        result = result.filter(r => {
            for (const key of Object.keys(nulosState.filters)) {
                if (nulosState.filters[key] && nulosState.filters[key].size > 0 && !nulosState.filters[key].has('__NONE__')) {
                    const val = (r[key] === null || r[key] === undefined || r[key] === '') ? '-' : r[key];
                    if (!nulosState.filters[key].has(val)) return false;
                }
            }
            return true;
        });

        if (nulosState.sortCol) {
            result.sort((a, b) => {
                let valA = a[nulosState.sortCol];
                let valB = b[nulosState.sortCol];
                
                if (valA === null || valA === undefined || valA === '') valA = '';
                if (valB === null || valB === undefined || valB === '') valB = '';

                if (valA === '' && valB !== '') return 1;
                if (valB === '' && valA !== '') return -1;
                
                if (!isNaN(valA) && !isNaN(valB)) {
                    valA = Number(valA); valB = Number(valB);
                } else {
                    valA = String(valA).toLowerCase(); valB = String(valB).toLowerCase();
                }

                if (valA < valB) return nulosState.sortDir === 'asc' ? -1 : 1;
                if (valA > valB) return nulosState.sortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        nulosState.filteredData = result;
        renderNulosHeader();
        renderNulosGrid();
    }

    window.openNulosFilterModal = (event, colKey) => {
        const col = NULOS_COLUMNS.find(c => c.key === colKey);
        openFilterModal(event, col, nulosState, 'rawData', applyNulosFilters);
    };
    window.sortNulosGrid = (key) => {
        if (nulosState.sortCol === key) {
            nulosState.sortDir = nulosState.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            nulosState.sortCol = key;
            nulosState.sortDir = 'asc';
        }
        applyNulosFilters();
    };

    function renderNulosHeader() {
        renderGenericHeader('nulosTableHeader', NULOS_COLUMNS, nulosState, 'sortNulosGrid', 'openNulosFilterModal');
    }

    function renderNulosGrid() {
        const tbody = document.getElementById('nulosTableBody');
        const data = nulosState.filteredData;
        const start = (nulosState.page - 1) * nulosState.perPage;
        const end = start + nulosState.perPage;
        const pageData = data.slice(start, end);

        if (pageData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${NULOS_COLUMNS.length}" class="p-8 text-center text-steel-400">
                <div class="flex flex-col items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-steel-300 dark:text-steel-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="text-sm">Nenhum custo nulo encontrado para o período selecionado.</p>
                </div>
            </td></tr>`;
        } else {
            let html = '';
            pageData.forEach((row, idx) => {
                const isEven = idx % 2 === 0;
                let isDevolucao = row.tipo_nota && row.tipo_nota.toUpperCase().includes('DEVOLU');
                html += `<tr class="${isEven ? '' : 'bg-gray-50/50 dark:bg-steel-700/10'} hover:bg-nexo-50/30 dark:hover:bg-steel-700/30 transition-colors">`;
                NULOS_COLUMNS.forEach(col => {
                    if (col.type === 'input') {
                        let displayCust = row.custo_unitario !== null ? formatCurrency(row.custo_unitario) : '';
                        html += `<td class="px-3 py-1.5 text-center">
                            <div class="flex items-center justify-end gap-1">
                                <span class="mr-1 text-steel-400 text-[10px]">${isDevolucao ? '(-)' : ''} R$</span>
                                <input type="number" step="0.01" 
                                    id="input-custo-${row.id}"
                                    class="w-20 text-right px-2 py-1.5 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/50 rounded-lg focus:ring-2 focus:ring-nexo-500/30 focus:border-nexo-500 outline-none transition-all ${isDevolucao ? 'text-red-500 dark:text-red-400 font-bold' : 'text-steel-800 dark:text-gray-200'}"
                                    placeholder="0.00"
                                    value="${row.custo_unitario !== null ? row.custo_unitario : ''}">
                                <button onclick="CustosApp.saveCost(${row.id})" class="px-2 py-1.5 bg-nexo-500 hover:bg-nexo-600 text-white rounded-lg text-xs transition-colors shrink-0" title="Salvar">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </button>
                            </div>
                        </td>`;
                    } else if (col.type === 'currency') {
                        html += `<td class="px-3 py-2 text-right text-xs whitespace-nowrap">${formatCurrency(row[col.key])}</td>`;
                    } else if (col.type === 'number') {
                        html += `<td class="px-3 py-2 text-center text-xs whitespace-nowrap">${row[col.key] ?? '-'}</td>`;
                    } else {
                        const val = row[col.key] || '-';
                        const truncate = col.key === 'cliente' || col.key === 'produto' ? 'max-w-[200px] truncate' : '';
                        html += `<td class="px-3 py-2 text-xs whitespace-nowrap ${truncate}" title="${val}">${val}</td>`;
                    }
                });
                html += '</tr>';
            });
            tbody.innerHTML = html;
        }

        renderPagination('nulosPaginationControls', nulosState, renderNulosGrid);
    }

    async function saveCost(id) {
        const input = document.getElementById(`input-custo-${id}`);
        if (!input) return;

        let rawVal = input.value.trim();
        // Parse BRL formatted or plain number
        rawVal = rawVal.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        const custoNum = parseFloat(rawVal);
        
        if (isNaN(custoNum) || custoNum <= 0) {
            input.classList.add('border-red-500');
            input.focus();
            return;
        }

        input.disabled = true;
        try {
            const resp = await fetch(`/api/financeiro/custos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({ custo_unitario: custoNum })
            });

            if (!resp.ok) throw new Error('Falha ao salvar');

            // Success — remove row from the list
            nulosState.rawData = nulosState.rawData.filter(r => r.id !== id);
            nulosState.filteredData = nulosState.filteredData.filter(r => r.id !== id);

            const badge = document.getElementById('nullCostsBadge');
            badge.textContent = nulosState.filteredData.length;
            if (nulosState.filteredData.length === 0) badge.classList.add('hidden');

            renderNulosGrid();

        } catch (err) {
            console.error('Erro ao salvar custo:', err);
            input.disabled = false;
            input.classList.add('border-red-500');
        }
    }

    // ==========================================
    // TAB 3: HISTÓRICO
    // ==========================================
    const histState = {
        rawData: [],
        filteredData: [],
        filters: {},
        page: 1,
        perPage: 25,
        sortCol: null,
        sortDir: 'asc',
        searchTerm: ''
    };

    const HIST_COLUMNS = [
        { key: 'empresa', label: 'Empresa', type: 'text', width: 'w-24' },
        { key: 'data_emissao', label: 'Data', type: 'date', width: 'w-28' },
        { key: 'nota_fiscal', label: 'Nota Fiscal', type: 'number', width: 'w-24' },
        { key: 'tipo_nota', label: 'Tipo', type: 'text', width: 'w-32' },
        { key: 'cliente', label: 'Cliente', type: 'text', width: 'w-44' },
        { key: 'cidade', label: 'Cidade', type: 'text', width: 'w-28' },
        { key: 'uf', label: 'UF', type: 'text', width: 'w-12' },
        { key: 'cod_produto', label: 'Cód. Produto', type: 'text', width: 'w-28' },
        { key: 'produto', label: 'Produto', type: 'text', width: 'w-44' },
        { key: 'lote', label: 'Lote', type: 'text', width: 'w-24' },
        { key: 'classificacao', label: 'Classificação', type: 'text', width: 'w-32' },
        { key: 'fabricante', label: 'Fabricante', type: 'text', width: 'w-32' },
        { key: 'unidade', label: 'Un', type: 'text', width: 'w-12' },
        { key: 'quantidade', label: 'Qtd', type: 'number', width: 'w-16' },
        { key: 'valor_unitario', label: 'Vlr Unit.', type: 'currency', width: 'w-24' },
        { key: 'valor_total', label: 'Vlr Total', type: 'currency', width: 'w-28' },
        { key: 'custo_unitario', label: 'Custo Unit.', type: 'currency', width: 'w-24' },
        { key: 'custo_total', label: 'Custo Total', type: 'currency', width: 'w-28' },
    ];

    function initHistorico() {
        const anoSelect = document.getElementById('histAnoSelect');
        populateYearSelect(anoSelect);

        anoSelect.addEventListener('change', () => loadHistorico());

        document.getElementById('histItemsPerPage').addEventListener('change', (e) => {
            histState.perPage = parseInt(e.target.value);
            histState.page = 1;
            renderHistGrid();
        });

        let searchTimeout;
        document.getElementById('histSearchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                histState.searchTerm = e.target.value.toLowerCase().trim();
                applyHistFilters();
            }, 300);
        });

        document.getElementById('histBtnExport').addEventListener('click', () => {
            if (!histState.filteredData.length) return;
            exportToExcel(histState.filteredData, HIST_COLUMNS, 'historico_custos');
        });

        renderHistHeader();
        loadHistorico();
    }

    async function loadHistorico() {
        const ano = document.getElementById('histAnoSelect').value;
        const tbody = document.getElementById('histTableBody');
        tbody.innerHTML = `<tr><td colspan="${HIST_COLUMNS.length}" class="p-8 text-center text-steel-400">
            <svg class="animate-spin h-6 w-6 text-nexo-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Carregando histórico...
        </td></tr>`;

        try {
            const data = await apiFetch(`/api/financeiro/custos/historico?ano=${ano}`);
            histState.rawData = data;
            histState.filteredData = [...data];
            histState.page = 1;
            histState.searchTerm = '';
            document.getElementById('histSearchInput').value = '';
            applyHistFilters();
        } catch (err) {
            console.error('Erro ao carregar histórico:', err);
            tbody.innerHTML = `<tr><td colspan="${HIST_COLUMNS.length}" class="p-8 text-center text-red-500">Erro ao carregar dados.</td></tr>`;
        }
    }

    
    window.openHistFilterModal = (event, colKey) => {
        const col = HIST_COLUMNS.find(c => c.key === colKey);
        openFilterModal(event, col, histState, 'rawData', applyHistFilters);
    };
    window.sortHistGrid = (key) => {
        if (histState.sortCol === key) {
            histState.sortDir = histState.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            histState.sortCol = key;
            histState.sortDir = 'asc';
        }
        applyHistFilters();
    };

    function renderHistHeader() {
        renderGenericHeader('histTableHeader', HIST_COLUMNS, histState, 'sortHistGrid', 'openHistFilterModal');
    }

    function applyHistFilters() {
        let result = histState.rawData;

        if (histState.searchTerm) {
            const term = histState.searchTerm.toLowerCase();
            result = result.filter(r => 
                (r.nota_fiscal && String(r.nota_fiscal).includes(term)) ||
                (r.cliente && r.cliente.toLowerCase().includes(term)) ||
                (r.produto && r.produto.toLowerCase().includes(term)) ||
                (r.cod_produto && String(r.cod_produto).includes(term)) ||
                (r.lote && r.lote.toLowerCase().includes(term))
            );
        }

        result = result.filter(r => {
            for (const key of Object.keys(histState.filters)) {
                if (histState.filters[key] && histState.filters[key].size > 0 && !histState.filters[key].has('__NONE__')) {
                    const val = (r[key] === null || r[key] === undefined || r[key] === '') ? '-' : r[key];
                    if (!histState.filters[key].has(val)) return false;
                }
            }
            return true;
        });

        if (histState.sortCol) {
            result.sort((a, b) => {
                let valA = a[histState.sortCol];
                let valB = b[histState.sortCol];
                
                if (valA === null || valA === undefined || valA === '') valA = '';
                if (valB === null || valB === undefined || valB === '') valB = '';

                if (valA === '' && valB !== '') return 1;
                if (valB === '' && valA !== '') return -1;
                
                if (!isNaN(valA) && !isNaN(valB)) {
                    valA = Number(valA); valB = Number(valB);
                } else {
                    valA = String(valA).toLowerCase(); valB = String(valB).toLowerCase();
                }

                if (valA < valB) return histState.sortDir === 'asc' ? -1 : 1;
                if (valA > valB) return histState.sortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        histState.filteredData = result;

        // Render Clear Filter button
        const activeFilters = Object.values(histState.filters).some(s => s.size > 0 && !s.has('__NONE__'));
        const actionsContainer = document.getElementById('histActions');
        if (actionsContainer) {
            let clearBtn = document.getElementById('histClearFilterBtn');
            if (activeFilters) {
                if (!clearBtn) {
                    clearBtn = document.createElement('button');
                    clearBtn.id = 'histClearFilterBtn';
                    clearBtn.className = 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30 rounded-lg px-3 py-1.5 text-xs font-medium mr-2 shadow-sm transition-colors';
                    clearBtn.textContent = 'Remover Filtros';
                    clearBtn.onclick = () => {
                        histState.filters = {};
                        applyHistFilters();
                    };
                    actionsContainer.prepend(clearBtn);
                }
            } else if (clearBtn) {
                clearBtn.remove();
            }
        }

        renderHistHeader();
        renderHistGrid();
    }

    function renderHistGrid() {
        const tbody = document.getElementById('histTableBody');
        const data = histState.filteredData;
        const start = (histState.page - 1) * histState.perPage;
        const end = start + histState.perPage;
        const pageData = data.slice(start, end);

        if (pageData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${HIST_COLUMNS.length}" class="p-8 text-center text-steel-400">
                <div class="flex flex-col items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-steel-300 dark:text-steel-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p class="text-sm">Nenhum registro encontrado.</p>
                </div>
            </td></tr>`;
        } else {
            let html = '';
            pageData.forEach((row, idx) => {
                const isEven = idx % 2 === 0;
                let isDevolucao = row.tipo_nota && row.tipo_nota.toUpperCase().includes('DEVOLU');
                html += `<tr class="${isEven ? '' : 'bg-gray-50/50 dark:bg-steel-700/10'} hover:bg-nexo-50/30 dark:hover:bg-steel-700/30 transition-colors">`;
                HIST_COLUMNS.forEach(col => {
                    if (col.key === 'data_emissao') {
                        html += `<td class="px-3 py-2 text-center text-[11px] whitespace-nowrap">${formatDate(row[col.key])}</td>`;
                    } else if (col.key === 'custo_total') {
                        let renderCustoTotal = formatCurrency(row[col.key]);
                        if (isDevolucao && row[col.key]) {
                            renderCustoTotal = `(${formatCurrency(row[col.key])})`;
                        }
                        html += `<td class="px-3 py-2 text-right text-[11px] whitespace-nowrap font-medium text-nexo-600 dark:text-nexo-400">${renderCustoTotal}</td>`;
                    } else if (col.type === 'currency') {
                        const val = parseFloat(row[col.key]) || 0;
                        html += `<td class="px-3 py-2 text-right text-[11px] whitespace-nowrap">${formatCurrency(val)}</td>`;
                    } else if (col.type === 'number') {
                        const val = row[col.key];
                        html += `<td class="px-3 py-2 text-center text-[11px] whitespace-nowrap">${val ?? '-'}</td>`;
                    } else {
                        const val = row[col.key] || '-';
                        const truncate = (col.key === 'cliente' || col.key === 'produto') ? 'max-w-[180px] truncate' : '';
                        html += `<td class="px-3 py-2 text-[11px] whitespace-nowrap ${truncate}" title="${val}">${val}</td>`;
                    }
                });
                html += '</tr>';
            });
            tbody.innerHTML = html;
        }

        renderPagination('histPaginationControls', histState, renderHistGrid);
    }

    // ==========================================
    // SHARED: PAGINATION
    // ==========================================
    function renderPagination(containerId, state, renderFn) {
        const controls = document.getElementById(containerId);
        if (!controls) return;
        
        const totalPages = Math.ceil(state.filteredData.length / state.perPage) || 1;
        
        let html = '';

        // First button
        html += `<button onclick="CustosApp._goToPage('${containerId}', 1)" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.page === 1 ? 'disabled' : ''} title="Primeira Página">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>
                 </button>`;

        // Prev button
        html += `<button onclick="CustosApp._goToPage('${containerId}', ${state.page - 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.page === 1 ? 'disabled' : ''} title="Anterior">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                 </button>`;

        // Simplificação de botões (mostra 5 páginas no máx)
        let startPage = Math.max(1, state.page - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

        for (let i = startPage; i <= endPage; i++) {
            if (i === state.page) {
                html += `<button class="px-3 py-1 text-sm font-medium rounded bg-nexo-50 dark:bg-nexo-900/30 text-nexo-600 dark:text-nexo-400">${i}</button>`;
            } else {
                html += `<button onclick="CustosApp._goToPage('${containerId}', ${i})" class="px-3 py-1 text-sm font-medium rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700">${i}</button>`;
            }
        }

        // Next button
        html += `<button onclick="CustosApp._goToPage('${containerId}', ${state.page + 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.page === totalPages || totalPages === 0 ? 'disabled' : ''} title="Próxima">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
                 </button>`;

        // Last button
        html += `<button onclick="CustosApp._goToPage('${containerId}', ${totalPages})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" ${state.page === totalPages || totalPages === 0 ? 'disabled' : ''} title="Última Página">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414zm6 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                 </button>`;

        controls.innerHTML = html;
        
        // Update total records info if applicable
        const infoId = containerId.replace('Controls', 'Info');
        const info = document.getElementById(infoId);
        if (info) {
            const start = state.filteredData.length === 0 ? 0 : ((state.page - 1) * state.perPage) + 1;
            const end = Math.min(state.page * state.perPage, state.filteredData.length);
            info.textContent = `Mostrando ${start} a ${end} de ${state.filteredData.length} registros`;
        }
    }

    function _goToPage(containerId, page) {
        if (containerId === 'nulosPaginationControls') {
            const totalPages = Math.ceil(nulosState.filteredData.length / nulosState.perPage) || 1;
            if (page < 1 || page > totalPages) return;
            nulosState.page = page;
            renderNulosGrid();
        } else if (containerId === 'histPaginationControls') {
            const totalPages = Math.ceil(histState.filteredData.length / histState.perPage) || 1;
            if (page < 1 || page > totalPages) return;
            histState.page = page;
            renderHistGrid();
        }
    }

    // ==========================================
    // SHARED: EXPORT EXCEL
    // ==========================================
    
    // ==========================================
    // FILTER LOGIC
    // ==========================================
    let activeFilterModal = null;
    let expandedState = {};

    function openFilterModal(event, col, stateObj, dataKey, processDataCallback) {
        event.stopPropagation();
        closeFilter();

        const colKey = col.key;
        const uniqueValues = [...new Set(stateObj.rawData.map(r => r[colKey] === null || r[colKey] === undefined || r[colKey] === '' ? '-' : r[colKey]))].sort((a, b) => {
            if (a === '-' || !a) return -1;
            if (b === '-' || !b) return 1;
            if (!isNaN(a) && !isNaN(b)) return Number(a) - Number(b);
            return String(a).localeCompare(String(b));
        });

        const modal = document.createElement('div');
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
        const tempSelected = new Set(stateObj.filters[colKey]);
        if (tempSelected.size === 0 || tempSelected.has('__NONE__')) {
            if (!tempSelected.has('__NONE__')) uniqueValues.forEach(v => tempSelected.add(v));
            else tempSelected.clear();
        }

        function renderCheckboxes(term = '') {
            listContainer.innerHTML = '';
            
            const filteredVals = uniqueValues.filter(v => {
                if (!term) return true;
                let displayVal = v;
                if (col.type === 'currency') displayVal = formatCurrency(v);
                if (col.type === 'date') displayVal = formatDate(v);
                return String(displayVal).toLowerCase().includes(term.toLowerCase());
            });

            if (filteredVals.length === 0) {
                listContainer.innerHTML = '<p class="text-xs text-steel-400 p-2 text-center">Nenhum valor encontrado.</p>';
                return;
            }

            const allChecked = filteredVals.length > 0 && filteredVals.every(v => tempSelected.has(v));
            const selectAllDiv = document.createElement('div');
            selectAllDiv.className = 'flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer mb-1 border-b border-gray-100 dark:border-steel-700';
            selectAllDiv.innerHTML = `
                <input type="checkbox" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${allChecked ? 'checked' : ''}>
                <span class="font-medium text-steel-700 dark:text-gray-300">(Selecionar Tudo)</span>
            `;
            selectAllDiv.querySelector('input').onclick = (e) => {
                if (e.target.checked) filteredVals.forEach(v => tempSelected.add(v));
                else filteredVals.forEach(v => tempSelected.delete(v));
                renderCheckboxes(term);
            };
            listContainer.appendChild(selectAllDiv);

            if (col.type === 'date' && !term) {
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
                    if (valStr.includes('-')) {
                        const parts = valStr.split('T')[0].split('-');
                        if (parts.length === 3) [y, m, d] = parts;
                    }
                    if (!y) {
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
                        const mName = (month !== '-') ? monthsNames[parseInt(month)-1] : month;
                        
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
                            if (String(val).includes('T')) displayVal = String(val).split('T')[0].split('-')[2];
                            dHeader.innerHTML = `
                                <div class="w-3"></div>
                                <input type="checkbox" value="${val}" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${isChecked ? 'checked' : ''}>
                                <span class="truncate text-steel-500 dark:text-gray-500 text-[11px]">${displayVal}</span>
                            `;
                            const dCb = dHeader.querySelector('input');
                            dHeader.onclick = (e) => {
                                if (e.target !== dCb) dCb.checked = !dCb.checked;
                                if (dCb.checked) tempSelected.add(val); else tempSelected.delete(val);
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
                filteredVals.forEach(val => {
                    const isChecked = tempSelected.has(val);
                    const div = document.createElement('div');
                    div.className = 'flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-steel-700 rounded cursor-pointer';
                    let display = val === '-' ? '(Vazio)' : val;
                    if (col.type === 'currency' && val !== '-') display = formatCurrency(val);
                    if (col.type === 'date' && val !== '-') display = formatDate(val);
                    div.innerHTML = `<input type="checkbox" value="${val}" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" ${isChecked ? 'checked' : ''}><span class="truncate text-steel-600 dark:text-gray-400">${display}</span>`;
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
            if (tempSelected.size === uniqueValues.length) stateObj.filters[colKey] = new Set();
            else if (tempSelected.size === 0) stateObj.filters[colKey] = new Set(['__NONE__']);
            else stateObj.filters[colKey] = new Set(tempSelected);
            stateObj.page = 1;
            processDataCallback();
            closeFilter();
        };
        modal.querySelector('#btnClearFilter').onclick = () => {
            if (stateObj.filters[colKey]) stateObj.filters[colKey].clear();
            stateObj.page = 1;
            processDataCallback();
            closeFilter();
        };
    }

    function closeFilter() {
        if (activeFilterModal) { activeFilterModal.remove(); activeFilterModal = null; }
    }
    document.addEventListener('click', e => { if (activeFilterModal && !activeFilterModal.contains(e.target)) closeFilter(); });

    // Header Rendering Helpers
    function renderGenericHeader(theadId, columns, stateObj, sortCallback, filterCallback) {
        const thead = document.getElementById(theadId);
        if (!thead) return;
        
        let html = '<tr class="text-white text-[10px] 2xl:text-[11px] font-medium">';
        columns.forEach(col => {
            const sortIcon = stateObj.sortCol === col.key
                ? (stateObj.sortDir === 'asc' ? '↑' : '↓')
                : '↕';
            
            const hasFilter = stateObj.filters[col.key] && stateObj.filters[col.key].size > 0 && !stateObj.filters[col.key].has('__NONE__');
            const hasNoneFilter = stateObj.filters[col.key] && stateObj.filters[col.key].has('__NONE__');
            const isFiltered = hasFilter || hasNoneFilter;
            const filterColor = isFiltered ? 'text-white dark:text-nexo-400 opacity-100' : 'text-white/60 dark:text-steel-500 hover:text-white dark:hover:text-steel-300';

            html += `
                <th class="px-2 py-1.5 2xl:px-3 2xl:py-2.5 border-b border-gray-200 dark:border-steel-700 whitespace-nowrap select-none relative text-center align-middle bg-nexo-600 dark:bg-steel-900 ${col.width || ''}">
                    <div class="flex items-center justify-center cursor-pointer hover:text-white/80 transition-colors w-full px-4" onclick="${sortCallback}('${col.key}')">
                        ${col.label} <span class="text-[10px] ml-1 opacity-50">${sortIcon}</span>
                    </div>
                    <button onclick="${filterCallback}(event, '${col.key}')" class="p-1 rounded focus:outline-none absolute right-2 top-1/2 -translate-y-1/2 ${filterColor}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </th>
            `;
        });
        html += '</tr>';
        thead.innerHTML = html;
    }

    function exportToExcel(data, columns, filename) {
        if (typeof XLSX === 'undefined') return alert('Biblioteca XLSX não carregada.');
        
        const exportData = data.map(row => {
            const obj = {};
            columns.forEach(col => {
                if (col.type !== 'input') {
                    obj[col.label] = row[col.key] ?? '';
                }
            });
            return obj;
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, 'Dados');
        XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    // ==========================================
    // INIT
    // ==========================================
    function init() {
        initTabs();
        initResumo();
        initCustosNulos();
        initHistorico();

        // Init CellSelector for history grid
        if (typeof CellSelector !== 'undefined') CellSelector.init('histTableBody');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        _goToPage,
        saveCost,
    };
})();
