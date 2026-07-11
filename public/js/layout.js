/**
 * Gerencia o comportamento estrutural do Layout App
 * - Sidebar Colapsável
 * - Dropdown de Perfil
 * - Controle de Acesso Baseado em Roles (Mock)
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. Informações do Usuário e Controle de Permissão
    // ==========================================
    const userStr = localStorage.getItem('user');
    let currentUser = null;

    if (userStr) {
        try {
            currentUser = JSON.parse(userStr);
            
            // Popula o Dropdown com os dados do usuário
            const menuHeader = document.querySelector('#profileDropdownMenu .border-b');
            if (menuHeader) {
                const ps = menuHeader.querySelectorAll('p');
                if (ps.length >= 2) {
                    ps[0].textContent = currentUser.nome || 'Usuário';
                    ps[1].textContent = currentUser.email || '';
                }
            }
            
            // Atualiza as letras ou a imagem do avatar
            const avatar = document.querySelector('#profileDropdownBtn div');
            if (avatar && currentUser.nome) {
                if (currentUser.avatar_url) {
                    avatar.innerHTML = `<img src="${currentUser.avatar_url}" alt="Avatar" class="w-full h-full object-cover">`;
                } else {
                    const parts = currentUser.nome.trim().split(' ').filter(n => n.length > 0);
                    let initials = '';
                    if (parts.length > 0) initials += parts[0][0];
                    if (parts.length > 1) initials += parts[parts.length - 1][0];
                    avatar.textContent = initials.toUpperCase();
                }
            }

            // Oculta itens admin-only se não for admin
            if (!currentUser.is_admin) {
                const adminElements = document.querySelectorAll('.admin-only');
                adminElements.forEach(el => el.style.display = 'none');
            }
        } catch(e) {
            console.error('Erro ao fazer parse do usuário local', e);
        }
    }

    // ==========================================
    // 2. Modal Global Customizado
    // ==========================================
    window.showModal = function(title, message, type = 'success') {
        const modalId = 'globalCustomModal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            const modalHTML = `
                <div id="${modalId}" class="fixed inset-0 z-[60] flex items-center justify-center hidden">
                    <div class="fixed inset-0 bg-steel-900/40 backdrop-blur-sm transition-opacity" id="${modalId}Overlay"></div>
                    <div class="relative bg-white dark:bg-steel-800 rounded-xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-95 opacity-0 mx-4 border border-gray-100 dark:border-steel-700" id="${modalId}Content">
                        <div class="flex flex-col items-center text-center">
                            <div id="${modalId}Icon" class="mb-4 p-3 rounded-full"></div>
                            <h3 id="${modalId}Title" class="text-lg font-bold text-steel-800 dark:text-gray-100 mb-2"></h3>
                            <p id="${modalId}Message" class="text-sm text-steel-500 dark:text-steel-400 mb-6"></p>
                            <button id="${modalId}Btn" class="w-full py-2.5 px-4 rounded-lg font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-steel-800"></button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById(modalId);
        }

        const content = document.getElementById(`${modalId}Content`);
        const overlay = document.getElementById(`${modalId}Overlay`);
        const iconContainer = document.getElementById(`${modalId}Icon`);
        const titleEl = document.getElementById(`${modalId}Title`);
        const messageEl = document.getElementById(`${modalId}Message`);
        const btn = document.getElementById(`${modalId}Btn`);

        // Configuração visual por tipo
        let iconSvg, btnClass, iconBgClass, iconTextClass;

        if (type === 'success') {
            iconSvg = `<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
            iconBgClass = 'bg-nexo-50 dark:bg-nexo-900/30';
            iconTextClass = 'text-nexo-600 dark:text-nexo-400';
            btnClass = 'bg-nexo-600 hover:bg-nexo-700 focus:ring-nexo-500';
            btn.textContent = 'Entendi';
        } else if (type === 'error') {
            iconSvg = `<svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
            iconBgClass = 'bg-red-50 dark:bg-red-900/30';
            iconTextClass = 'text-red-600 dark:text-red-400';
            btnClass = 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
            btn.textContent = 'Tentar Novamente';
        }

        iconContainer.className = `mb-4 p-3 rounded-full ${iconBgClass} ${iconTextClass}`;
        iconContainer.innerHTML = iconSvg;
        titleEl.textContent = title;
        messageEl.textContent = message;
        btn.className = `w-full py-2.5 px-4 rounded-lg font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-steel-800 ${btnClass}`;

        // Mostrar
        modal.classList.remove('hidden');
        // Trigger animation
        requestAnimationFrame(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        });

        // Fechar
        const closeModal = () => {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 200);
        };

        btn.onclick = closeModal;
        overlay.onclick = closeModal;
    };

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
