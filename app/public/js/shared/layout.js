// The base template loads component scripts before this orchestrator.
document.addEventListener('DOMContentLoaded', () => {
    window.HubComponents.sidebar.init();
    window.HubComponents.navbar.init();
    window.HubComponents.footer.init();
});
