// Apply the saved theme in the head, before the page is painted.
window.HubComponents = window.HubComponents || {};
if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
}
window.HubComponents.themeToggle = { init() {
    const button = document.getElementById('themeToggle');
    if (!button || button.dataset.initialized) return;
    button.dataset.initialized = 'true';
    button.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
} };
