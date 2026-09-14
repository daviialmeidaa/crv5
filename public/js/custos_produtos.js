/**
 * custos_produtos.js
 * Módulo principal da página de Custos de Produtos.
 * Gerencia 3 abas: Resumo, Custos Nulos, Histórico.
 */

const CustosApp = (() => {
    'use strict';

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
        { key: 'cod_produto', label: 'Cód. Produto', type: 'text', width: 'w-28' },
        { key: 'produto', label: 'Produto', type: 'text', width: 'w-48' },
        { key: 'lote', label: 'Lote', type: 'text', width: 'w-24' },
        { key: 'classificacao', label: 'Classificação', type: 'text', width: 'w-32' },
        { key: 'quantidade', label: 'Qtd', type: 'number', width: 'w-16' },
        { key: 'valor_total', label: 'Valor Total', type: 'currency', width: 'w-28' },
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

        document.getElementById('nulosBtnRefresh').addEventListener('click', () => loadCustosNulos());

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

            renderNulosGrid();
        } catch (err) {
            console.error('Erro ao carregar custos nulos:', err);
            tbody.innerHTML = `<tr><td colspan="${NULOS_COLUMNS.length}" class="p-8 text-center text-red-500">Erro ao carregar dados.</td></tr>`;
        }
    }

    function renderNulosHeader() {
        const thead = document.getElementById('nulosTableHeader');
        let html = '<tr>';
        NULOS_COLUMNS.forEach(col => {
            const alignClass = ['number', 'currency', 'input'].includes(col.type) ? 'text-center justify-center' : 'text-left';
            html += `<th class="px-3 py-3 ${alignClass} ${col.width} relative">
                <span class="text-white text-[11px] font-semibold uppercase tracking-wider">${col.label}</span>
            </th>`;
        });
        html += '</tr>';
        thead.innerHTML = html;
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
                html += `<tr class="${isEven ? '' : 'bg-gray-50/50 dark:bg-steel-700/10'} hover:bg-nexo-50/30 dark:hover:bg-steel-700/30 transition-colors">`;
                NULOS_COLUMNS.forEach(col => {
                    if (col.type === 'input') {
                        html += `<td class="px-3 py-1.5 text-center">
                            <div class="flex items-center gap-1">
                                <input type="text" value="" 
                                    class="w-full px-2 py-1.5 text-xs text-center bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/50 rounded-lg focus:ring-2 focus:ring-nexo-500/30 focus:border-nexo-500 outline-none transition-all text-steel-800 dark:text-gray-200"
                                    placeholder="R$ 0,00"
                                    id="input-custo-${row.id}">
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

        const total = data.length;
        const showing = Math.min(end, total);
        document.getElementById('nulosPaginationInfo').textContent = total > 0
            ? `Mostrando ${start + 1}-${showing} de ${total} registros`
            : 'Mostrando 0 de 0 registros';
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
        { key: 'nota_fiscal', label: 'Nota', type: 'number', width: 'w-20' },
        { key: 'tipo_nota', label: 'Tipo', type: 'text', width: 'w-24' },
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
            renderHistGrid();
        } catch (err) {
            console.error('Erro ao carregar histórico:', err);
            tbody.innerHTML = `<tr><td colspan="${HIST_COLUMNS.length}" class="p-8 text-center text-red-500">Erro ao carregar dados.</td></tr>`;
        }
    }

    function renderHistHeader() {
        const thead = document.getElementById('histTableHeader');
        let html = '<tr>';
        HIST_COLUMNS.forEach(col => {
            const alignClass = ['number', 'currency'].includes(col.type) ? 'text-center justify-center' : 'text-left';
            html += `<th class="px-3 py-3 ${alignClass} ${col.width} relative">
                <span class="text-white text-[11px] font-semibold uppercase tracking-wider">${col.label}</span>
            </th>`;
        });
        html += '</tr>';
        thead.innerHTML = html;
    }

    function applyHistFilters() {
        let data = [...histState.rawData];
        if (histState.searchTerm) {
            data = data.filter(row =>
                Object.values(row).some(val =>
                    String(val).toLowerCase().includes(histState.searchTerm)
                )
            );
        }
        histState.filteredData = data;
        histState.page = 1;
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
                const isDevolution = row.tipo_nota && row.tipo_nota.toUpperCase().includes('DEVOLU');
                html += `<tr class="${isEven ? '' : 'bg-gray-50/50 dark:bg-steel-700/10'} hover:bg-nexo-50/30 dark:hover:bg-steel-700/30 transition-colors">`;
                HIST_COLUMNS.forEach(col => {
                    if (col.type === 'currency') {
                        const val = parseFloat(row[col.key]) || 0;
                        const colorClass = val < 0 ? 'text-red-500 dark:text-red-400' : '';
                        html += `<td class="px-3 py-2 text-right text-xs whitespace-nowrap ${colorClass}">${formatCurrency(val)}</td>`;
                    } else if (col.type === 'number') {
                        const val = row[col.key];
                        const colorClass = parseFloat(val) < 0 ? 'text-red-500 dark:text-red-400' : '';
                        html += `<td class="px-3 py-2 text-center text-xs whitespace-nowrap ${colorClass}">${val ?? '-'}</td>`;
                    } else {
                        const val = row[col.key] || '-';
                        const truncate = (col.key === 'cliente' || col.key === 'produto') ? 'max-w-[180px] truncate' : '';
                        const devColor = isDevolution ? 'text-red-500 dark:text-red-400' : '';
                        html += `<td class="px-3 py-2 text-xs whitespace-nowrap ${truncate} ${devColor}" title="${val}">${val}</td>`;
                    }
                });
                html += '</tr>';
            });
            tbody.innerHTML = html;
        }

        const total = data.length;
        const showing = Math.min(end, total);
        document.getElementById('histPaginationInfo').textContent = total > 0
            ? `Mostrando ${start + 1}-${showing} de ${total} registros`
            : 'Mostrando 0 de 0 registros';
        renderPagination('histPaginationControls', histState, renderHistGrid);
    }

    // ==========================================
    // SHARED: PAGINATION
    // ==========================================
    function renderPagination(containerId, state, renderFn) {
        const container = document.getElementById(containerId);
        const totalPages = Math.ceil(state.filteredData.length / state.perPage) || 1;
        let html = '';

        html += `<button onclick="CustosApp._goToPage('${containerId}', ${state.page - 1})" 
            class="px-2 py-1 text-xs rounded border ${state.page === 1 ? 'border-gray-200 dark:border-steel-600 text-steel-400 cursor-not-allowed' : 'border-gray-200 dark:border-steel-600 text-steel-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-steel-700'} transition-colors"
            ${state.page === 1 ? 'disabled' : ''}>‹</button>`;

        const maxVisible = 5;
        let startPage = Math.max(1, state.page - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

        if (startPage > 1) {
            html += `<button onclick="CustosApp._goToPage('${containerId}', 1)" class="px-2.5 py-1 text-xs rounded border border-gray-200 dark:border-steel-600 text-steel-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-steel-700 transition-colors">1</button>`;
            if (startPage > 2) html += `<span class="px-1 text-xs text-steel-400">…</span>`;
        }
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === state.page;
            html += `<button onclick="CustosApp._goToPage('${containerId}', ${i})" 
                class="px-2.5 py-1 text-xs rounded border ${isActive ? 'bg-nexo-500 text-white border-nexo-500' : 'border-gray-200 dark:border-steel-600 text-steel-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-steel-700'} transition-colors">${i}</button>`;
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span class="px-1 text-xs text-steel-400">…</span>`;
            html += `<button onclick="CustosApp._goToPage('${containerId}', ${totalPages})" class="px-2.5 py-1 text-xs rounded border border-gray-200 dark:border-steel-600 text-steel-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-steel-700 transition-colors">${totalPages}</button>`;
        }

        html += `<button onclick="CustosApp._goToPage('${containerId}', ${state.page + 1})" 
            class="px-2 py-1 text-xs rounded border ${state.page === totalPages ? 'border-gray-200 dark:border-steel-600 text-steel-400 cursor-not-allowed' : 'border-gray-200 dark:border-steel-600 text-steel-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-steel-700'} transition-colors"
            ${state.page === totalPages ? 'disabled' : ''}>›</button>`;

        container.innerHTML = html;
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
