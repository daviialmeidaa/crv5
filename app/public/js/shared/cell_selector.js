// Compatibility entry point. New pages use the Data Grid's Selection subcomponent.
const CellSelector = (() => {
    const legacy = new WeakMap();
    return {
        init(bodyId) {
            const body = document.getElementById(bodyId);
            if (!body || !window.HubDataGrid) return;
            const grid = HubDataGrid.get(body);
            if (grid?.selection) return grid.selection;
            if (!legacy.has(body)) {
                body.closest('table').classList.add('hub-data-grid-table');
                legacy.set(body, new HubDataGrid.components.Selection(body));
            }
            return legacy.get(body);
        },
        clear() { window.HubDataGrid?.components.Selection.clear(); }
    };
})();
