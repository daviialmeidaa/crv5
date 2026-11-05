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

        const nDevolvidas = -Math.abs(n.devolvidas);
        const bDevolvidas = -Math.abs(b.devolvidas);
        const nCustosDev = -Math.abs(n.custosDev);
        const bCustosDev = -Math.abs(b.custosDev);

        document.getElementById('tg-vendas-nexo').textContent = formatCurrency(n.vendas);
        document.getElementById('tg-vendas-bml').textContent = formatCurrency(b.vendas);
        document.getElementById('tg-vendas-total').textContent = formatCurrency(n.vendas + b.vendas);

        document.getElementById('tg-devolvidas-nexo').textContent = formatCurrency(nDevolvidas);
        document.getElementById('tg-devolvidas-bml').textContent = formatCurrency(bDevolvidas);
        document.getElementById('tg-devolvidas-total').textContent = formatCurrency(nDevolvidas + bDevolvidas);

        document.getElementById('tg-custos-nexo').textContent = formatCurrency(n.custos);
        document.getElementById('tg-custos-bml').textContent = formatCurrency(b.custos);
        document.getElementById('tg-custos-total').textContent = formatCurrency(n.custos + b.custos);

        document.getElementById('tg-custos-dev-nexo').textContent = formatCurrency(nCustosDev);
        document.getElementById('tg-custos-dev-bml').textContent = formatCurrency(bCustosDev);
        document.getElementById('tg-custos-dev-total').textContent = formatCurrency(nCustosDev + bCustosDev);

        // Total = (vendas + devolvidas) - (custos + custosDev)
        const totalNexo = (n.vendas + nDevolvidas) - (n.custos + nCustosDev);
        const totalBml = (b.vendas + bDevolvidas) - (b.custos + bCustosDev);
        document.getElementById('tg-total-nexo').textContent = formatCurrency(totalNexo);
        document.getElementById('tg-total-bml').textContent = formatCurrency(totalBml);
        document.getElementById('tg-total-geral').textContent = formatCurrency(totalNexo + totalBml);
    }

    function renderMensais(bodyId, monthData) {
        const tbody = document.getElementById(bodyId);
        let html = '';
        for (let i = 0; i < 12; i++) {
            const d = monthData[i];
            const devolvidas = -Math.abs(d.devolvidas);
            const custosDev = -Math.abs(d.custosDev);
            const total = (d.vendas + devolvidas) - (d.custos + custosDev);
            const isEven = i % 2 === 0;
            html += `<tr class="${isEven ? '' : 'bg-gray-50/50 dark:bg-steel-700/10'} hover:bg-nexo-50/30 dark:hover:bg-steel-700/30 transition-colors">
                <td class="px-3 py-2 font-medium text-steel-700 dark:text-gray-300 text-xs">${MESES[i]}</td>
                <td class="px-3 py-2 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(d.vendas)}</td>
                <td class="px-3 py-2 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(devolvidas)}</td>
                <td class="px-3 py-2 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(d.custos)}</td>
                <td class="px-3 py-2 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(custosDev)}</td>
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
            const devolvidas = -Math.abs(d.devolvidas);
            const custosDev = -Math.abs(d.custosDev);
            const total = (d.vendas + devolvidas) - (d.custos + custosDev);
            const isEven = i % 2 === 0;
            html += `<tr class="${isEven ? '' : 'bg-gray-50/50 dark:bg-steel-700/10'} hover:bg-nexo-50/30 dark:hover:bg-steel-700/30 transition-colors">
                <td class="px-3 py-2.5 font-medium text-steel-700 dark:text-gray-300 text-xs">${TRIMESTRES[i]}</td>
                <td class="px-3 py-2.5 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(d.vendas)}</td>
                <td class="px-3 py-2.5 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(devolvidas)}</td>
                <td class="px-3 py-2.5 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(d.custos)}</td>
                <td class="px-3 py-2.5 text-right text-steel-800 dark:text-gray-200 text-xs">${formatCurrency(custosDev)}</td>
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
        pagination: {current:1,limit:25,total:0},
        sort: {key:null,dir:'asc'}
    };

    const NULOS_COLUMNS = [
        { key: 'empresa', label: 'Empresa', type: 'text', width: 'w-auto' },
        { key: 'nota_fiscal', label: 'Nota Fiscal', type: 'number', width: 'w-auto' },
        { key: 'cliente', label: 'Cliente', type: 'text', width: 'w-auto max-w-[200px]' },
        { key: 'tipo_nota', label: 'Tipo', type: 'text', width: 'w-32' },
        { key: 'cod_produto', label: 'Cód. Produto', type: 'text', width: 'w-auto' },
        { key: 'produto', label: 'Produto', type: 'text', width: 'w-auto' },
        { key: 'lote', label: 'Lote', type: 'text', width: 'w-auto' },
        { key: 'classificacao', label: 'Classificação', type: 'text', width: 'w-auto' },
        { key: 'fabricante', label: 'Fabricante', type: 'text', width: 'w-auto' },
        { key: 'quantidade', label: 'Qtd', type: 'number', width: 'w-16' },
        { key: 'custo_unitario', label: 'Custo Unit.', type: 'input', width: 'w-32' },
    ];

    function initCustosNulos() {
        const anoSelect = document.getElementById('nulosAnoSelect');
        const mesSelect = document.getElementById('nulosMesSelect');
        populateYearSelect(anoSelect);

        anoSelect.addEventListener('change', () => loadCustosNulos());
        mesSelect.addEventListener('change', () => loadCustosNulos());



        document.getElementById('nulosBtnRefresh').addEventListener('click', (e) => {
            const ano = document.getElementById('nulosAnoSelect').value;
            const mes = document.getElementById('nulosMesSelect').value;

            if (!ano || !mes) {
                CustosApp.openAlertModal('Selecione um ano e um mês para sincronizar os custos.');
                return;
            }

            CustosApp.openSyncModal(ano, mes);
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
            nulosState.pagination.current = 1;

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
        nulosGrid.process();
    }

    window.openNulosFilterModal=(event,key)=>nulosGrid.openFilter(event,key);
    window.sortNulosGrid=key=>nulosGrid.toggleSort(key);

    function renderNulosHeader() {
        nulosGrid.renderHeaders();
    }

    function renderNulosGrid() {
        nulosGrid.process();
    }

    function formatInputCurrency(input) {
        let value = input.value.replace(/\D/g, '');
        if (!value) {
            input.value = '';
            return;
        }
        value = (parseInt(value, 10) / 100).toFixed(2);
        value = value.replace('.', ',');
        value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
        input.value = value;
    }

    async function saveCost(id) {
        const input = document.getElementById(`input-custo-${id}`);
        if (!input) return;

        let rawVal = input.value.trim();
        rawVal = rawVal.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        const custoNum = parseFloat(rawVal);

        if (isNaN(custoNum) || custoNum <= 0) {
            input.classList.add('border-red-500');
            input.focus();
            return;
        }

        const record = nulosState.rawData.find(r => r.id === id);
        if (!record) return;

        input.disabled = true;
        try {
            const payload = {
                id: record.id,
                custo_unitario: custoNum
            };

            const resp = await fetch(`/api/financeiro/custos/save-batch`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) throw new Error('Falha ao salvar');

            nulosState.rawData = nulosState.rawData.filter(r => r.id !== record.id);
            nulosState.filteredData = nulosState.filteredData.filter(r => r.id !== record.id);

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
        pagination: {current:1,limit:25,total:0},
        sort: {key:null,dir:'asc'},
        searchTerm: ''
    };

    const HIST_COLUMNS = [
        { key: 'empresa', label: 'Empresa', type: 'text', width: 'w-auto' },
        { key: 'data_emissao', label: 'Data', type: 'date', width: 'w-auto' },
        { key: 'nota_fiscal', label: 'Nota Fiscal', type: 'number', width: 'w-auto' },
        { key: 'tipo_nota', label: 'Tipo', type: 'text', width: 'w-auto' },
        { key: 'cliente', label: 'Cliente', type: 'text', width: 'w-auto' },
        { key: 'uf', label: 'UF', type: 'text', width: 'w-auto' },
        { key: 'cod_produto', label: 'Cód. Produto', type: 'text', width: 'w-auto' },
        { key: 'produto', label: 'Produto', type: 'text', width: 'w-auto' },
        { key: 'lote', label: 'Lote', type: 'text', width: 'w-auto' },
        { key: 'classificacao', label: 'Classificação', type: 'text', width: 'w-auto' },
        { key: 'fabricante', label: 'Fabricante', type: 'text', width: 'w-auto' },
        { key: 'unidade', label: 'Un', type: 'text', width: 'w-12' },
        { key: 'quantidade', label: 'Qtd', type: 'number', width: 'w-auto' },
        { key: 'valor_unitario', label: 'Vlr Unit.', type: 'currency', width: 'w-auto' },
        { key: 'valor_total', label: 'Vlr Total', type: 'currency', width: 'w-auto' },
        { key: 'custo_unitario', label: 'Custo Unit.', type: 'currency', width: 'w-auto' },
        { key: 'custo_total', label: 'Custo Total', type: 'currency', width: 'w-auto' },
    ];

    function gridCostInput(row) {
        const box = document.createElement('div');
        box.className = 'flex items-center justify-end gap-1';
        const sign = document.createElement('span');
        sign.className = 'mr-1 text-steel-400 text-[10px]';
        sign.textContent = (row.tipo_nota?.toUpperCase().includes('DEVOLU') ? '(-) ' : '') + 'R$';
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'input-custo-' + row.id;
        input.className =
            'w-24 text-right px-2 py-1.5 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/50 rounded-lg focus:ring-2 focus:ring-nexo-500/30 focus:border-nexo-500 outline-none';
        input.placeholder = '0,00';
        input.value =
            row.custo_unitario != null ? parseFloat(row.custo_unitario).toFixed(2).replace('.', ',') : '';
        input.addEventListener('focus', () => input.select());
        input.addEventListener('input', () => formatInputCurrency(input));
        box.append(
            sign,
            input,
            HubDataGrid.components.Actions.button({
                label: 'Salvar',
                icon: 'save',
                onClick: () => saveCost(row.id)
            })
        );
        return box;
    }
    function costExportValue(row, col) {
        let value = row[col.key];
        const devolucao = row.tipo_nota?.toUpperCase().includes('DEVOLU');
        if (col.type === 'currency' && value != null && value !== '-') {
            value = parseFloat(value) || 0;
            if (devolucao) value = -Math.abs(value);
        }
        if (col.key === 'quantidade' && devolucao && value > 0) value = -Math.abs(value);
        return value;
    }
    const nulosGrid = HubDataGrid.create({
        bodyId: 'nulosTableBody',
        headerId: 'nulosTableHeader',
        infoId: 'nulosPaginationInfo',
        paginationId: 'nulosPaginationControls',
        pageSizeId: 'nulosItemsPerPage',
        clearId: 'nulosBtnClearFilters',
        state: nulosState,
        columns: NULOS_COLUMNS,
        renderCell: (value, col, row) =>
            col.type === 'input' ? gridCostInput(row) : HubDataGrid.components.values.escape(value ?? '-')
    });
    const histGrid = HubDataGrid.create({
        selectionValue: (row, col) =>
            col.type === 'currency' ? parseFloat(costExportValue(row, col)) || 0 : costExportValue(row, col),
        bodyId: 'histTableBody',
        headerId: 'histTableHeader',
        infoId: 'histPaginationInfo',
        paginationId: 'histPaginationControls',
        pageSizeId: 'histItemsPerPage',
        clearId: 'histBtnClearFilters',
        searchId: 'histSearchInput',
        searchKeys: ['nota_fiscal', 'cliente', 'produto', 'cod_produto', 'lote'],
        state: histState,
        columns: HIST_COLUMNS,
        renderCell: (value, col, row) => {
            const text =
                col.type === 'currency'
                    ? formatCurrency(costExportValue(row, col))
                    : col.type === 'date'
                      ? formatDate(value)
                      : (costExportValue(row, col) ?? '-');
            return {
                text,
                className: col.key === 'custo_total' ? 'font-medium text-nexo-600 dark:text-nexo-400' : ''
            };
        }
    });

    function initHistorico() {
        const anoSelect = document.getElementById('histAnoSelect');
        populateYearSelect(anoSelect);

        anoSelect.addEventListener('change', () => loadHistorico());



        let searchTimeout;


        document.getElementById('histBtnExport').addEventListener('click', () => {
            if (!histState.filteredData.length) return;
            exportToExcel(histState.filteredData, HIST_COLUMNS, 'historico_custos');
        });



        renderHistHeader();
        loadHistorico();
    }

    async function loadHistorico() {
        const tbody = document.getElementById('histTableBody');
        tbody.innerHTML = `<tr><td colspan="${HIST_COLUMNS.length}" class="p-8 text-center text-steel-400">
            <svg class="animate-spin h-6 w-6 text-nexo-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Carregando histórico...
        </td></tr>`;

        try {
            const data = await apiFetch(`/api/financeiro/custos/historico`);
            histState.rawData = data;
            histState.filteredData = [...data];
            histState.pagination.current = 1;
            histState.searchTerm = '';
            document.getElementById('histSearchInput').value = '';
            applyHistFilters();
        } catch (err) {
            console.error('Erro ao carregar histórico:', err);
            tbody.innerHTML = `<tr><td colspan="${HIST_COLUMNS.length}" class="p-8 text-center text-red-500">Erro ao carregar dados.</td></tr>`;
        }
    }


    window.openHistFilterModal=(event,key)=>histGrid.openFilter(event,key);
    window.sortHistGrid=key=>histGrid.toggleSort(key);

    function renderHistHeader() {
        histGrid.renderHeaders();
    }

    function applyHistFilters() {
        histGrid.process();
    }

    function renderHistGrid() {
        histGrid.process();
    }

    // ==========================================
    // SHARED: PAGINATION
    // ==========================================


    function _goToPage(containerId,page){(containerId==='nulosPaginationControls'?nulosGrid:histGrid).setPage(page);}

    // ==========================================
    // SHARED: EXPORT EXCEL
    // ==========================================

    // ==========================================
    // FILTER LOGIC
    // ==========================================

    let expandedState = {};



    function closeFilter() {
        nulosGrid.filters.close();
        histGrid.filters.close();
    }


    // Header Rendering Helpers


    function exportToExcel(_data, _columns, filename) {
        const sourceGrid = filename === 'custos_nulos' ? nulosGrid : histGrid;
        return sourceGrid.export({
            filename: filename + '_' + new Date().toISOString().slice(0, 10) + '.xlsx',
            accounting: true,
            value: costExportValue
        });
    }

    // ==========================================
    // MODALS LOGIC
    // ==========================================
    function openAlertModal(msg, type = 'warning') {
        const titleEl = document.getElementById('alertModalTitle');
        const iconContainer = document.getElementById('alertModalIconContainer');
        const msgEl = document.getElementById('alertModalMessage');

        msgEl.textContent = msg;

        // Reset classes
        iconContainer.className = 'shrink-0 w-10 h-10 rounded-full flex items-center justify-center';

        if (type === 'success') {
            titleEl.textContent = 'Sucesso';
            iconContainer.classList.add('bg-green-100', 'dark:bg-green-900/30', 'text-green-600', 'dark:text-green-400');
            iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;
        } else if (type === 'error') {
            titleEl.textContent = 'Erro';
            iconContainer.classList.add('bg-red-100', 'dark:bg-red-900/30', 'text-red-600', 'dark:text-red-400');
            iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
        } else {
            titleEl.textContent = 'Atenção';
            iconContainer.classList.add('bg-yellow-100', 'dark:bg-yellow-900/30', 'text-yellow-600', 'dark:text-yellow-400');
            iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
        }

        const modal = document.getElementById('alertModal');
        const content = document.getElementById('alertModalContent');
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        });
    }

    function closeAlertModal() {
        const modal = document.getElementById('alertModal');
        const content = document.getElementById('alertModalContent');
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }

    function openSyncModal(ano, mes) {
        const modal = document.getElementById('syncModal');
        const content = document.getElementById('syncModalContent');
        const logContainer = document.getElementById('syncLog');
        const footer = document.getElementById('syncModalFooter');
        const icon = document.getElementById('syncModalIcon');
        const title = document.getElementById('syncModalTitle');
        const subtitle = document.getElementById('syncModalSubtitle');
        const progressBar = document.getElementById('syncProgressBar');
        const progressText = document.getElementById('syncProgressText');

        // Reset state
        logContainer.innerHTML = '<div class="text-center opacity-50 italic mt-16">Conectando...</div>';
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        footer.classList.add('hidden');
        icon.className = 'mx-auto w-16 h-16 rounded-full bg-nexo-50 dark:bg-nexo-900/20 flex items-center justify-center text-nexo-500 mb-4 shadow-inner';
        icon.innerHTML = `<svg class="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>`;
        title.textContent = 'Sincronizando Custos...';
        title.className = 'text-lg font-bold text-steel-900 dark:text-gray-100';
        subtitle.textContent = 'Não feche esta janela. O processo pode levar alguns instantes.';

        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        });

        const token = localStorage.getItem('token');
        const eventSource = new EventSource(`/api/financeiro/custos/sincronizar/stream?ano=${ano}&mes=${mes}&token=${token}`);
        let isFirstMessage = true;

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (isFirstMessage) {
                logContainer.innerHTML = '';
                isFirstMessage = false;
            }

            if (data.progress !== undefined) {
                const percent = Math.round(data.progress);
                progressBar.style.width = `${percent}%`;
                progressText.textContent = `${percent}%`;
            }

            if (data.stats) {
                logContainer.innerHTML = `
                    <div class="mb-5 text-green-300">
                        <span class="opacity-60">> Processando:</span> ${data.currentItem}
                    </div>
                    <div class="space-y-3 pl-2">
                        <div class="flex justify-between items-center border-b border-steel-800 pb-2">
                            <span>- Supra SGC/SGC2 (Níveis 1 e 2):</span>
                            <span class="font-bold text-white">${data.stats.n12} encontrados</span>
                        </div>
                        <div class="flex justify-between items-center border-b border-steel-800 pb-2">
                            <span>- Histórico Local (Níveis 3 e 4):</span>
                            <span class="font-bold text-white">${data.stats.n34} encontrados</span>
                        </div>
                        <div class="flex justify-between items-center text-red-400">
                            <span>- Fallback (Custo Zero):</span>
                            <span class="font-bold">${data.stats.n5} registros</span>
                        </div>
                    </div>
                `;
                return;
            }

            if (data.error) {
                logContainer.insertAdjacentHTML('beforeend', `<div class="text-red-500 mb-2 font-bold">Erro: ${data.error}</div>`);
                logContainer.scrollTop = logContainer.scrollHeight;
                eventSource.close();
                showSyncComplete(false);
                return;
            }

            if (data.done) {
                progressBar.style.width = '100%';
                progressText.textContent = '100%';
                const stats = data.result;
                logContainer.innerHTML = `
                    <div class="mt-8 pt-4 border-t border-steel-700">
                        <div class="text-white font-bold mb-3">> Resumo da Sincronização</div>
                        <ul class="space-y-1 text-steel-400">
                            <li>Total de Notas Únicas: <strong class="text-white">${stats.totalNotas}</strong></li>
                            <li class="pl-4 text-[11px]">- Vendas: ${stats.notasVenda}</li>
                            <li class="pl-4 text-[11px]">- Devoluções: ${stats.notasDevolucao}</li>
                            <li class="mt-2 text-white">Total de Produtos (Itens): <strong>${stats.totalItens}</strong></li>
                            <li class="pl-4 text-[11px] text-green-400">- Custos encontrados: ${stats.custosEncontrados}</li>
                            <li class="pl-4 text-[11px] text-red-400">- Sem custo cadastrado: ${stats.semCusto}</li>
                        </ul>
                    </div>`;
                logContainer.scrollTop = logContainer.scrollHeight;
                eventSource.close();
                showSyncComplete(true);
                return;
            }

            if (data.message) {
                let colorClass = 'text-steel-500';
                if (data.isSuccess) colorClass = 'text-green-500';
                if (data.isHighlight) colorClass = 'text-white font-semibold';
                if (data.isWarning) colorClass = 'text-amber-500';

                logContainer.insertAdjacentHTML('beforeend', `<div class="mb-1.5 ${colorClass}">${data.message.replace(/\\n/g, '<br>')}</div>`);
                logContainer.scrollTop = logContainer.scrollHeight;
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE Error:', err);
            logContainer.insertAdjacentHTML('beforeend', `<div class="text-red-500 mb-2 font-bold">A conexão com o servidor foi interrompida.</div>`);
            logContainer.scrollTop = logContainer.scrollHeight;
            eventSource.close();
            showSyncComplete(false);
        };
    }

    function showSyncComplete(success) {
        const icon = document.getElementById('syncModalIcon');
        const title = document.getElementById('syncModalTitle');
        const subtitle = document.getElementById('syncModalSubtitle');
        const footer = document.getElementById('syncModalFooter');

        if (success) {
            icon.className = 'mx-auto w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500 mb-4 shadow-inner';
            icon.innerHTML = `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
            title.textContent = 'Sincronização Finalizada!';
            title.className = 'text-lg font-bold text-green-600 dark:text-green-400';
            subtitle.textContent = 'Os dados foram atualizados com sucesso.';
        } else {
            icon.className = 'mx-auto w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 mb-4 shadow-inner';
            icon.innerHTML = `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
            title.textContent = 'Falha na Sincronização';
            title.className = 'text-lg font-bold text-red-600 dark:text-red-400';
            subtitle.textContent = 'Houve um erro durante o processo. Verifique os logs acima.';
        }

        footer.classList.remove('hidden');
    }

    function closeSyncModal() {
        const modal = document.getElementById('syncModal');
        const content = document.getElementById('syncModalContent');
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            try { loadCustosNulos(); } catch (e) { console.error(e); }
            try {
                const anoResumo = document.getElementById('anoResumo');
                if (anoResumo) loadResumoData(parseInt(anoResumo.value));
            } catch (e) { console.error(e); }
            try { loadHistorico(); } catch (e) { console.error(e); }
        }, 300);
    }

    // ==========================================
    // EMAIL
    // ==========================================
    function openEmailModal() {
        const modal = document.getElementById('emailModal');
        const content = document.getElementById('emailModalContent');
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        });
    }

    function closeEmailModal() {
        const modal = document.getElementById('emailModal');
        const content = document.getElementById('emailModalContent');
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.getElementById('emailForm').reset();
        }, 300);
    }

    async function submitEmailForm(e) {
        e.preventDefault();

        const to = document.getElementById('emailTo').value.replace(/;/g, ',');
        const cc = document.getElementById('emailCc').value.replace(/;/g, ',');
        const year = document.getElementById('resumoAnoSelect').value;

        const btn = document.getElementById('btnSendEmail');
        const spinner = document.getElementById('emailSpinner');

        btn.disabled = true;
        spinner.classList.remove('hidden');

        try {
            const response = await fetch('/api/financeiro/custos/email-contabilidade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify({ to, cc, year })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Erro ao enviar e-mail');

            closeEmailModal();
            setTimeout(() => {
                openAlertModal('E-mail enviado com sucesso!', 'success');
            }, 350);
        } catch (error) {
            console.error(error);
            closeEmailModal();
            setTimeout(() => {
                openAlertModal('Falha ao enviar e-mail: ' + error.message, 'error');
            }, 350);
        } finally {
            btn.disabled = false;
            spinner.classList.add('hidden');
        }
    }

    // ==========================================
    // INIT
    // ==========================================
    function init() {
        initTabs();
        initResumo();
        initCustosNulos();
        initHistorico();


    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        _goToPage,
        saveCost,
        formatInputCurrency,
        openAlertModal,
        closeAlertModal,
        openSyncModal,
        closeSyncModal,
        openEmailModal,
        closeEmailModal,
        submitEmailForm
    };
})();
