(function (root) {
    const icons = {
        delete: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
        edit: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
        save: 'M5 13l4 4L19 7',
        block: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'
    };
    const Actions = {
        button({ label, icon = 'edit', danger = false, onClick }) {
            const button = document.createElement('button');
            button.type = 'button';
            button.title = label;
            button.setAttribute('aria-label', label);
            button.className = 'hub-grid-action ' + (danger ? 'hub-grid-action-danger' : '');
            button.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${icons[icon] || icons.edit}"/></svg>`;
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                onClick(event);
            });
            return button;
        },
        group(buttons) {
            const group = document.createElement('div');
            group.className = 'hub-grid-actions';
            group.append(...buttons);
            return group;
        }
    };
    root.HubDataGridParts.Actions = Actions;
})(globalThis);
