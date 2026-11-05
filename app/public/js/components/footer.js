window.HubComponents = window.HubComponents || {};
window.HubComponents.footer = { init() {
    const year = document.getElementById('footerYear');
    if (year) year.textContent = new Date().getFullYear();
} };
