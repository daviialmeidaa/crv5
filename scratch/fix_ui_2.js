const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/custos_produtos.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Inject formatDate if not present
if (!content.includes('function formatDate(')) {
    const formatDateFn = `
    function formatDate(val) {
        if (val === '-' || !val) return '-';
        if (typeof val === 'string' && val.includes('T')) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            }
        }
        const parts = String(val).split('T')[0].split('-');
        if (parts.length === 3) return \`\${parts[2]}/\${parts[1]}/\${parts[0]}\`;
        return val;
    }
`;
    // Insert after 'const CustosProdutos = (() => {'
    content = content.replace(/const CustosProdutos = \(\(\) => \{/, 'const CustosProdutos = (() => {' + formatDateFn);
}

// 2. Rewrite renderGenericHeader
const newRenderGenericHeader = `function renderGenericHeader(theadId, columns, stateObj, sortCallback, filterCallback) {
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

            html += \`
                <th class="px-2 py-1.5 2xl:px-3 2xl:py-2.5 border-b border-gray-200 dark:border-steel-700 whitespace-nowrap select-none relative text-center align-middle bg-nexo-600 dark:bg-steel-900 \${col.width || ''}">
                    <div class="flex items-center justify-center cursor-pointer hover:text-white/80 transition-colors w-full px-4" onclick="\${sortCallback}('\${col.key}')">
                        \${col.label} <span class="text-[10px] ml-1 opacity-50">\${sortIcon}</span>
                    </div>
                    <button onclick="\${filterCallback}(event, '\${col.key}')" class="p-1 rounded focus:outline-none absolute right-2 top-1/2 -translate-y-1/2 \${filterColor}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </th>
            \`;
        });
        html += '</tr>';
        thead.innerHTML = html;
    }`;
content = content.replace(/function renderGenericHeader\([\s\S]*?thead\.innerHTML = html;\n    \}/, newRenderGenericHeader);

// 3. Rewrite renderPagination
const newRenderPagination = `function renderPagination(containerId, state, renderFn) {
        const controls = document.getElementById(containerId);
        if (!controls) return;
        
        const totalPages = Math.ceil(state.filteredData.length / state.perPage) || 1;
        
        let html = '';

        // First button
        html += \`<button onclick="CustosApp._goToPage('\${containerId}', 1)" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" \${state.page === 1 ? 'disabled' : ''} title="Primeira Página">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>
                 </button>\`;

        // Prev button
        html += \`<button onclick="CustosApp._goToPage('\${containerId}', \${state.page - 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" \${state.page === 1 ? 'disabled' : ''} title="Anterior">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                 </button>\`;

        // Simplificação de botões (mostra 5 páginas no máx)
        let startPage = Math.max(1, state.page - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

        for (let i = startPage; i <= endPage; i++) {
            if (i === state.page) {
                html += \`<button class="px-3 py-1 text-sm font-medium rounded bg-nexo-50 dark:bg-nexo-900/30 text-nexo-600 dark:text-nexo-400">\${i}</button>\`;
            } else {
                html += \`<button onclick="CustosApp._goToPage('\${containerId}', \${i})" class="px-3 py-1 text-sm font-medium rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700">\${i}</button>\`;
            }
        }

        // Next button
        html += \`<button onclick="CustosApp._goToPage('\${containerId}', \${state.page + 1})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" \${state.page === totalPages || totalPages === 0 ? 'disabled' : ''} title="Próxima">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
                 </button>\`;

        // Last button
        html += \`<button onclick="CustosApp._goToPage('\${containerId}', \${totalPages})" class="p-1 rounded text-steel-500 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors disabled:opacity-50" \${state.page === totalPages || totalPages === 0 ? 'disabled' : ''} title="Última Página">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414zm6 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                 </button>\`;

        controls.innerHTML = html;
        
        // Update total records info if applicable
        const infoId = containerId.replace('Controls', 'Info');
        const info = document.getElementById(infoId);
        if (info) {
            const start = state.filteredData.length === 0 ? 0 : ((state.page - 1) * state.perPage) + 1;
            const end = Math.min(state.page * state.perPage, state.filteredData.length);
            info.textContent = \`Mostrando \${start} a \${end} de \${state.filteredData.length} registros\`;
        }
    }`;
content = content.replace(/function renderPagination\([\s\S]*?container\.innerHTML = html;\n    \}/, newRenderPagination);


// 4. Remove 'text-red-500' for devolucao from renderHistGrid
content = content.replace(/text-red-500' : 'text-nexo-600 dark:text-nexo-400'/, "text-nexo-600 dark:text-nexo-400' : 'text-nexo-600 dark:text-nexo-400'");


fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully applied UI fixes to custos_produtos.js');
