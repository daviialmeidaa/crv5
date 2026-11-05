window.HubComponents = window.HubComponents || {};
window.HubComponents.profileMenu = { init() {
    const button = document.getElementById('profileDropdownBtn');
    const menu = document.getElementById('profileDropdownMenu');
    if (!button || !menu || menu.dataset.initialized) return;
    menu.dataset.initialized = 'true';
    const { user, can, hideLinks } = window.HubComponents.session;
    const currentUser = user();
    if (currentUser) {
        const labels = menu.querySelector('.border-b')?.querySelectorAll('p');
        if (labels?.length >= 2) {
            labels[0].textContent = currentUser.nome || 'Usuário';
            labels[1].textContent = currentUser.email || '';
        }
        const avatar = button.querySelector('div');
        if (avatar && currentUser.nome) {
            if (currentUser.avatar_url) {
                const image = document.createElement('img');
                image.src = currentUser.avatar_url;
                image.alt = 'Avatar';
                image.className = 'w-full h-full object-cover';
                avatar.replaceChildren(image);
            } else {
                const parts = currentUser.nome.trim().split(' ').filter(Boolean);
                avatar.textContent = ((parts[0]?.[0] || '') + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase();
            }
        }
        hideLinks('/usuarios', can(currentUser, 'canViewUsers'));
        hideLinks('/cadastro_usuario', can(currentUser, 'canCreateUsers'));
        hideLinks('/reset-heroku', can(currentUser, 'canResetHeroku'));
        if (can(currentUser, 'canManageRoles')) {
            const logout = menu.querySelector('a.text-red-600');
            if (logout && !menu.querySelector('a[href="/perfis"]')) {
                const link = document.createElement('a');
                link.href = '/perfis';
                link.className = 'block px-4 py-2 text-sm text-steel-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-steel-700 transition-colors';
                link.textContent = 'Perfis de Usuário';
                menu.insertBefore(link, logout.previousElementSibling || logout);
            }
        }
    }
    button.addEventListener('click', event => {
        event.stopPropagation();
        menu.classList.toggle('hidden');
    });
    document.addEventListener('click', event => { if (!menu.contains(event.target)) menu.classList.add('hidden'); });
    menu.querySelector('a.text-red-600')?.addEventListener('click', event => {
        event.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });
} };
