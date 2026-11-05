/**
 * CellSelector — Módulo reutilizável de seleção de células (Estilo Excel)
 * Suporta Ctrl+Click individual e Ctrl+Click+Arrasto (retângulo).
 * Exibe barra flutuante com Contagem, Soma e Média.
 *
 * Uso:
 *   CellSelector.init('meuTableBodyId');
 *   // Para limpar ao trocar de aba/paginar:
 *   CellSelector.clear();
 */
const CellSelector = (function () {
    const selectedCells = new Set();
    let isDragging = false;
    let dragStartCell = null;
    let tbodyId = null;

    const SEL_CLASSES = ['ring-2', 'ring-nexo-500/50', 'bg-nexo-50/50', 'dark:bg-nexo-900/20'];

    function getCellId(td) {
        return `${td.closest('tr').rowIndex}-${td.cellIndex}`;
    }

    function selectCell(td) {
        const id = getCellId(td);
        if (!selectedCells.has(id)) {
            selectedCells.add(id);
            td.classList.add(...SEL_CLASSES);
        }
    }

    function deselectCell(td) {
        selectedCells.delete(getCellId(td));
        td.classList.remove(...SEL_CLASSES);
    }

    function getCellsInRect(startTd, endTd, tbody) {
        const r1 = startTd.closest('tr').rowIndex, c1 = startTd.cellIndex;
        const r2 = endTd.closest('tr').rowIndex, c2 = endTd.cellIndex;
        const rMin = Math.min(r1, r2), rMax = Math.max(r1, r2);
        const cMin = Math.min(c1, c2), cMax = Math.max(c1, c2);
        const cells = [];
        const rows = tbody.rows;
        for (let i = 0; i < rows.length; i++) {
            const tr = rows[i];
            if (tr.rowIndex >= rMin && tr.rowIndex <= rMax) {
                for (let j = cMin; j <= cMax; j++) {
                    const cell = tr.cells[j];
                    if (cell) cells.push(cell);
                }
            }
        }
        return cells;
    }

    function clear() {
        const tbody = tbodyId ? document.getElementById(tbodyId) : null;
        if (tbody) {
            tbody.querySelectorAll('td.ring-2').forEach(td => td.classList.remove(...SEL_CLASSES));
        }
        selectedCells.clear();
        updateBar();
    }

    function updateBar() {
        const bar = document.getElementById('selectionSumBar');
        if (!bar) return;

        if (selectedCells.size === 0) {
            bar.classList.add('hidden');
            bar.classList.remove('flex');
            return;
        }

        const tbody = tbodyId ? document.getElementById(tbodyId) : null;
        if (!tbody) return;

        const numericValues = [];

        selectedCells.forEach(cellId => {
            const [rowIdx, colIdx] = cellId.split('-').map(Number);
            const row = tbody.querySelector(`tr:nth-child(${rowIdx})`);
            if (!row) return;
            const td = row.children[colIdx];
            if (!td) return;

            const rawText = td.textContent.trim();
            let numVal = null;
            if (rawText.includes('R$')) {
                numVal = parseFloat(rawText.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.'));
            } else {
                numVal = parseFloat(rawText.replace(/\./g, '').replace(',', '.'));
            }
            if (!isNaN(numVal)) numericValues.push(numVal);
        });

        const sum = numericValues.reduce((a, b) => a + b, 0);
        const avg = numericValues.length > 0 ? sum / numericValues.length : 0;

        const elCount = document.getElementById('selCount');
        const elSum = document.getElementById('selSum');
        const elAvg = document.getElementById('selAvg');
        if (elCount) elCount.textContent = selectedCells.size;
        if (elSum) elSum.textContent = numericValues.length > 0 ? sum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-';
        if (elAvg) elAvg.textContent = numericValues.length > 0 ? avg.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-';

        bar.classList.remove('hidden');
        bar.classList.add('flex');
    }

    function init(tableBodyId) {
        tbodyId = tableBodyId;

        // Injeta a barra de soma se não existir
        if (!document.getElementById('selectionSumBar')) {
            const bar = document.createElement('div');
            bar.id = 'selectionSumBar';
            bar.className = 'hidden fixed bottom-12 right-6 z-50 bg-steel-800 dark:bg-steel-900 text-white rounded-xl shadow-2xl border border-steel-700 px-5 py-3 items-center gap-5 text-sm font-medium';
            bar.style.backdropFilter = 'blur(12px)';
            bar.innerHTML = `
                <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-nexo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M4 12h8m-8 5h16" />
                    </svg>
                    <span class="text-steel-400">Contagem:</span>
                    <span id="selCount" class="text-white font-semibold">0</span>
                </div>
                <div class="w-px h-5 bg-steel-600"></div>
                <div class="flex items-center gap-2">
                    <span class="text-steel-400">Soma:</span>
                    <span id="selSum" class="text-nexo-400 font-semibold">R$ 0,00</span>
                </div>
                <div class="w-px h-5 bg-steel-600"></div>
                <div class="flex items-center gap-2">
                    <span class="text-steel-400">Média:</span>
                    <span id="selAvg" class="text-emerald-400 font-semibold">R$ 0,00</span>
                </div>
            `;
            document.body.appendChild(bar);
        }

        const tbody = document.getElementById(tableBodyId);
        if (!tbody) return;

        // Interceptar wheel para evitar zoom do navegador com Ctrl e forçar scroll
        tbody.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const scrollContainer = tbody.closest('.custom-scrollbar') || tbody.closest('.overflow-auto') || window;
                if (scrollContainer === window) {
                    window.scrollBy({ top: e.deltaY, left: e.deltaX });
                } else {
                    scrollContainer.scrollTop += e.deltaY;
                    scrollContainer.scrollLeft += e.deltaX;
                }
            }
        }, { passive: false });

        // Função de atualização de seleção refatorada
        function updateDragSelection(td) {
            if (!isDragging || !dragStartCell) return;
            
            // Limpar seleção de arrasto anterior
            tbody.querySelectorAll('td[data-drag-sel]').forEach(cell => {
                cell.removeAttribute('data-drag-sel');
                if (!cell.hasAttribute('data-pre-sel')) deselectCell(cell);
            });

            // Selecionar retângulo
            getCellsInRect(dragStartCell, td, tbody).forEach(cell => {
                cell.setAttribute('data-drag-sel', '1');
                selectCell(cell);
            });
            updateBar();
        }

        // Mousedown: iniciar seleção ou toggle individual
        tbody.addEventListener('mousedown', (e) => {
            const td = e.target.closest('td');
            if (!td) return;
            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('select')) return;
            if (!(e.ctrlKey || e.metaKey)) return;

            e.preventDefault();
            e.stopPropagation();

            isDragging = true;
            dragStartCell = td;

            // Marcar existentes como pré-selecionadas
            tbody.querySelectorAll('td.ring-2').forEach(c => c.setAttribute('data-pre-sel', '1'));

            if (selectedCells.has(getCellId(td))) {
                deselectCell(td);
            } else {
                selectCell(td);
            }
            updateBar();
        });

        // Mouseover: arrasto retangular
        tbody.addEventListener('mouseover', (e) => {
            if (!isDragging || !dragStartCell) return;
            if (!(e.ctrlKey || e.metaKey)) { isDragging = false; return; }

            const td = e.target.closest('td');
            if (!td) return;

            updateDragSelection(td);
        });

        // Mouseup: finalizar arrasto
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                const t = document.getElementById(tableBodyId);
                if (t) {
                    t.querySelectorAll('td[data-drag-sel]').forEach(td => td.removeAttribute('data-drag-sel'));
                    t.querySelectorAll('td[data-pre-sel]').forEach(td => td.removeAttribute('data-pre-sel'));
                }
            }
        });

        // Click fora: limpar
        document.addEventListener('click', (e) => {
            if (!e.ctrlKey && !e.metaKey && !e.target.closest('#selectionSumBar') && selectedCells.size > 0) {
                clear();
            }
        });

        // Escape ou soltar Ctrl com seleção ativa não deve limpar imediatamente,
        // mas deve parar o drag. O drag já é parado no mouseup ou mouseover sem ctrl.
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && selectedCells.size > 0) clear();
        });
    }

    return { init, clear };
})();
