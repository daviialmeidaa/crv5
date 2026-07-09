/**
 * Theme Manager - Alterna entre modo claro e escuro.
 * Persiste a preferência do usuário no localStorage.
 */
(function () {
    const toggle = document.getElementById('themeToggle');

    if (!toggle) return;

    toggle.addEventListener('click', () => {
        const html = document.documentElement;

        if (html.classList.contains('dark')) {
            html.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            html.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
    });
})();
