const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/custos_produtos.js');
let content = fs.readFileSync(filePath, 'utf8');

// REWRITE renderNulosGrid
const nulosGridRegex = /function renderNulosGrid\(\) \{[\s\S]*?renderPagination\('nulosPaginationControls', nulosState, renderNulosGrid\);\n    \}/;
const newNulosGrid = `function renderNulosGrid() {
        const tbody = document.getElementById('nulosTableBody');
        const data = nulosState.filteredData;
        const start = (nulosState.page - 1) * nulosState.perPage;
        const end = start + nulosState.perPage;
        const pageData = data.slice(start, end);

        if (pageData.length === 0) {
            tbody.innerHTML = \`<tr><td colspan="\${NULOS_COLUMNS.length}" class="p-8 text-center text-steel-400">
                <div class="flex flex-col items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-steel-300 dark:text-steel-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="text-sm">Nenhum custo nulo encontrado para o período selecionado.</p>
                </div>
            </td></tr>\`;
        } else {
            let html = '';
            pageData.forEach((row, idx) => {
                const isEven = idx % 2 === 0;
                let isDevolucao = row.tipo_nota && row.tipo_nota.toUpperCase().includes('DEVOLU');
                html += \`<tr class="\${isEven ? '' : 'bg-gray-50/50 dark:bg-steel-700/10'} hover:bg-nexo-50/30 dark:hover:bg-steel-700/30 transition-colors">\`;
                NULOS_COLUMNS.forEach(col => {
                    if (col.type === 'input') {
                        let displayCust = row.custo_unitario !== null ? formatCurrency(row.custo_unitario) : '';
                        html += \`<td class="px-3 py-1.5 text-center">
                            <div class="flex items-center justify-end gap-1">
                                <span class="mr-1 text-steel-400 text-[10px]">\${isDevolucao ? '(-)' : ''} R$</span>
                                <input type="number" step="0.01" 
                                    id="input-custo-\${row.id}"
                                    class="w-20 text-right px-2 py-1.5 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/50 rounded-lg focus:ring-2 focus:ring-nexo-500/30 focus:border-nexo-500 outline-none transition-all \${isDevolucao ? 'text-red-500 dark:text-red-400 font-bold' : 'text-steel-800 dark:text-gray-200'}"
                                    placeholder="0.00"
                                    value="\${row.custo_unitario !== null ? row.custo_unitario : ''}">
                                <button onclick="CustosProdutos.saveCost(\${row.id})" class="px-2 py-1.5 bg-nexo-500 hover:bg-nexo-600 text-white rounded-lg text-xs transition-colors shrink-0" title="Salvar">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </button>
                            </div>
                        </td>\`;
                    } else if (col.type === 'currency') {
                        html += \`<td class="px-3 py-2 text-right text-xs whitespace-nowrap">\${formatCurrency(row[col.key])}</td>\`;
                    } else if (col.type === 'number') {
                        html += \`<td class="px-3 py-2 text-center text-xs whitespace-nowrap">\${row[col.key] ?? '-'}</td>\`;
                    } else {
                        const val = row[col.key] || '-';
                        const truncate = col.key === 'cliente' || col.key === 'produto' ? 'max-w-[200px] truncate' : '';
                        html += \`<td class="px-3 py-2 text-xs whitespace-nowrap \${truncate}" title="\${val}">\${val}</td>\`;
                    }
                });
                html += '</tr>';
            });
            tbody.innerHTML = html;
        }

        renderPagination('nulosPaginationControls', nulosState, renderNulosGrid);
    }`;

content = content.replace(nulosGridRegex, newNulosGrid);


// REWRITE renderHistGrid
const histGridRegex = /function renderHistGrid\(\) \{[\s\S]*?renderPagination\('histPaginationControls', histState, renderHistGrid\);\n    \}/;
const newHistGrid = `function renderHistGrid() {
        const tbody = document.getElementById('histTableBody');
        const data = histState.filteredData;
        const start = (histState.page - 1) * histState.perPage;
        const end = start + histState.perPage;
        const pageData = data.slice(start, end);

        if (pageData.length === 0) {
            tbody.innerHTML = \`<tr><td colspan="\${HIST_COLUMNS.length}" class="p-8 text-center text-steel-400">
                <div class="flex flex-col items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-steel-300 dark:text-steel-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p class="text-sm">Nenhum registro encontrado.</p>
                </div>
            </td></tr>\`;
        } else {
            let html = '';
            pageData.forEach((row, idx) => {
                const isEven = idx % 2 === 0;
                let isDevolucao = row.tipo_nota && row.tipo_nota.toUpperCase().includes('DEVOLU');
                html += \`<tr class="\${isEven ? '' : 'bg-gray-50/50 dark:bg-steel-700/10'} hover:bg-nexo-50/30 dark:hover:bg-steel-700/30 transition-colors">\`;
                HIST_COLUMNS.forEach(col => {
                    if (col.key === 'data_emissao') {
                        html += \`<td class="px-3 py-2 text-center text-[11px] whitespace-nowrap">\${formatDate(row[col.key])}</td>\`;
                    } else if (col.key === 'custo_total') {
                        let renderCustoTotal = formatCurrency(row[col.key]);
                        if (isDevolucao && row[col.key]) {
                            renderCustoTotal = \`(\${formatCurrency(row[col.key])})\`;
                        }
                        html += \`<td class="px-3 py-2 text-right text-[11px] whitespace-nowrap font-medium text-nexo-600 dark:text-nexo-400">\${renderCustoTotal}</td>\`;
                    } else if (col.type === 'currency') {
                        const val = parseFloat(row[col.key]) || 0;
                        html += \`<td class="px-3 py-2 text-right text-[11px] whitespace-nowrap">\${formatCurrency(val)}</td>\`;
                    } else if (col.type === 'number') {
                        const val = row[col.key];
                        html += \`<td class="px-3 py-2 text-center text-[11px] whitespace-nowrap">\${val ?? '-'}</td>\`;
                    } else {
                        const val = row[col.key] || '-';
                        const truncate = (col.key === 'cliente' || col.key === 'produto') ? 'max-w-[180px] truncate' : '';
                        html += \`<td class="px-3 py-2 text-[11px] whitespace-nowrap \${truncate}" title="\${val}">\${val}</td>\`;
                    }
                });
                html += '</tr>';
            });
            tbody.innerHTML = html;
        }

        renderPagination('histPaginationControls', histState, renderHistGrid);
    }`;

content = content.replace(histGridRegex, newHistGrid);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully replaced grid render functions in custos_produtos.js');
