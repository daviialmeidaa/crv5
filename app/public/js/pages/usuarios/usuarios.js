document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('usersTableBody');
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const modalContent = editModal.querySelector('div:nth-child(2)');
    let usersList = [];

    // Permissões do usuário atual
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const canManageUsers = currentUser.permissions?.canManageUsers === true;
    const isSuperAdmin = currentUser.role && currentUser.role.trim().toUpperCase() === 'ADMIN';

    const getRoleLevel = (role) => {
        if (!role) return 0;
        const upper = role.trim().toUpperCase();
        if (upper === 'ADMIN') return 999;
        if (upper.startsWith('CR') || upper.startsWith('LC')) {
            const num = parseInt(upper.replace(/\D/g, ''));
            return isNaN(num) ? 0 : num;
        }
        return 0;
    };
    const myLevel = getRoleLevel(currentUser.role);

    const canAssignRole = (myRole, targetRole) => {
        if (!myRole || !targetRole) return false;
        const myUpper = myRole.trim().toUpperCase();
        const targetUpper = targetRole.trim().toUpperCase();
        
        if (myUpper === 'ADMIN') return true;
        if (targetUpper === 'ADMIN') return false; // Non-admins can't assign ADMIN

        const myLvl = getRoleLevel(myRole);
        const targetLvl = getRoleLevel(targetRole);

        if (myLvl > 0) {
            const myPrefix = myUpper.substring(0, 2);
            const targetPrefix = targetUpper.substring(0, 2);
            if (myPrefix === targetPrefix && targetLvl <= myLvl) return true;
            return false;
        }

        // Roles customizadas (level 0) podem atribuir outras roles customizadas, mas não CR/LC
        if (targetLvl === 0) return true;
        return false;
    };

    // Fechar modal
    const closeModal = () => {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => editModal.classList.add('hidden'), 200);
    };

    document.getElementById('editCancelBtn').addEventListener('click', closeModal);
    document.getElementById('editCancelBtnIcon').addEventListener('click', closeModal);
    document.getElementById('editModalOverlay').addEventListener('click', closeModal);

    const loadUsers = async () => {
        try {
            tableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-steel-500">Carregando usuários...</td></tr>';
            const response = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Acesso negado');
            
            usersList = await response.json();
            renderTable(usersList);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-red-500 font-medium">Erro ao carregar usuários. Acesso restrito a administradores.</td></tr>`;
        }
    };

    const grid = HubDataGrid.create({
        bodyId: 'usersTableBody',
        headerId: 'usersTableHeader',
        infoId: 'usersPaginationInfo',
        paginationId: 'usersPaginationControls',
        pageSizeId: 'usersPerPage',
        clearId: 'usersGridClear',
        export: false,
        columns: [
            {
                key: 'nome',
                label: 'Usuário',
                align: 'left',
                render: (_value, user) => {
                    const box = document.createElement('div');
                    box.className = 'flex items-center gap-3';
                    let avatar;
                    if (user.avatar_url) {
                        avatar = document.createElement('img');
                        avatar.src = user.avatar_url;
                        avatar.alt = user.nome || 'Avatar';
                        avatar.className = 'w-8 h-8 rounded-full object-cover';
                    } else {
                        avatar = document.createElement('div');
                        avatar.className =
                            'w-8 h-8 rounded-full bg-nexo-600 flex items-center justify-center text-xs font-bold text-white';
                        avatar.textContent = (user.nome || 'U').charAt(0).toUpperCase();
                    }
                    const label = document.createElement('span');
                    label.className = 'font-medium';
                    label.textContent = user.nome || '-';
                    box.append(avatar, label);
                    return box;
                }
            },
            { key: 'email', label: 'E-mail', align: 'left' },
            {
                key: 'role',
                label: 'Acesso',
                render: (value) => {
                    const badge = document.createElement('span');
                    badge.className =
                        'inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ' +
                        (value?.trim().toUpperCase() === 'ADMIN'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : value?.startsWith('CR')
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : value?.startsWith('LC')
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-gray-100 text-steel-600 dark:bg-steel-800 dark:text-steel-400');
                    badge.textContent = value || '-';
                    return badge;
                }
            },
            {
                key: '_actions',
                label: 'Ações',
                type: 'actions',
                render: (_value, user) =>
                    canManageUsers && canAssignRole(currentUser.role, user.role)
                        ? HubDataGrid.components.Actions.group([
                              HubDataGrid.components.Actions.button({
                                  label: 'Editar Usuário',
                                  icon: 'edit',
                                  onClick: () => window.openEditModal(user.id)
                              }),
                              HubDataGrid.components.Actions.button({
                                  label: 'Excluir Usuário',
                                  icon: 'delete',
                                  danger: true,
                                  onClick: () => window.deleteUser(user.id)
                              })
                          ])
                        : '<span class="text-xs text-steel-400 italic">Restrito</span>'
            }
        ]
    });

    const renderTable = (users) => grid.setData(users, true);

    let loadedRoles = [];
    const loadRoles = async () => {
        try {
            const res = await fetch('/api/perfis', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!res.ok) throw new Error('Falha ao buscar perfis');
            loadedRoles = await res.json();
            
            const editRoleSelect = document.getElementById('editRole');
            if (!editRoleSelect) return;
            
            editRoleSelect.innerHTML = '<option value="" disabled>Selecione um perfil...</option>';
            
            loadedRoles.forEach(perfil => {
                const opt = document.createElement('option');
                opt.value = perfil.name;
                opt.textContent = perfil.name;
                editRoleSelect.appendChild(opt);
            });
        } catch(e) {
            console.error(e);
        }
    };
    loadRoles();

    window.openEditModal = (id) => {
        const user = usersList.find(u => u.id === id);
        if (!user) return;
        
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editName').value = user.nome;
        document.getElementById('editEmail').value = user.email;
        
        const editRoleSelect = document.getElementById('editRole');
        editRoleSelect.innerHTML = '';
        loadedRoles.forEach(role => {
            const opt = document.createElement('option');
            opt.value = role.name;
            opt.textContent = role.name;
            const isRestricted = !canAssignRole(currentUser.role, role.name) && role.name.trim().toUpperCase() !== user.role.trim().toUpperCase();
            opt.disabled = isRestricted;
            opt.hidden = isRestricted;
            editRoleSelect.appendChild(opt);
        });
        editRoleSelect.value = user.role;
        
        editModal.classList.remove('hidden');
        setTimeout(() => {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
    };

    window.deleteUser = async (id) => {
        if (!confirm('Tem certeza que deseja excluir permanentemente este usuário?')) return;
        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            Toastify({ text: data.message, duration: 3000, style: { background: "#10b981" }, gravity: "bottom" }).showToast();
            loadUsers();
        } catch (err) {
            Toastify({ text: err.message, duration: 3000, style: { background: "#ef4444" }, gravity: "bottom" }).showToast();
        }
    };

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editUserId').value;
        const nome = document.getElementById('editName').value;
        const email = document.getElementById('editEmail').value;
        const role = document.getElementById('editRole').value;

        const submitBtn = editForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Salvando...';
        submitBtn.disabled = true;

        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nome, email, role })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            Toastify({ text: data.message, duration: 3000, style: { background: "#10b981" }, gravity: "bottom" }).showToast();
            closeModal();
            loadUsers();
        } catch (err) {
            Toastify({ text: err.message, duration: 3000, style: { background: "#ef4444" }, gravity: "bottom" }).showToast();
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    loadUsers();
});
