window.HubComponents = window.HubComponents || {};
window.HubComponents.sidebar = { init() {
    const sidebar = document.querySelector('.app-sidebar');
    if (!sidebar || sidebar.dataset.initialized) return;
    sidebar.dataset.initialized = 'true';
    const { user, can, hideLinks } = window.HubComponents.session;
    const currentUser = user();
    if (currentUser) {
        const cr = hideLinks('/contas_a_receber', can(currentUser, 'canViewCR'));
        const clientes = hideLinks('/clientes', can(currentUser, 'canViewClientes'));
        const custos = hideLinks('/custos_produtos', can(currentUser, 'canViewCustos'));
        const lc = hideLinks('/itens_arrematados', can(currentUser, 'canViewLC'));
        hideLinks('/agenda_licitacoes', lc);
        const opme = hideLinks('/cirurgias', can(currentUser, 'canViewOPME'));
        for (const [group, allowed] of Object.entries({ financeiro: cr || clientes || custos, licitacoes: lc, opme })) {
            const element = document.getElementById('menu-group-' + group);
            if (element && !allowed) element.style.display = 'none';
        }
    }
    if (localStorage.getItem('sidebarCollapsed') === 'true') document.body.classList.add('sidebar-collapsed');
    document.getElementById('sidebarToggleBtn')?.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-collapsed');
        localStorage.setItem('sidebarCollapsed', String(document.body.classList.contains('sidebar-collapsed')));
    });
    sidebar.querySelectorAll('.sidebar-group-btn').forEach(button => {
        button.addEventListener('click', () => {
            if (document.body.classList.contains('sidebar-collapsed')) {
                document.body.classList.remove('sidebar-collapsed');
                localStorage.setItem('sidebarCollapsed', 'false');
            }
            const submenu = button.nextElementSibling;
            if (!submenu) return;
            submenu.classList.toggle('hidden');
            const chevron = button.querySelector('.sidebar-chevron');
            if (chevron) chevron.style.transform = submenu.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
        });
    });
} };
