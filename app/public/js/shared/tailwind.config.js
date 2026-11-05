/* A paleta vem exclusivamente de css/global.css. Carregar apos Tailwind e global.css. */
(() => {
    const page = document.documentElement.dataset.page;
    const tokens = getComputedStyle(document.documentElement);
    const token = name => tokens.getPropertyValue('--' + name).trim();
    const palette = (name, shades) => Object.fromEntries(shades.map(shade => [shade, token('color-' + name + '-' + shade)]));
    const colors = {
        nexo: palette('nexo', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        steel: palette('steel', [400, 500, 600, 700, 800, 900]),
        ...Object.fromEntries(['success', 'alert', 'danger', 'info', 'neutral'].map(name => [name, token('color-' + name)])),
    };
    const extend = { colors, fontFamily: { sans: [token('font-ui'), 'system-ui', '-apple-system', 'sans-serif'] } };
    const publicPage = ['login', 'primeiro_acesso', '403'].includes(page);
    if (['login', 'primeiro_acesso'].includes(page)) extend.screens = { '3xl': '2560px', '4xl': '3440px' };
    if (page === 'reset_heroku') extend.fontFamily.mono = ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'];
    tailwind.config = { ...(publicPage ? {} : { darkMode: 'class' }), theme: { extend } };
})();
