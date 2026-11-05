(function (root) {
    'use strict';
    const V = root.HubDataGridParts.values;
    let active = null;
    class Selection {
        constructor(tbody) {
            this.tbody = tbody;
            this.cells = new Set();
            this.dragging = false;
            this.abort = new AbortController();
            const signal = this.abort.signal,
                interactive = (target) =>
                    target.closest('button,a,input,select,textarea,[contenteditable="true"]');
            tbody.addEventListener(
                'mousedown',
                (event) => {
                    if (event.button !== 0) return;
                    const cell = event.target.closest('td');
                    if (
                        !(event.ctrlKey || event.metaKey) ||
                        !cell ||
                        interactive(event.target) ||
                        cell.parentElement.dataset.gridEmpty
                    )
                        return;
                    event.preventDefault();
                    event.stopPropagation();
                    if (active && active !== this) active.clear();
                    active = this;
                    this.start = cell;
                    this.dragging = true;
                    this.base = new Set(this.cells);
                    if (this.cells.has(cell)) this.cells.delete(cell);
                    else this.cells.add(cell);
                    this.paint();
                },
                { signal }
            );
            tbody.addEventListener(
                'mouseover',
                (event) => {
                    if (!this.dragging) return;
                    if (!(event.ctrlKey || event.metaKey)) {
                        this.dragging = false;
                        return;
                    }
                    const cell = event.target.closest('td');
                    if (!cell || !tbody.contains(cell)) return;
                    const r1 = this.start.parentElement.sectionRowIndex,
                        r2 = cell.parentElement.sectionRowIndex;
                    const c1 = this.start.cellIndex,
                        c2 = cell.cellIndex;
                    this.cells = new Set(this.base);
                    for (let row = Math.min(r1, r2); row <= Math.max(r1, r2); row++)
                        for (let col = Math.min(c1, c2); col <= Math.max(c1, c2); col++) {
                            const td = tbody.rows[row]?.cells[col];
                            if (td && !td.querySelector('input,button,select')) this.cells.add(td);
                        }
                    this.paint();
                },
                { signal }
            );
            tbody.addEventListener(
                'click',
                (event) => {
                    if ((event.ctrlKey || event.metaKey) && !interactive(event.target)) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                },
                { capture: true, signal }
            );
            tbody.addEventListener(
                'wheel',
                (event) => {
                    if (!(event.ctrlKey || event.metaKey)) return;
                    event.preventDefault();
                    const scroll = tbody.closest('.hub-grid-scroll,.table-container,.overflow-auto');
                    if (scroll) {
                        scroll.scrollTop += event.deltaY;
                        scroll.scrollLeft += event.deltaX;
                    }
                },
                { passive: false, signal }
            );
            document.addEventListener(
                'mouseup',
                () => {
                    this.dragging = false;
                    this.base = null;
                },
                { signal }
            );
            document.addEventListener(
                'click',
                (event) => {
                    if (
                        active === this &&
                        !event.ctrlKey &&
                        !event.metaKey &&
                        !event.target.closest('#selectionSumBar')
                    )
                        this.clear();
                },
                { signal }
            );
            document.addEventListener(
                'keydown',
                (event) => {
                    if (active === this && event.key === 'Escape') this.clear();
                },
                { signal }
            );
        }
        clear() {
            this.cells.forEach((cell) => cell.classList.remove('hub-grid-cell-selected'));
            this.cells.clear();
            this.dragging = false;
            if (active === this) Selection.bar().classList.add('hidden');
        }
        paint() {
            this.tbody.querySelectorAll('.hub-grid-cell-selected').forEach((cell) => {
                if (!this.cells.has(cell)) cell.classList.remove('hub-grid-cell-selected');
            });
            this.cells.forEach((cell) => cell.classList.add('hub-grid-cell-selected'));
            const bar = Selection.bar();
            if (!this.cells.size) {
                bar.classList.add('hidden');
                return;
            }
            const numbers = [...this.cells]
                .map((cell) =>
                    cell.dataset.gridNumeric === 'none'
                        ? null
                        : cell.dataset.gridNumeric !== undefined
                          ? Number(cell.dataset.gridNumeric)
                          : V.selectionNumber(cell.textContent)
                )
                .filter((value) => value !== null && Number.isFinite(value));
            const sum = numbers.reduce((total, value) => total + value, 0);
            bar.querySelector('#selCount').textContent = this.cells.size;
            bar.querySelector('#selSum').textContent = numbers.length ? V.currency(sum) : '-';
            bar.querySelector('#selAvg').textContent = numbers.length
                ? V.currency(sum / numbers.length)
                : '-';
            bar.classList.remove('hidden');
        }
        destroy() {
            this.clear();
            this.abort.abort();
            if (active === this) active = null;
        }
        static clear() {
            active?.clear();
        }
        static bar() {
            let bar = document.getElementById('selectionSumBar');
            if (!bar) {
                bar = document.createElement('div');
                bar.id = 'selectionSumBar';
                bar.className = 'hub-grid-selection-bar hidden';
                bar.setAttribute('role', 'status');
                bar.setAttribute('aria-live', 'polite');
                bar.innerHTML =
                    '<div><span>Contagem:</span><strong id="selCount">0</strong></div><div><span>Soma:</span><strong id="selSum">-</strong></div><div><span>Média:</span><strong id="selAvg">-</strong></div>';
                document.body.appendChild(bar);
            }
            return bar;
        }
    }
    root.HubDataGridParts.Selection = Selection;
})(globalThis);
