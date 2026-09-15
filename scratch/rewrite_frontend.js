const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/custos_produtos.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Rewrite saveCost
const saveCostRegex = /async function saveCost\(id\) \{[\s\S]*?\}\n    \}/;
const newSaveCost = `async function saveCost(id) {
        const input = document.getElementById(\`input-custo-\${id}\`);
        if (!input) return;

        let rawVal = input.value.trim();
        rawVal = rawVal.replace('R$', '').replace(/\\s/g, '').replace(/\\./g, '').replace(',', '.');
        const custoNum = parseFloat(rawVal);
        
        if (isNaN(custoNum) || custoNum <= 0) {
            input.classList.add('border-red-500');
            input.focus();
            return;
        }

        // Find the record to get empresa, nota, produto, lote
        const record = nulosState.rawData.find(r => r.id === id);
        if (!record) return;

        input.disabled = true;
        try {
            const payload = {
                empresa: record.empresa,
                nota_fiscal: record.nota_fiscal,
                cod_produto: record.cod_produto,
                lote: record.lote,
                custo_unitario: custoNum
            };

            const resp = await fetch(\`/api/financeiro/custos/save-batch\`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) throw new Error('Falha ao salvar');

            // Success — remove ALL rows that match from the list
            nulosState.rawData = nulosState.rawData.filter(r => 
                !(r.empresa === record.empresa && r.nota_fiscal === record.nota_fiscal && r.cod_produto === record.cod_produto && r.lote === record.lote)
            );
            nulosState.filteredData = nulosState.filteredData.filter(r => 
                !(r.empresa === record.empresa && r.nota_fiscal === record.nota_fiscal && r.cod_produto === record.cod_produto && r.lote === record.lote)
            );

            const badge = document.getElementById('nullCostsBadge');
            badge.textContent = nulosState.filteredData.length;
            if (nulosState.filteredData.length === 0) badge.classList.add('hidden');

            renderNulosGrid();

        } catch (err) {
            console.error('Erro ao salvar custo:', err);
            input.disabled = false;
            input.classList.add('border-red-500');
        }
    }`;
content = content.replace(saveCostRegex, newSaveCost);

// 2. Remove the year filter interaction for Histórico tab.
// In setupYearFilter(), it adds event listener to globalYearSelect.
// We can just hide globalYearSelect when the Historico tab is active.
// In selectTab(tabId), if tabId === 'historico', hide the year select container.
// Wait, the UI has a general #globalYearSelect and #globalMonthSelect.
const selectTabRegex = /function selectTab\(tabId\) \{[\s\S]*?\}\n    \}/;
const selectTabReplacement = `function selectTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.classList.add('text-nexo-500', 'border-nexo-500');
                btn.classList.remove('text-steel-400', 'border-transparent', 'hover:text-steel-600', 'hover:border-steel-300');
            } else {
                btn.classList.remove('text-nexo-500', 'border-nexo-500');
                btn.classList.add('text-steel-400', 'border-transparent', 'hover:text-steel-600', 'hover:border-steel-300');
            }
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            if (content.id === \`tab-\${tabId}\`) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });

        // Hide year and month filters if on Historico, since it shows all
        const yearSelect = document.getElementById('globalYearSelect');
        const monthSelect = document.getElementById('globalMonthSelect');
        const syncBtn = document.getElementById('btnSync');

        if (tabId === 'historico') {
            if (yearSelect) yearSelect.parentElement.classList.add('hidden');
            if (monthSelect) monthSelect.parentElement.classList.add('hidden');
            if (syncBtn) syncBtn.classList.add('hidden');
            loadHistorico();
        } else {
            if (yearSelect) yearSelect.parentElement.classList.remove('hidden');
            if (monthSelect) monthSelect.parentElement.classList.remove('hidden');
            if (syncBtn) syncBtn.classList.remove('hidden');
        }
    }`;
content = content.replace(selectTabRegex, selectTabReplacement);

// 3. loadHistorico doesn't need to pass the year anymore.
const loadHistRegex = /async function loadHistorico\(\) \{[\s\S]*?\}\n    \}/;
const newLoadHist = `async function loadHistorico() {
        const tbody = document.getElementById('histTableBody');
        tbody.innerHTML = \`<tr><td colspan="\${HIST_COLUMNS.length}" class="p-8 text-center"><div class="inline-block animate-spin w-6 h-6 border-4 border-nexo-500 border-t-transparent rounded-full"></div></td></tr>\`;

        try {
            const resp = await fetch('/api/financeiro/custos/historico', {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            if (!resp.ok) throw new Error('Falha na API');
            
            const data = await resp.json();
            
            histState.rawData = data;
            histState.filteredData = [...data];
            histState.page = 1;

            applyHistFilters();
        } catch (err) {
            console.error('Erro ao carregar histórico:', err);
            tbody.innerHTML = \`<tr><td colspan="\${HIST_COLUMNS.length}" class="p-8 text-center text-red-500">Erro ao carregar histórico.</td></tr>\`;
        }
    }`;
content = content.replace(loadHistRegex, newLoadHist);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Rewritten custos_produtos.js frontend');
