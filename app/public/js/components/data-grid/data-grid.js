(function (root) {
    'use strict';
    const P = root.HubDataGridParts,
        V = P.values;
    const instances = new WeakMap();
    class HubDataGrid {
        constructor(options) {
            this.tbody = document.getElementById(options.bodyId);
            if (!this.tbody) throw new Error(`Data Grid: tbody ${options.bodyId} não encontrado.`);
            if (instances.has(this.tbody)) throw new Error(`Data Grid ${options.bodyId} já inicializado.`);
            const container = this.tbody.closest('.hub-data-grid');
            this.options = options = {
                export: container?.dataset.gridExportEnabled !== 'false',
                pagination: container?.dataset.gridPaginationEnabled !== 'false',
                headerId: this.tbody.closest('table').tHead?.id,
                infoId: container?.querySelector('[data-grid-info]')?.id,
                paginationId: container?.querySelector('[data-grid-pagination]')?.id,
                pageSizeId: container?.querySelector('[data-grid-page-size]')?.id,
                clearId: container?.querySelector('[data-grid-clear]')?.id,
                exportId: container?.querySelector('[data-grid-export]')?.id,
                ...options
            };
            this.state = options.state || {};
            this.state.rawData ||= [];
            this.state.filteredData ||= [];
            this.state.viewData ||= [];
            this.state.filters ||= {};
            this.state.sort ||= { key: null, dir: 'asc' };
            this.state.pagination ||= { current: 1, limit: 25, total: 0 };
            this.abort = new AbortController();
            this.filters = new P.Filters(this);
            this.pagination = new P.Pagination(this);
            if (options.selection !== false) this.selection = new P.Selection(this.tbody);
            this.tbody.closest('table').classList.add('hub-data-grid-table');
            this.tbody.closest('.table-container')?.classList.add('hub-grid-scroll');
            instances.set(this.tbody, this);
            const signal = this.abort.signal;
            this.tbody.addEventListener(
                'click',
                (event) => {
                    if (
                        ((event.ctrlKey || event.metaKey) && options.selection !== false) ||
                        event.target.closest('button,a,input,select,textarea')
                    )
                        return;
                    const rowElement = event.target.closest('tr[data-grid-row]');
                    if (rowElement && options.onRowClick)
                        options.onRowClick(
                            this.state.viewData[Number(rowElement.dataset.gridRow)],
                            Number(rowElement.dataset.gridRow),
                            event
                        );
                },
                { signal }
            );
            if (options.onRowAuxClick)
                this.tbody.addEventListener(
                    'auxclick',
                    (event) => {
                        const row = event.target.closest('tr[data-grid-row]');
                        if (row)
                            options.onRowAuxClick(this.state.viewData[Number(row.dataset.gridRow)], event);
                    },
                    { signal }
                );
            const perPage = this.element('pageSizeId');
            if (perPage) {
                this.state.pagination.limit = Number(perPage.value) || this.state.pagination.limit;
                perPage.addEventListener(
                    'change',
                    () => {
                        this.state.pagination.limit = Number(perPage.value);
                        this.state.pagination.current = 1;
                        this.process();
                    },
                    { signal }
                );
            }
            const search = this.element('searchId');
            if (search)
                search.addEventListener(
                    'input',
                    () => {
                        this.state.pagination.current = 1;
                        this.process();
                    },
                    { signal }
                );
            const clear = this.element('clearId');
            if (clear) {
                clear.removeAttribute('onclick');
                clear.classList.add('hub-grid-clear');
                clear.addEventListener('click', () => this.clearFilters(), { signal });
            }
            const exportButton = this.element('exportId');
            if (exportButton && options.export !== false) {
                exportButton.removeAttribute('onclick');
                exportButton.addEventListener(
                    'click',
                    () => (this.canExport() ? (options.onExport ? options.onExport() : this.export()) : null),
                    { signal }
                );
            }
            this.renderHeaders();
            this.resizeObserver = new ResizeObserver(() => this.updateSticky());
            this.resizeObserver.observe(this.tbody.closest('table'));
        }
        static create(options) {
            return new HubDataGrid(options);
        }
        static mount(templateId, host, options) {
            const template = document.getElementById(templateId);
            if (typeof host === 'string') host = document.getElementById(host);
            if (!template?.content || !host)
                throw new Error('Template ou destino do Data Grid não encontrado.');
            host.replaceChildren(template.content.cloneNode(true));
            return new HubDataGrid({ bodyId: host.querySelector('tbody').id, ...options });
        }
        static get(bodyId) {
            return instances.get(typeof bodyId === 'string' ? document.getElementById(bodyId) : bodyId);
        }
        get columns() {
            return typeof this.options.columns === 'function' ? this.options.columns() : this.options.columns;
        }
        element(key) {
            return this.options[key] ? document.getElementById(this.options[key]) : null;
        }
        sourceRows() {
            const rows = this.options.getRows ? this.options.getRows() : this.state.rawData;
            const query =
                this.element('searchId')?.value || (this.options.getSearch ? this.options.getSearch() : '');
            return P.Filters.search(rows, query, this.options.searchKeys);
        }
        setData(rows, resetPage = false) {
            this.state.rawData = rows;
            if (resetPage) this.state.pagination.current = 1;
            this.process();
        }
        process() {
            this.filters.close();
            this.selection?.clear();
            const data = this.sourceRows().filter((row) =>
                P.Filters.matches(row, this.state.filters, this.columns)
            );
            this.state.filteredData = P.Sorting.apply(data, this.columns, this.state.sort, {
                tieBreaker: this.options.tieBreaker,
                defaultCompare: this.options.defaultCompare
            });
            if (this.options.pagination === false) {
                this.state.pagination.current = 1;
                this.state.pagination.total = this.state.filteredData.length;
                this.state.viewData = this.state.filteredData;
            } else {
                this.state.viewData = P.Pagination.slice(this.state.filteredData, this.state.pagination);
            }
            if (Number.isInteger(this.options.rowLimit) && this.options.rowLimit > 0) {
                this.state.viewData = this.state.viewData.slice(0, this.options.rowLimit);
            }
            this.render();
            this.options.onChange?.(this.state);
        }
        render() {
            if (this.options.refreshHeaders !== false) this.renderHeaders();
            this.renderBody();
            if (this.options.pagination !== false) this.pagination.render();
            const clear = this.element('clearId');
            if (clear) {
                const active = Object.values(this.state.filters).some((values) => values?.size);
                clear.classList.toggle('hidden', !active);
                clear.classList.toggle('flex', active);
                const toolbar = clear.closest('.hub-grid-toolbar');
                if (toolbar) toolbar.hidden = !active && !toolbar.querySelector('[data-grid-export]');
            }
        }
        renderHeaders() {
            const header = this.element('headerId') || this.tbody.closest('table').tHead;
            if (!header) return;
            if (this.options.headerClassName !== undefined) header.className = this.options.headerClassName;
            else header.classList.add('hub-grid-header');
            const inlineHeading = this.options.headerLayout === 'inline';
            header.classList.toggle('hub-grid-header-inline', inlineHeading);
            const row = document.createElement('tr');
            this.columns.forEach((col) => {
                const th = document.createElement('th');
                th.dataset.col = col.key;
                if (this.options.renderHeader) {
                    this.options.renderHeader(th, col, this);
                    row.appendChild(th);
                    return;
                }
                if (col.sticky) th.classList.add('hub-grid-sticky');
                const sorted = this.state.sort.key === col.key,
                    sortable = col.type !== 'actions' && col.sortable !== false;
                if (sortable)
                    th.setAttribute(
                        'aria-sort',
                        sorted ? (this.state.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                    );
                const label = document.createElement(sortable ? 'button' : 'span');
                label.className = 'hub-grid-sort';
                label.textContent = col.label + (inlineHeading ? ' ' : '');
                if (sortable) {
                    label.type = 'button';
                    const icon = document.createElement('span');
                    icon.className = 'hub-grid-sort-icon';
                    icon.textContent = sorted ? (this.state.sort.dir === 'asc' ? '↑' : '↓') : '↕';
                    label.appendChild(icon);
                    label.addEventListener('click', () => this.toggleSort(col.key));
                }
                const heading = inlineHeading ? document.createElement('div') : th;
                if (inlineHeading) {
                    heading.className = 'hub-grid-heading';
                    th.appendChild(heading);
                }
                heading.appendChild(label);
                if (col.filterable !== false && col.type !== 'actions') {
                    const filter = document.createElement('button');
                    filter.type = 'button';
                    filter.className = 'hub-grid-filter-button';
                    filter.setAttribute('aria-label', `Filtrar ${col.label}`);
                    filter.title = `Filtrar ${col.label}`;
                    filter.classList.toggle('is-filtered', !!this.state.filters[col.key]?.size);
                    filter.innerHTML =
                        '<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/></svg>';
                    filter.addEventListener('click', (event) => this.openFilter(event, col.key));
                    heading.appendChild(filter);
                }
                row.appendChild(th);
            });
            header.replaceChildren(row);
            this.updateSticky();
        }
        renderBody() {
            this.selection?.clear();
            if (!this.state.viewData.length) {
                this.tbody.innerHTML = `<tr data-grid-empty="true"><td colspan="${this.columns.length}" class="hub-grid-empty">${V.escape(this.options.emptyMessage || 'Nenhum registro encontrado com os filtros atuais.')}</td></tr>`;
                return;
            }
            const fragment = document.createDocumentFragment();
            this.state.viewData.forEach((row, index) => {
                const tr = document.createElement('tr');
                tr.dataset.gridRow = index;
                if (this.options.onRowClick) tr.classList.add('hub-grid-clickable');
                const attrs = this.options.rowAttributes?.(row, index) || {};
                Object.entries(attrs).forEach(([key, value]) => {
                    if (!/^on/i.test(key)) tr.setAttribute(key, value);
                });
                this.columns.forEach((col) => {
                    const td = document.createElement('td'),
                        value = V.value(row, col);
                    td.dataset.col = col.key;
                    if (col.sticky) td.classList.add('hub-grid-sticky');
                    if (col.center !== false && !col.align) td.classList.add('text-center');
                    if (col.align) td.style.textAlign = col.align;
                    if (col.wrap) td.classList.add('hub-grid-cell-wrap');
                    let formatted = this.options.renderCell
                        ? this.options.renderCell(value, col, row, index)
                        : col.render
                          ? col.render(value, row, index)
                          : col.type === 'currency'
                            ? V.currency(value)
                            : col.type === 'date'
                              ? V.date(value)
                              : value;
                    if (formatted && typeof formatted === 'object' && !(formatted instanceof Node)) {
                        if (formatted.html !== undefined) td.innerHTML = formatted.html;
                        else td.textContent = formatted.text ?? '-';
                        if (formatted.className) td.className += ' ' + formatted.className;
                        if (formatted.numericValue !== undefined)
                            td.dataset.gridNumeric =
                                formatted.numericValue === null ? 'none' : String(formatted.numericValue);
                    } else if (formatted instanceof Node) td.appendChild(formatted);
                    else if (this.options.renderCell || col.render) td.innerHTML = formatted ?? '-';
                    else td.textContent = formatted == null || formatted === '' ? '-' : String(formatted);
                    if (td.dataset.gridNumeric === undefined) {
                        if (['date', 'actions', 'input', 'boolean'].includes(col.type))
                            td.dataset.gridNumeric = 'none';
                        else if (['currency', 'number', 'deadline', 'percent'].includes(col.type)) {
                            const numeric = V.numeric(
                                this.options.selectionValue ? this.options.selectionValue(row, col) : value
                            );
                            td.dataset.gridNumeric = numeric === null ? 'none' : String(numeric);
                        }
                    }
                    if (col.title !== false) td.title = value == null ? '' : String(value);
                    tr.appendChild(td);
                });
                fragment.appendChild(tr);
            });
            this.tbody.replaceChildren(fragment);
            this.updateSticky();
        }
        updateSticky() {
            let left = 0;
            const table = this.tbody.closest('table'),
                heads = table.tHead?.rows[0]?.cells;
            if (!heads) return;
            this.columns.forEach((col, index) => {
                if (!col.sticky) return;
                for (const row of table.rows) if (row.cells[index]) row.cells[index].style.left = `${left}px`;
                left += heads[index]?.getBoundingClientRect().width || 0;
            });
        }
        toggleSort(key) {
            if (this.state.sort.key === key)
                this.state.sort.dir = this.state.sort.dir === 'asc' ? 'desc' : 'asc';
            else this.state.sort = { key, dir: 'asc' };
            this.state.pagination.current = 1;
            this.process();
        }
        setPage(page) {
            this.state.pagination.current = page;
            this.process();
        }
        openFilter(event, key) {
            this.filters.open(event, key);
        }
        clearFilters() {
            this.filters.close();
            this.state.filters = {};
            this.state.pagination.current = 1;
            if (this.options.clearSearchOnReset && this.element('searchId'))
                this.element('searchId').value = '';
            this.process();
        }
        canExport() {
            return typeof this.options.export === 'function'
                ? !!this.options.export()
                : this.options.export !== false;
        }
        export(options = {}) {
            if (!this.canExport()) return null;
            if (!this.state.filteredData.length) {
                if (this.options.onEmptyExport) this.options.onEmptyExport();
                else root.alert('Nenhum dado para exportar com os filtros atuais.');
                return null;
            }
            try {
                return P.Exporter.write(this.state.filteredData, this.columns, {
                    ...this.options.exportOptions,
                    ...options
                });
            } catch (error) {
                if (this.options.onExportError) this.options.onExportError(error);
                else if (root.showModal) root.showModal('Exportação', error.message, 'error');
                else root.alert(error.message);
                return null;
            }
        }
        destroy() {
            this.filters.close();
            this.selection?.destroy();
            this.abort.abort();
            this.resizeObserver.disconnect();
            this.tbody.replaceChildren();
            (this.element('headerId') || this.tbody.closest('table').tHead)?.replaceChildren();
            this.element('paginationId')?.replaceChildren();
            instances.delete(this.tbody);
        }
    }
    HubDataGrid.components = P;
    root.HubDataGrid = HubDataGrid;
})(globalThis);
