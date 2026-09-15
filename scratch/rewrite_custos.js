const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/custos_produtos.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Appending Filter Logic before exportToExcel
const filterLogic = `
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
        modal.style.top = \`\${rect.bottom + window.scrollY + 8}px\`;
        modal.style.left = \`\${left}px\`;

        modal.innerHTML = \`
            <div class="p-3 border-b border-gray-100 dark:border-steel-700">
                <input type="text" id="filterSearchInput" placeholder="Pesquisar..." class="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-steel-900 border border-gray-200 dark:border-steel-600 rounded outline-none focus:ring-1 focus:ring-nexo-500 text-steel-700 dark:text-gray-200">
            </div>
            <div class="flex-1 max-h-48 overflow-y-auto p-2 custom-scrollbar" id="filterCheckboxList"></div>
            <div class="p-3 border-t border-gray-100 dark:border-steel-700 flex justify-between bg-gray-50 dark:bg-steel-800/50 rounded-b-lg">
                <button id="btnClearFilter" class="text-xs text-steel-500 hover:text-steel-700 dark:hover:text-gray-300 font-medium">Limpar</button>
                <button id="btnApplyFilter" class="text-xs bg-nexo-600 hover:bg-nexo-700 text-white px-3 py-1.5 rounded font-medium shadow-sm">Aplicar</button>
            </div>
        \`;
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
            selectAllDiv.innerHTML = \`
                <input type="checkbox" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" \${allChecked ? 'checked' : ''}>
                <span class="font-medium text-steel-700 dark:text-gray-300">(Selecionar Tudo)</span>
            \`;
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
                    yHeader.innerHTML = \`
                        <span class="w-4 text-center text-steel-400 font-bold transition-transform transform select-none" style="font-size: 12px;">+</span>
                        <input type="checkbox" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" \${yearAllChecked ? 'checked' : ''}>
                        <span class="font-semibold text-steel-700 dark:text-gray-300 text-xs">\${year}</span>
                    \`;
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
                        mHeader.innerHTML = \`
                            <span class="w-4 text-center text-steel-400 font-bold transition-transform transform select-none" style="font-size: 12px;">+</span>
                            <input type="checkbox" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" \${monthAllChecked ? 'checked' : ''}>
                            <span class="text-steel-600 dark:text-gray-400 text-xs">\${mName}</span>
                        \`;
                        const mCb = mHeader.querySelector('input');
                        mCb.indeterminate = monthAnyChecked && !monthAllChecked;

                        const dContainer = document.createElement('div');
                        dContainer.className = 'hidden pl-3 border-l border-gray-100 dark:border-steel-700 ml-2.5 mt-0.5';
                        
                        const monthKey = \`\${year}-\${month}\`;
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
                            dHeader.innerHTML = \`
                                <div class="w-3"></div>
                                <input type="checkbox" value="\${val}" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" \${isChecked ? 'checked' : ''}>
                                <span class="truncate text-steel-500 dark:text-gray-500 text-[11px]">\${displayVal}</span>
                            \`;
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
                    div.innerHTML = \`<input type="checkbox" value="\${val}" class="rounded text-nexo-600 focus:ring-nexo-500 cursor-pointer" \${isChecked ? 'checked' : ''}><span class="truncate text-steel-600 dark:text-gray-400">\${display}</span>\`;
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
        
        let html = '<tr>';
        columns.forEach(col => {
            let sortIcon = '';
            if (stateObj.sortCol === col.key) {
                sortIcon = stateObj.sortDir === 'asc' ? '↑' : '↓';
            }
            
            const hasFilter = stateObj.filters[col.key] && stateObj.filters[col.key].size > 0 && !stateObj.filters[col.key].has('__NONE__');
            const filterIconColor = hasFilter ? 'text-nexo-600 dark:text-nexo-400 font-bold' : 'text-steel-400 dark:text-steel-500 hover:text-nexo-500';

            html += \`
                <th class="relative px-3 py-3 text-left text-xs font-semibold text-steel-700 dark:text-gray-300 uppercase tracking-wider \${col.width || ''} cursor-pointer group bg-gray-50 dark:bg-steel-800" onclick="\${sortCallback}('\${col.key}')">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1">
                            \${col.label} <span class="text-nexo-500 ml-1">\${sortIcon}</span>
                        </div>
                        <svg onclick="\${filterCallback}(event, '\${col.key}')" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 \${filterIconColor} z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                    </div>
                </th>
            \`;
        });
        html += '</tr>';
        thead.innerHTML = html;
    }
`;

content = content.replace(/function exportToExcel/g, filterLogic + '\n    function exportToExcel');

// 2. Remove old renderNulosHeader and replace its logic
const nulosHeaderRegex = /function renderNulosHeader\(\) \{[\s\S]*?\}/;
content = content.replace(nulosHeaderRegex, `
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
`);

// 3. Remove old renderHistHeader and replace its logic
const histHeaderRegex = /function renderHistHeader\(\) \{[\s\S]*?\}/;
content = content.replace(histHeaderRegex, `
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
`);

// 4. Update Nulos row rendering
const nulosGridRowReplace = `
            nulosState.filteredData.slice(start, end).forEach(row => {
                let displayCust = row.custo_unitario !== null ? row.custo_unitario : '';
                let isDevolucao = row.tipo_nota === 'DEVOLUÇÃO RETORNO DE VENDA';

                html += \`<tr class="hover:bg-gray-50 dark:hover:bg-steel-800 transition-colors border-b border-gray-100 dark:border-steel-800">
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-xs">\${row.empresa || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap font-medium text-steel-800 dark:text-gray-200 text-xs">\${row.nota_fiscal || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-xs truncate max-w-xs" title="\${row.cliente || ''}">\${row.cliente || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-xs">\${row.tipo_nota || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-xs">\${row.cod_produto || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-[11px] truncate max-w-sm" title="\${row.produto || ''}">\${row.produto || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-xs">\${row.lote || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-[11px] truncate max-w-xs" title="\${row.classificacao || ''}">\${row.classificacao || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-right text-steel-700 dark:text-gray-300 text-xs">\${row.quantidade || ''}</td>
                    <td class="px-3 py-2.5 text-right">
                        <div class="flex items-center justify-end">
                            <span class="mr-1 text-steel-400 text-[10px]">\${isDevolucao ? '(-)' : ''} R$</span>
                            <input type="number" step="0.01" 
                                id="custo_\${row.id}"
                                class="w-20 text-right px-2 py-1 text-xs bg-white dark:bg-steel-900 border border-gray-300 dark:border-steel-600 rounded focus:ring-1 focus:ring-nexo-500 \${isDevolucao ? 'text-red-500 dark:text-red-400 font-bold' : 'text-steel-800 dark:text-gray-100'}"
                                value="\${displayCust}">
                            <button onclick="CustosProdutos.saveCost(\${row.id})" class="ml-2 bg-nexo-600 hover:bg-nexo-700 text-white p-1 rounded transition-colors shadow-sm" title="Salvar">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>\`;
            });
`;
content = content.replace(/nulosState\.filteredData\.slice\(start, end\)\.forEach\(row => \{[\s\S]*?\}\);/, nulosGridRowReplace);


// 5. Update Hist row rendering
const histGridRowReplace = `
            histState.filteredData.slice(start, end).forEach(row => {
                let isDevolucao = row.tipo_nota === 'DEVOLUÇÃO RETORNO DE VENDA';
                
                // Tratar notação contábil para devoluções: (-X)
                let renderCustoTotal = formatCurrency(row.custo_total);
                if (isDevolucao && row.custo_total) {
                    renderCustoTotal = \`(\${formatCurrency(row.custo_total)})\`;
                }
                
                html += \`<tr onclick="if(event.ctrlKey||event.metaKey)return;" class="hover:bg-gray-50 dark:hover:bg-steel-800 transition-colors border-b border-gray-100 dark:border-steel-800">
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-[11px]">\${row.empresa || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-[11px]">\${formatDate(row.data_emissao)}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap font-medium text-steel-800 dark:text-gray-200 text-xs">\${row.nota_fiscal || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-[10px] truncate max-w-[8rem]" title="\${row.tipo_nota || ''}">\${row.tipo_nota || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-[11px] truncate max-w-[10rem]" title="\${row.cliente || ''}">\${row.cliente || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-[11px]">\${row.cidade || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-[11px]">\${row.uf || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-[11px]">\${row.cod_produto || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-[10px] truncate max-w-[12rem]" title="\${row.produto || ''}">\${row.produto || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-[11px]">\${row.lote || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-[10px] truncate max-w-[8rem]" title="\${row.classificacao || ''}">\${row.classificacao || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-[10px] truncate max-w-[8rem]" title="\${row.fabricante || ''}">\${row.fabricante || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-steel-700 dark:text-gray-300 text-[11px]">\${row.unidade || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-right text-steel-700 dark:text-gray-300 text-[11px]">\${row.quantidade || ''}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-right text-steel-700 dark:text-gray-300 text-[11px]">\${formatCurrency(row.valor_unitario)}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-right text-steel-700 dark:text-gray-300 text-[11px]">\${formatCurrency(row.valor_total)}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-right text-steel-700 dark:text-gray-300 text-[11px]">\${formatCurrency(row.custo_unitario)}</td>
                    <td class="px-3 py-2.5 whitespace-nowrap text-right font-medium \${isDevolucao ? 'text-red-500' : 'text-nexo-600 dark:text-nexo-400'} text-xs">\${renderCustoTotal}</td>
                </tr>\`;
            });
`;
content = content.replace(/histState\.filteredData\.slice\(start, end\)\.forEach\(row => \{[\s\S]*?\}\);/, histGridRowReplace);


// 6. Update applyFilters logic
const applyNulosRegex = /function applyNulosFilters\(\) \{[\s\S]*?renderNulosGrid\(\);\n    \}/;
content = content.replace(applyNulosRegex, `function applyNulosFilters() {
        let result = nulosState.rawData.filter(r => {
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

        // Render Clear Filter button
        const activeFilters = Object.values(nulosState.filters).some(s => s.size > 0 && !s.has('__NONE__'));
        const actionsContainer = document.getElementById('nulosActions');
        if (actionsContainer) {
            let clearBtn = document.getElementById('nulosClearFilterBtn');
            if (activeFilters) {
                if (!clearBtn) {
                    clearBtn = document.createElement('button');
                    clearBtn.id = 'nulosClearFilterBtn';
                    clearBtn.className = 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30 rounded-lg px-3 py-1.5 text-xs font-medium mr-2 shadow-sm transition-colors';
                    clearBtn.textContent = 'Remover Filtros';
                    clearBtn.onclick = () => {
                        nulosState.filters = {};
                        applyNulosFilters();
                    };
                    actionsContainer.prepend(clearBtn);
                }
            } else if (clearBtn) {
                clearBtn.remove();
            }
        }

        renderNulosHeader();
        renderNulosGrid();
    }`);

const applyHistRegex = /function applyHistFilters\(\) \{[\s\S]*?renderHistGrid\(\);\n    \}/;
content = content.replace(applyHistRegex, `function applyHistFilters() {
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
    }`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated custos_produtos.js');
