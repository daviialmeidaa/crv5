(function (root) {
    'use strict';
    const parts = root.HubDataGridParts,
        V = parts.values;
    let opened = null;
    class Filters {
        constructor(grid) {
            this.grid = grid;
            this.modal = null;
            this.expanded = {};
        }
        static matches(row, filters, columns, exceptKey) {
            return Object.entries(filters).every(([key, selected]) => {
                if (key === exceptKey || !selected?.size) return true;
                if (selected.has(V.NONE)) return false;
                const col = columns.find((column) => column.key === key) || { key };
                const value = V.value(row, col),
                    normalized = V.filterKey(value, col);
                return selected.has(normalized) || selected.has(value);
            });
        }
        static search(rows, query, keys) {
            const term = String(query || '')
                .trim()
                .toLowerCase();
            if (!term) return rows;
            return rows.filter((row) =>
                (keys ? keys.map((key) => row[key]) : Object.values(row)).some((value) =>
                    String(value ?? '')
                        .toLowerCase()
                        .includes(term)
                )
            );
        }
        close() {
            this.modal?.remove();
            this.modal = null;
            this.abort?.abort();
            this.abort = null;
            if (opened === this) opened = null;
        }
        open(event, key) {
            event.stopPropagation();
            opened?.close();
            const grid = this.grid,
                col = grid.columns.find((column) => column.key === key);
            if (!col || col.filterable === false || col.type === 'actions') return;
            const rows = grid
                .sourceRows()
                .filter((row) => Filters.matches(row, grid.state.filters, grid.columns, key));
            const values = [...new Set(rows.map((row) => V.filterKey(V.value(row, col), col)))].sort(
                (a, b) =>
                    a === V.EMPTY
                        ? 1
                        : b === V.EMPTY
                          ? -1
                          : String(a).localeCompare(String(b), 'pt-BR', { numeric: true })
            );
            const applied = grid.state.filters[key];
            const draft = new Set(applied?.size ? [...applied].filter((value) => value !== V.NONE) : values);
            this.expanded = {};
            const modal = document.createElement('div');
            modal.id = 'filterModal';
            modal.className = 'hub-grid-filter data-grid-filter';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-label', `Filtrar ${col.label}`);
            modal.innerHTML =
                '<div class="hub-grid-filter-search"><input id="filterSearchInput" type="text" placeholder="Pesquisar..." aria-label="Pesquisar valores"></div><div class="hub-grid-filter-list custom-scrollbar" id="filterCheckboxList"></div><div class="hub-grid-filter-footer"><button type="button" id="btnClearFilter">Limpar</button><button type="button" id="btnApplyFilter">Aplicar</button></div>';
            document.body.appendChild(modal);
            this.modal = modal;
            opened = this;
            const trigger = event.currentTarget;
            const anchor = trigger.getBoundingClientRect();
            const width = Math.min(256, window.innerWidth - 16);
            modal.style.width = `${width}px`;
            modal.style.left = `${Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8))}px`;
            const top = anchor.bottom + 8;
            modal.style.top = `${Math.max(8, Math.min(top, window.innerHeight - Math.min(320, modal.offsetHeight) - 8))}px`;
            const list = modal.querySelector('#filterCheckboxList'),
                search = modal.querySelector('input');
            const display = (value) =>
                value === V.EMPTY
                    ? '(Vazio)'
                    : col.filterFormat
                      ? col.filterFormat(value)
                      : col.type === 'date'
                        ? V.date(value)
                        : col.type === 'currency'
                          ? V.currency(value)
                          : String(value);
            const render = (query = '') => {
                list.replaceChildren();
                const visible = values.filter(
                    (value) => !query || display(value).toLowerCase().includes(query.toLowerCase())
                );
                if (!visible.length) {
                    const empty = document.createElement('p');
                    empty.className = 'hub-grid-filter-empty';
                    empty.textContent = 'Nenhum valor encontrado.';
                    list.appendChild(empty);
                    return;
                }
                const option = (container, label, members, className = '') => {
                    const row = document.createElement('div');
                    row.className = 'hub-grid-filter-option ' + className;
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = members.length > 0 && members.every((value) => draft.has(value));
                    checkbox.indeterminate = !checkbox.checked && members.some((value) => draft.has(value));
                    const text = document.createElement('span');
                    text.textContent = label;
                    text.title = label;
                    row.append(checkbox, text);
                    row.addEventListener('click', (e) => {
                        if (e.target !== checkbox) checkbox.checked = !checkbox.checked;
                        members.forEach((value) =>
                            checkbox.checked ? draft.add(value) : draft.delete(value)
                        );
                        render(query);
                    });
                    container.appendChild(row);
                    return row;
                };
                option(list, '(Selecionar Tudo)', visible, 'hub-grid-filter-all');
                if (col.type !== 'date' || query) {
                    visible.forEach((value) => option(list, display(value), [value]));
                    return;
                }
                const tree = new Map(),
                    months = [
                        'Jan',
                        'Fev',
                        'Mar',
                        'Abr',
                        'Mai',
                        'Jun',
                        'Jul',
                        'Ago',
                        'Set',
                        'Out',
                        'Nov',
                        'Dez'
                    ];
                visible.forEach((value) => {
                    const p = value === V.EMPTY ? null : V.dateParts(value),
                        year = p ? String(p[0]) : '(Vazio)',
                        month = p ? p[1] : 0;
                    if (!tree.has(year)) tree.set(year, new Map());
                    if (!tree.get(year).has(month)) tree.get(year).set(month, []);
                    tree.get(year).get(month).push(value);
                });
                const branch = (container, label, members, branchKey) => {
                    const holder = document.createElement('div');
                    holder.className = 'hub-grid-filter-branch';
                    container.appendChild(holder);
                    const row = option(holder, label, members, 'hub-grid-filter-group');
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'filter-tree-toggle';
                    button.setAttribute('aria-label', `Expandir ${label}`);
                    const children = document.createElement('div');
                    children.className = 'hub-grid-filter-children';
                    holder.appendChild(children);
                    const update = () => {
                        children.hidden = !this.expanded[branchKey];
                        button.textContent = children.hidden ? '+' : '−';
                        button.setAttribute('aria-expanded', String(!children.hidden));
                    };
                    const toggle = (event) => {
                        event.stopPropagation();
                        this.expanded[branchKey] = !this.expanded[branchKey];
                        update();
                    };
                    button.addEventListener('click', toggle);
                    row.querySelector('span').addEventListener('click', toggle);
                    row.prepend(button);
                    update();
                    return children;
                };
                [...tree.keys()]
                    .sort((a, b) => b.localeCompare(a))
                    .forEach((year) => {
                        const buckets = tree.get(year),
                            children = branch(list, year, [...buckets.values()].flat(), year);
                        [...buckets.keys()]
                            .sort((a, b) => a - b)
                            .forEach((month) => {
                                const items = buckets.get(month),
                                    days = branch(
                                        children,
                                        month ? months[month - 1] : '(Vazio)',
                                        items,
                                        `${year}-${month}`
                                    );
                                items.forEach((value) => {
                                    const p = value === V.EMPTY ? null : V.dateParts(value);
                                    option(days, p ? String(p[2]).padStart(2, '0') : display(value), [value]);
                                });
                            });
                    });
            };
            render();
            search.focus();
            let typed = false;
            search.addEventListener('input', () => {
                if (!typed && search.value.length) {
                    draft.clear();
                    typed = true;
                }
                render(search.value);
            });
            modal.querySelector('#btnApplyFilter').addEventListener('click', () => {
                grid.state.filters[key] =
                    values.length && values.every((value) => draft.has(value))
                        ? new Set()
                        : draft.size
                          ? new Set(draft)
                          : new Set([V.NONE]);
                grid.state.pagination.current = 1;
                this.close();
                grid.process();
            });
            modal.querySelector('#btnClearFilter').addEventListener('click', () => {
                delete grid.state.filters[key];
                grid.state.pagination.current = 1;
                this.close();
                grid.process();
            });
            modal.addEventListener('click', (e) => e.stopPropagation());
            this.abort = new AbortController();
            const signal = this.abort.signal;
            document.addEventListener(
                'click',
                (e) => {
                    if (!modal.contains(e.target)) this.close();
                },
                { signal }
            );
            document.addEventListener(
                'keydown',
                (e) => {
                    if (e.key === 'Escape') {
                        this.close();
                        trigger.focus();
                    }
                },
                { signal }
            );
            window.addEventListener('resize', () => this.close(), { signal });
        }
    }
    parts.Filters = Filters;
    if (typeof module !== 'undefined' && module.exports) module.exports = Filters;
})(globalThis);
