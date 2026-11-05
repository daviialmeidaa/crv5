// Interface permissions complement the existing API authorization checks.
window.HubComponents = window.HubComponents || {};
window.HubComponents.session = {
    user() {
        try { return JSON.parse(localStorage.getItem('user') || 'null'); }
        catch (error) { console.error('Erro ao fazer parse do usuário local', error); return null; }
    },
    can(user, permission) {
        return !!user && (user.role?.trim().toUpperCase() === 'ADMIN' || !!user.permissions?.[permission]);
    },
    hideLinks(href, allowed) {
        if (!allowed) document.querySelectorAll(`a[href="${href}"]`).forEach(link => { link.style.display = 'none'; });
        return allowed;
    }
};
