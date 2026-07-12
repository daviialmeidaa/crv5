(function() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    // Se não estiver logado, redireciona para a tela de login imediatamente
    if (!token || !userStr) {
        window.location.replace('/');
        return;
    }

    let user;
    try {
        user = JSON.parse(userStr);
    } catch(e) {
        window.location.replace('/');
        return;
    }

    const currentPath = window.location.pathname;

    // Bloqueia acesso a qualquer página se o usuário estiver pendente de redefinir senha
    if (user.first_access === true && currentPath !== '/primeiro_acesso') {
        window.location.replace('/primeiro_acesso');
        return;
    }

    // Se o usuário já fez o primeiro acesso, não pode acessar a tela de primeiro acesso novamente
    if (user.first_access === false && currentPath === '/primeiro_acesso') {
        window.location.replace('/dashboard');
        return;
    }

    // Se não for admin e tentar acessar páginas exclusivas de admin
    const adminRoutes = ['/usuarios', '/cadastro_usuario'];
    if (adminRoutes.includes(currentPath) && user.is_admin !== true) {
        window.location.replace('/403');
        return;
    }
})();
