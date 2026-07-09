document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificação de Autenticação (Proteção de Rota Frontend)
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        window.location.replace('/');
        return;
    }

    // Libera a renderização do body agora que sabemos que está autenticado
    document.body.classList.remove('loading-auth');

    const user = JSON.parse(userStr);
    
    // Atualizar UI com dados do usuário
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userNameDisplay) userNameDisplay.textContent = user.nome || user.username || 'Usuário';
    if (userEmailDisplay) userEmailDisplay.textContent = user.email || '';
    if (userAvatar) {
        const initials = (user.nome || user.username || 'U')
            .split(' ')
            .map(n => n.charAt(0))
            .slice(0, 2)
            .join('')
            .toUpperCase();
        userAvatar.textContent = initials;
    }

    // 2. Lógica de Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.replace('/');
        });
    }

    // 3. Chamada à API Protegida para validar token
    async function carregarDados() {
        try {
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.replace('/');
                return;
            }

            const data = await response.json();
            console.log('✅ Token validado:', data.user);
            
            preencherTabelaVazia();

        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            preencherTabelaErro();
        }
    }

    function preencherTabelaVazia() {
        const tbody = document.getElementById('titulosTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-steel-500 dark:text-steel-400 text-sm">
                    Autenticado com sucesso! Banco SGC disponível via VPN.
                    <br><span class="text-xs text-steel-400 dark:text-steel-500 mt-1 block">Aguardando implementação da query de títulos...</span>
                </td>
            </tr>
        `;
    }

    function preencherTabelaErro() {
        const tbody = document.getElementById('titulosTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-red-500 dark:text-red-400 text-sm font-medium">
                    Erro ao comunicar com a API.
                </td>
            </tr>
        `;
    }

    carregarDados();
});
