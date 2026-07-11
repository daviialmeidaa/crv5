/**
 * Gerencia o comportamento estrutural do Layout App
 * - Sidebar Colapsável
 * - Dropdown de Perfil
 * - Controle de Acesso Baseado em Roles (Mock)
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. Controle de Permissão (Mock Role)
    // ==========================================
    // Em uma aplicação real, isso viria do token JWT/backend
    const currentUserRole = 'admin'; // 'admin' ou 'user'

    if (currentUserRole !== 'admin') {
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => el.style.display = 'none');
    }

    // ==========================================
    // 2. Sidebar Toggle
    // ==========================================
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    
    // Restaurar estado salvo (Padrão: expandido)
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
        document.body.classList.add('sidebar-collapsed');
    }

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-collapsed');
            
            // Salvar preferência
            const isCollapsed = document.body.classList.contains('sidebar-collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false');
        });
    }

    // ==========================================
    // 3. Profile Dropdown Menu
    // ==========================================
    const profileBtn = document.getElementById('profileDropdownBtn');
    const profileMenu = document.getElementById('profileDropdownMenu');

    if (profileBtn && profileMenu) {
        // Toggle ao clicar no botão
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('hidden');
        });

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (!profileMenu.contains(e.target)) {
                profileMenu.classList.add('hidden');
            }
        });
        
        // Lógica de Logout
        const logoutBtn = profileMenu.querySelector('a.text-red-600');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
            });
        }
    }

});
