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

    // --- Início: Verificação de Validade do Token (Item 3) ---
    function decodeJwt(t) {
        try {
            const base64Url = t.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch(e) {
            return null;
        }
    }

    const payload = decodeJwt(token);
    if (payload && payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
            // Token expirado
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.replace('/?session_expired=1');
            return;
        }
    }
    // --- Fim: Verificação de Validade do Token ---

    // --- Início: Interceptor Global de Fetch (Item 2) ---
    const originalFetch = window.fetch;
    window.fetch = async function() {
        const response = await originalFetch.apply(this, arguments);
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.replace('/?session_expired=1');
        }
        return response;
    };
    // --- Fim: Interceptor Global de Fetch ---

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

    // Controle de Acesso Baseado em Permissões (RBAC)
    const permissions = user.permissions || {};
    
    if (currentPath === '/contas_a_receber' && user.role !== 'ADMIN' && !permissions.canViewCR) {
        window.location.replace('/403');
        return;
    }
    
    if (currentPath.startsWith('/clientes') && user.role !== 'ADMIN' && !permissions.canViewClientes) {
        window.location.replace('/403');
        return;
    }
    
    if ((currentPath === '/itens_arrematados' || currentPath === '/agenda_licitacoes') && user.role !== 'ADMIN' && !permissions.canViewLC) {
        window.location.replace('/403');
        return;
    }
    
    if (currentPath === '/usuarios' && user.role !== 'ADMIN' && !permissions.canViewUsers) {
        window.location.replace('/403');
        return;
    }

    if (currentPath === '/cadastro_usuario' && user.role !== 'ADMIN' && !permissions.canCreateUsers) {
        window.location.replace('/403');
        return;
    }

    if (currentPath === '/perfis' && user.role !== 'ADMIN' && !permissions.canManageRoles) {
        window.location.replace('/403');
        return;
    }

    if (currentPath === '/reset-heroku' && user.role !== 'ADMIN' && !permissions.canResetHeroku) {
        window.location.replace('/403');
        return;
    }
})();
