/**
 * Sistema de Notificações - Frontend Modular
 * Gerencia a renderização do sininho, dropdown de notificações e integração com a API.
 */
(function initNotifications() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;

    let currentUser = null;
    try {
        currentUser = JSON.parse(userStr);
    } catch(e) { return; }

    const allowedRoles = ['ADMIN', 'LC1', 'LC2', 'LC3', 'LC4'];
    if (!allowedRoles.includes(currentUser.role)) {
        return; // Não inicializa se o usuário não tiver permissão
    }

    // Procura o themeToggle para injetar o sininho logo antes dele
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    let notifications = [];
    let unreadCount = 0;
    let previousUnreadCount = 0;
    let isFirstLoad = true;

    // Áudio pré-carregado (com cache-buster para forçar o navegador a pegar o arquivo novo)
    const notifAudio = new Audio('/assets/notification/audio_notification.wav?v=' + Date.now());

    // Função para tocar som de notificação
    function playNotificationSound() {
        try {
            notifAudio.currentTime = 0;
            notifAudio.play().catch(e => {
                // Ignora erros de bloqueio de autoplay do navegador
            });
        } catch(e) {
            console.error('Erro ao tentar tocar notificação:', e);
        }
    }

    // 0. Injetar Estilos (Scrollbar customizado)
    if (!document.getElementById('notif-styles')) {
        const style = document.createElement('style');
        style.id = 'notif-styles';
        style.textContent = `
            #notifDropdown .custom-scrollbar::-webkit-scrollbar { height: 10px; width: 10px; }
            #notifDropdown .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.02); border-radius: 8px; }
            .dark #notifDropdown .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
            #notifDropdown .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }
            .dark #notifDropdown .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; }
            #notifDropdown .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
        `;
        document.head.appendChild(style);
    }

    // 1. Injetar Botão do Sininho e Dropdown
    const container = document.createElement('div');
    container.className = 'relative flex items-center mr-2'; // Adiciona margem direita para separar do themeToggle

    container.innerHTML = `
        <button id="notifToggleBtn" class="relative p-2 rounded-lg text-steel-500 dark:text-steel-400 hover:bg-gray-100 dark:hover:bg-steel-700 transition-colors" title="Notificações">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span id="notifBadge" class="absolute top-1.5 right-1.5 flex h-2 w-2 hidden">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
        </button>

        <div id="notifDropdown" class="hidden absolute top-full right-0 mt-2 w-96 md:w-[32rem] bg-white dark:bg-steel-800 border border-gray-100 dark:border-steel-700 rounded-xl shadow-xl z-50 overflow-hidden transform opacity-0 scale-95 transition-all duration-200 origin-top-right">
            <!-- Header e Abas -->
            <div class="px-4 pt-4 pb-0 border-b border-gray-100 dark:border-steel-700">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-sm font-semibold text-steel-800 dark:text-gray-100">Notificações</h3>
                    <button id="markAllReadBtn" class="text-[11px] font-medium text-nexo-500 hover:text-nexo-600 transition-colors">Marcar todas como lidas</button>
                </div>
                <div class="flex space-x-4">
                    <button id="tabSistema" class="relative text-xs font-medium pb-2 border-b-2 border-nexo-500 text-nexo-600 dark:text-nexo-400 transition-colors pr-2">Sistema</button>
                    <button id="tabAgendamentos" class="relative text-xs font-medium pb-2 border-b-2 border-transparent text-steel-400 hover:text-steel-600 dark:hover:text-steel-300 transition-colors pr-2">Agendamentos</button>
                </div>
            </div>

            <!-- Lista de Notificações -->
            <div id="notifListContainer" class="h-80 overflow-y-auto custom-scrollbar bg-gray-50/50 dark:bg-steel-900/20">
                <!-- Conteúdo dinâmico -->
                <div id="notifListSistema" class="p-2 space-y-1">
                    <div class="p-4 text-center text-xs text-steel-400">Carregando notificações...</div>
                </div>
                <div id="notifListAgendamentos" class="hidden p-2 space-y-1">
                    <div class="p-4 text-center text-xs text-steel-400">Nenhum agendamento futuro.</div>
                </div>
            </div>
        </div>
    `;

    themeToggle.parentNode.insertBefore(container, themeToggle);

    const toggleBtn = document.getElementById('notifToggleBtn');
    const dropdown = document.getElementById('notifDropdown');
    const badge = document.getElementById('notifBadge');
    const listSistema = document.getElementById('notifListSistema');
    const tabSistema = document.getElementById('tabSistema');
    const tabAgendamentos = document.getElementById('tabAgendamentos');
    const listAgendamentos = document.getElementById('notifListAgendamentos');
    const markAllBtn = document.getElementById('markAllReadBtn');

    // 2. Comportamento do Dropdown
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = dropdown.classList.contains('hidden');
        if (isHidden) {
            dropdown.classList.remove('hidden');
            // Timeout para dar tempo do display block aplicar antes da transição de opacidade/escala
            setTimeout(() => {
                dropdown.classList.remove('opacity-0', 'scale-95');
                dropdown.classList.add('opacity-100', 'scale-100');
            }, 10);
            if (notifications.length === 0 && (!window.notifEventSource || window.notifEventSource.readyState !== EventSource.OPEN)) {
                connectSSE(); // Força reconexão se não houver notificações
            }
        } else {
            closeDropdown();
        }
    });

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            closeDropdown();
        }
    });

    function closeDropdown() {
        dropdown.classList.remove('opacity-100', 'scale-100');
        dropdown.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            dropdown.classList.add('hidden');
        }, 200);
    }

    // 3. Comportamento das Abas
    tabSistema.addEventListener('click', () => {
        tabSistema.classList.replace('border-transparent', 'border-nexo-500');
        tabSistema.classList.replace('text-steel-400', 'text-nexo-600');
        tabSistema.classList.add('dark:text-nexo-400');
        
        tabAgendamentos.classList.replace('border-nexo-500', 'border-transparent');
        tabAgendamentos.classList.replace('text-nexo-600', 'text-steel-400');
        tabAgendamentos.classList.remove('dark:text-nexo-400');

        listSistema.classList.remove('hidden');
        listAgendamentos.classList.add('hidden');
    });

    tabAgendamentos.addEventListener('click', () => {
        tabAgendamentos.classList.replace('border-transparent', 'border-nexo-500');
        tabAgendamentos.classList.replace('text-steel-400', 'text-nexo-600');
        tabAgendamentos.classList.add('dark:text-nexo-400');
        
        tabSistema.classList.replace('border-nexo-500', 'border-transparent');
        tabSistema.classList.replace('text-nexo-600', 'text-steel-400');
        tabSistema.classList.remove('dark:text-nexo-400');

        listAgendamentos.classList.remove('hidden');
        listSistema.classList.add('hidden');
    });

    // 4. Integração com a API
    const getToken = () => localStorage.getItem('token');

    function connectSSE() {
        const token = getToken();
        if (!token) return;

        // Fecha conexão antiga se existir
        if (window.notifEventSource) {
            window.notifEventSource.close();
        }

        window.notifEventSource = new EventSource(`/api/notifications/stream?token=${token}`);

        window.notifEventSource.onmessage = (event) => {
            try {
                notifications = JSON.parse(event.data);
                renderNotifications();
            } catch (e) {
                console.error('Erro ao fazer parse das notificações via SSE:', e);
            }
        };

        window.notifEventSource.onerror = () => {
            console.error('Erro na conexão SSE das notificações. Tentando reconectar...');
            window.notifEventSource.close();
            setTimeout(connectSSE, 5000);
        };
    }

    async function markAsRead(id) {
        try {
            const res = await fetch('/api/notifications/read', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(id ? { notificationId: id } : { markAll: true })
            });
            if (res.ok) {
                if (id) {
                    const n = notifications.find(n => n.id === id);
                    if (n) n.is_read = true;
                } else {
                    notifications.forEach(n => n.is_read = true);
                }
                renderNotifications();
            }
        } catch (e) {
            console.error('Erro ao marcar notificação como lida');
        }
    }

    markAllBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita fechar o dropdown
        markAsRead(null);
    });

    function formatTimeAgo(dateStr) {
        const date = new Date(dateStr);
        const diffMs = new Date() - date;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}m atrás`;
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs}h atrás`;
        return `${Math.floor(diffHrs / 24)}d atrás`;
    }

    function renderNotifications() {
        unreadCount = notifications.filter(n => !n.is_read).length;
        
        if (!isFirstLoad && unreadCount > previousUnreadCount) {
            playNotificationSound();
        }
        previousUnreadCount = unreadCount;
        isFirstLoad = false;
        
        if (unreadCount > 0) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }

        const notifsSistema = notifications.filter(n => n.module !== 'AGENDA');
        const notifsAgenda = notifications.filter(n => n.module === 'AGENDA');

        const unreadSistemaCount = notifsSistema.filter(n => !n.is_read).length;
        const unreadAgendamentosCount = notifsAgenda.filter(n => !n.is_read).length;

        const badgeHtml = '<span class="absolute top-0 right-0 flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>';

        tabSistema.innerHTML = `Sistema ${unreadSistemaCount > 0 ? badgeHtml : ''}`;
        tabAgendamentos.innerHTML = `Agendamentos ${unreadAgendamentosCount > 0 ? badgeHtml : ''}`;

        function renderList(listEl, notifArray, emptyMsg) {
            if (notifArray.length === 0) {
                listEl.innerHTML = `<div class="p-6 flex flex-col items-center justify-center text-center"><svg class="w-8 h-8 text-steel-300 dark:text-steel-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg><span class="text-xs font-medium text-steel-400 dark:text-steel-500">${emptyMsg}</span></div>`;
                return;
            }

            listEl.innerHTML = '';
            notifArray.forEach(n => {
                const isUnread = !n.is_read;
                const item = document.createElement('div');
                item.className = `p-3 rounded-lg flex gap-3 transition-colors cursor-pointer ${isUnread ? 'bg-white dark:bg-steel-800 border border-nexo-100 dark:border-steel-600 shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-steel-800'}`;
                
                // Avatar
                let avatarHtml = '';
                if (n.avatar_url && n.avatar_url !== 'null' && n.avatar_url.trim() !== '') {
                    avatarHtml = `<img src="${n.avatar_url}" class="w-8 h-8 rounded-full object-cover">`;
                } else {
                    const parts = (n.created_by_name || 'Sis').trim().split(' ');
                    const inits = parts.length > 1 ? parts[0][0] + (parts[parts.length - 1][0] || '') : parts[0][0];
                    avatarHtml = `<div class="w-8 h-8 rounded-full bg-nexo-100 dark:bg-steel-700 flex items-center justify-center text-xs font-bold text-nexo-600 dark:text-nexo-400">${inits.toUpperCase()}</div>`;
                }

                // Action icon color
                let iconColor = 'text-nexo-500';
                if (n.action === 'UPDATE') iconColor = 'text-amber-500';
                if (n.action === 'DELETE') iconColor = 'text-red-500';
                if (n.action && n.action.startsWith('REMINDER')) iconColor = 'text-purple-500';

                let iconSvg = '';
                if (n.action === 'INSERT') iconSvg = 'M12 4v16m8-8H4';
                else if (n.action === 'UPDATE') iconSvg = 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
                else if (n.action && n.action.startsWith('REMINDER')) iconSvg = 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'; // Clock icon
                else iconSvg = 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16';

                item.innerHTML = `
                    <div class="flex-shrink-0 relative">
                        ${avatarHtml}
                        ${isUnread ? '<span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-steel-800 rounded-full"></span>' : ''}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[11px] text-steel-700 dark:text-gray-300 leading-snug whitespace-pre-line">${n.message}</p>
                        <p class="text-[10px] font-medium text-steel-400 dark:text-steel-500 mt-1 flex items-center gap-1">
                            <svg class="w-3 h-3 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconSvg}"></path></svg>
                            ${formatTimeAgo(n.created_at)}
                        </p>
                    </div>
                `;

                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (isUnread) markAsRead(n.id);
                });

                listEl.appendChild(item);
            });
        }

        renderList(listSistema, notifsSistema, 'Tudo limpo por aqui!');
        renderList(listAgendamentos, notifsAgenda, 'Nenhum agendamento futuro.');
    }

    // Inicializa carregando via SSE
    connectSSE();

    // Reconecta se a conexão cair quando o usuário voltar para a aba
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && window.notifEventSource && window.notifEventSource.readyState === EventSource.CLOSED) {
            connectSSE();
        }
    });
})();
