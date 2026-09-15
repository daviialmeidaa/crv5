const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/custos_produtos.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Inject formatDate
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
    content = content.replace(/const CustosApp = \(\(\) => \{\n\s*'use strict';/, "const CustosApp = (() => {\n    'use strict';" + formatDateFn);
}

// 2. Fix saveCost reference
content = content.replace(/CustosProdutos\.saveCost/g, 'CustosApp.saveCost');

// 3. Inject applyNulosFilters if missing
if (!content.includes('function applyNulosFilters() {')) {
    const applyNulosStr = `
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
`;
    // Insert before openNulosFilterModal
    content = content.replace(/window\.openNulosFilterModal =/, applyNulosStr + '\n    window.openNulosFilterModal =');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed missing functions and references.');
