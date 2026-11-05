(function (root) {
    'use strict';
    class Pagination {
        constructor(grid) {
            this.grid = grid;
        }
        static slice(rows, state) {
            state.limit = Math.max(1, Math.floor(Number(state.limit)) || 25);
            state.total = rows.length;
            state.current = Math.min(
                Math.max(1, Math.floor(Number(state.current)) || 1),
                Math.max(1, Math.ceil(rows.length / state.limit))
            );
            const start = (state.current - 1) * state.limit;
            return rows.slice(start, start + state.limit);
        }
        render() {
            const grid = this.grid,
                { current, limit, total } = grid.state.pagination;
            const totalPages = Math.ceil(total / limit),
                info = grid.element('infoId'),
                controls = grid.element('paginationId');
            if (info)
                info.textContent = `Mostrando ${total ? (current - 1) * limit + 1 : 0} a ${Math.min(current * limit, total)} de ${total} ${grid.options.recordLabel || 'registros'}`;
            if (!controls) return;
            controls.replaceChildren();
            const paths = [
                'M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z',
                'M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z',
                'M7.293 14.707a1 1 0 010 1.414L10.586 10l-3.293 3.293a1 1 0 011.414 1.414l4-4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414z',
                'M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414zm6 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z'
            ];
            const add = (page, label, icon, disabled = false, active = false) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.title = label;
                button.disabled = disabled;
                button.className = icon !== null ? 'hub-grid-page-arrow' : 'hub-grid-page-number';
                if (active) {
                    button.classList.add('is-active');
                    button.setAttribute('aria-current', 'page');
                }
                button.setAttribute('aria-label', label);
                if (icon !== null)
                    button.innerHTML = `<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="${paths[icon]}" clip-rule="evenodd"/></svg>`;
                else button.textContent = String(page);
                button.addEventListener('click', () => grid.setPage(page));
                controls.appendChild(button);
            };
            add(1, 'Primeira Página', 0, current === 1);
            add(current - 1, 'Anterior', 1, current === 1);
            let start = Math.max(1, current - 2),
                end = Math.min(totalPages, start + 4);
            if (end - start < 4) start = Math.max(1, end - 4);
            for (let page = start; page <= end; page++)
                add(page, `Página ${page}`, null, false, page === current);
            add(current + 1, 'Próxima', 2, !totalPages || current === totalPages);
            add(totalPages, 'Última Página', 3, !totalPages || current === totalPages);
        }
    }
    (root.HubDataGridParts ||= {}).Pagination = Pagination;
    if (typeof module !== 'undefined' && module.exports) module.exports = Pagination;
})(globalThis);
