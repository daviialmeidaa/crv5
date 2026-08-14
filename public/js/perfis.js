const SYSTEM_PERMISSIONS = [
    { id: 'canViewCR', name: 'Módulo Contas a Receber' },
    { id: 'canViewLC', name: 'Módulo Licitações' },
    { id: 'canViewUsers', name: 'Módulo Usuários (Leitura)' },
    { id: 'canManageUsers', name: 'Gestão de Usuários (Edição)' },
    { id: 'canCreateUsers', name: 'Módulo Usuários (Criação)' },
    { id: 'canViewClientes', name: 'Módulo Clientes / Cobrança' },
    { id: 'canManageRoles', name: 'Módulo Perfis de Acesso' },
    { id: 'canResetHeroku', name: 'Ferramenta de Reset do Heroku' },
    { id: 'canReceiveEmailsLC', name: 'Notificações: E-mails de Licitações' },
    { id: 'canReceiveEmailsCR', name: 'Notificações: E-mails de Cobrança' }
];

const PerfisModule = (() => {
    let roles = [];
    let currentEditingRole = null;
    let selectedPermissions = new Set();
    let isCreating = false;

    // Elementos DOM
    const els = {
        list: document.getElementById('rolesListContainer'),
        empty: document.getElementById('editorEmptyState'),
        editor: document.getElementById('editorContainer'),
        formName: document.getElementById('formRoleName'),
        boxAvailable: document.getElementById('boxAvailable'),
        boxSelected: document.getElementById('boxSelected'),
        btnDelete: document.getElementById('btnDeleteRole'),
        title: document.getElementById('editorTitle'),
        badge: document.getElementById('systemBadge'),
        loader: document.getElementById('globalLoader')
    };

    const fetchRoles = async () => {
        try {
            const res = await fetch('/api/perfis', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!res.ok) throw new Error('Falha ao carregar perfis');
            roles = await res.json();
            renderRolesList();
            els.loader.classList.add('opacity-0');
            setTimeout(() => els.loader.classList.add('hidden'), 300);
        } catch (err) {
            console.error(err);
            Toastify({ text: 'Erro ao buscar perfis de usuário.', duration: 3000, style: { background: "#ef4444" }, gravity: "bottom" }).showToast();
        }
    };

    const renderRolesList = () => {
        els.list.innerHTML = '';
        roles.forEach(role => {
            const div = document.createElement('div');
            div.className = `p-3 rounded-lg border cursor-pointer transition-all ${currentEditingRole && currentEditingRole.name === role.name ? 'bg-nexo-50 dark:bg-nexo-900/20 border-nexo-300 dark:border-nexo-700' : 'bg-white dark:bg-steel-800 border-gray-100 dark:border-steel-700 hover:border-nexo-200 hover:shadow-sm'}`;
            div.onclick = () => loadRole(role);
            
            let systemLabel = role.is_system ? `<span class="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-sm font-medium uppercase">Nativo</span>` : '';
            
            div.innerHTML = `
                <div class="flex justify-between items-start">
                    <span class="font-medium text-sm text-steel-800 dark:text-gray-200">${role.name}</span>
                    ${systemLabel}
                </div>
                <div class="text-xs text-steel-500 mt-1 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                    ${Object.keys(role.permissions).filter(k => role.permissions[k]).length} regras
                </div>
            `;
            els.list.appendChild(div);
        });
    };

    const renderDualBox = () => {
        els.boxAvailable.innerHTML = '';
        els.boxSelected.innerHTML = '';

        SYSTEM_PERMISSIONS.forEach(perm => {
            const div = document.createElement('div');
            div.className = 'px-3 py-2 text-sm bg-white dark:bg-steel-800 border border-gray-200 dark:border-steel-600 rounded-md cursor-pointer hover:bg-nexo-50 dark:hover:bg-nexo-900/30 hover:border-nexo-300 transition-colors select-none';
            div.textContent = perm.name;
            div.dataset.id = perm.id;
            
            // Toggle selection state when clicked inside its own box
            div.onclick = function() {
                this.classList.toggle('ring-2');
                this.classList.toggle('ring-nexo-500');
                this.dataset.selected = this.classList.contains('ring-nexo-500');
            };

            if (selectedPermissions.has(perm.id)) {
                els.boxSelected.appendChild(div);
            } else {
                els.boxAvailable.appendChild(div);
            }
        });
    };

    const moveItem = (direction) => {
        const sourceBox = direction === 'right' ? els.boxAvailable : els.boxSelected;
        const items = Array.from(sourceBox.children).filter(el => el.dataset.selected === 'true');
        
        items.forEach(el => {
            el.classList.remove('ring-2', 'ring-nexo-500');
            el.dataset.selected = 'false';
            if (direction === 'right') {
                selectedPermissions.add(el.dataset.id);
            } else {
                selectedPermissions.delete(el.dataset.id);
            }
        });

        if (items.length > 0) renderDualBox();
    };

    const loadRole = (role) => {
        currentEditingRole = role;
        isCreating = false;
        
        selectedPermissions.clear();
        for (const [key, val] of Object.entries(role.permissions)) {
            if (val) selectedPermissions.add(key);
        }

        els.formName.value = role.name;
        els.formName.readOnly = role.is_system; // Nativo não muda nome
        
        els.title.textContent = 'Editar Perfil';
        
        if (role.is_system) {
            els.badge.classList.remove('hidden');
            els.btnDelete.classList.add('hidden');
        } else {
            els.badge.classList.add('hidden');
            els.btnDelete.classList.remove('hidden');
        }

        if (role.name === 'ADMIN') {
            els.formName.disabled = true;
            // ADMIN cannot be completely unchecked visually, but we will let them see it
        } else {
            els.formName.disabled = false;
        }

        renderDualBox();
        renderRolesList(); // To highlight active

        els.empty.classList.add('hidden');
        els.editor.classList.remove('hidden');
        setTimeout(() => els.editor.classList.remove('opacity-0'), 10);
    };

    const createNew = () => {
        currentEditingRole = null;
        isCreating = true;
        selectedPermissions.clear();
        
        els.formName.value = '';
        els.formName.readOnly = false;
        els.formName.disabled = false;
        
        els.title.textContent = 'Novo Perfil Customizado';
        els.badge.classList.add('hidden');
        els.btnDelete.classList.add('hidden');

        renderDualBox();
        renderRolesList();

        els.empty.classList.add('hidden');
        els.editor.classList.remove('hidden');
        setTimeout(() => els.editor.classList.remove('opacity-0'), 10);
        
        els.formName.focus();
    };

    const saveRole = async () => {
        const name = els.formName.value.trim().toUpperCase();
        if (!name) return Toastify({ text: 'Digite o nome do perfil.', duration: 3000, style: { background: "#ef4444" }, gravity: "bottom" }).showToast();

        // Se estiver criando, valida formato
        if (isCreating && !/^[A-Z0-9_]+$/.test(name)) {
            return Toastify({ text: 'Nome de perfil inválido. Use apenas letras maiúsculas, números e underline (_). Ex: GERENTE_VENDAS', duration: 4000, style: { background: "#ef4444" }, gravity: "bottom" }).showToast();
        }

        const permissions = {};
        SYSTEM_PERMISSIONS.forEach(p => {
            permissions[p.id] = selectedPermissions.has(p.id);
        });

        // Garantir que ADMIN tem tudo sempre para evitar que o usuario quebre o proprio acesso
        if (name === 'ADMIN') {
            SYSTEM_PERMISSIONS.forEach(p => permissions[p.id] = true);
        }

        try {
            const res = await fetch('/api/perfis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name, permissions })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

            // Force reload users module roles if it exists or just rely on server load
            Toastify({ text: 'Perfil salvo com sucesso!', duration: 3000, style: { background: "#10b981" }, gravity: "bottom" }).showToast();
            await fetchRoles(); // reload the list
            
            // Refind and select
            const savedRole = roles.find(r => r.name === name);
            if (savedRole) loadRole(savedRole);

        } catch (err) {
            Toastify({ text: err.message, duration: 3000, style: { background: "#ef4444" }, gravity: "bottom" }).showToast();
        }
    };

    const promptDeleteRole = () => {
        if (!currentEditingRole) return;
        document.getElementById('deleteModalText').textContent = `Tem certeza que deseja excluir o perfil "${currentEditingRole.name}"? Esta ação não pode ser desfeita.`;
        document.getElementById('deleteModal').classList.remove('hidden');
    };

    const closeDeleteModal = () => {
        document.getElementById('deleteModal').classList.add('hidden');
    };

    const confirmDeleteRole = async () => {
        if (!currentEditingRole) return;
        closeDeleteModal();
        try {
            const res = await fetch(`/api/perfis/${currentEditingRole.name}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao excluir');

            Toastify({ text: 'Perfil excluído com sucesso!', duration: 3000, style: { background: "#10b981" }, gravity: "bottom" }).showToast();
            els.editor.classList.add('hidden');
            els.empty.classList.remove('hidden');
            currentEditingRole = null;
            await fetchRoles();

        } catch (err) {
            Toastify({ text: err.message, duration: 3000, style: { background: "#ef4444" }, gravity: "bottom" }).showToast();
        }
    };

    // Auto-focus no input quando digitar _ para formatar
    els.formName.addEventListener('input', function() {
        if (isCreating) {
            this.value = this.value.toUpperCase().replace(/\s/g, '_').replace(/[^A-Z0-9_]/g, '');
        }
    });

    // Boot
    fetchRoles();

    return { loadRole, createNew, moveItem, saveRole, promptDeleteRole, closeDeleteModal, confirmDeleteRole };
})();
