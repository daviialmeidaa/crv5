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
        if (upper === 'ADMIN') return 5;
        if (upper.startsWith('CR') || upper.startsWith('LC')) {
            const num = parseInt(upper.replace(/\D/g, ''));
            return isNaN(num) ? 0 : num;
        }
        return 0;
    };
    const myLevel = getRoleLevel(currentUser.role);

    const canInteractWithRole = (myRole, targetRole) => {
        if (!myRole || !targetRole) return false;
        const myLvl = getRoleLevel(myRole);
        const targetLvl = getRoleLevel(targetRole);
        if (targetLvl > myLvl) return false;
        if (myLvl < 4 && myRole.trim().toUpperCase() !== 'ADMIN') {
            const myPrefix = myRole.trim().toUpperCase().substring(0, 2);
            const targetPrefix = targetRole.trim().toUpperCase().substring(0, 2);
            if (myPrefix !== targetPrefix) return false;
        }
        return true;
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

    const renderTable = (users) => {
        if (!users.length) {
            tableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-steel-500">Nenhum usuário encontrado.</td></tr>';
            return;
        }

        tableBody.innerHTML = users.map(user => `
            <tr class="hover:bg-gray-50/50 dark:hover:bg-steel-800/50 transition-colors group">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        ${user.avatar_url 
                            ? `<img src="${user.avatar_url}" alt="${user.nome}" class="w-8 h-8 rounded-full object-cover bg-steel-200 shadow-sm border border-gray-100 dark:border-steel-700">`
                            : `<div class="w-8 h-8 rounded-full bg-nexo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">${user.nome.charAt(0).toUpperCase()}</div>`
                        }
                        <span class="font-medium text-steel-800 dark:text-gray-200">${user.nome}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-steel-600 dark:text-steel-400">${user.email}</td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role.trim().toUpperCase() === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' :
                        user.role.startsWith('CR') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' :
                        user.role.startsWith('LC') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' :
                        'bg-gray-100 text-steel-600 dark:bg-steel-800 dark:text-steel-400 border-gray-200 dark:border-steel-700'
                    } border shadow-sm">
                        ${user.role}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    ${(canManageUsers && canInteractWithRole(currentUser.role, user.role)) ? `
                    <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="window.openEditModal(${user.id})" class="p-1.5 text-steel-400 hover:text-nexo-600 hover:bg-nexo-50 dark:hover:bg-steel-700 rounded transition-colors" title="Editar Usuário">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button onclick="window.deleteUser(${user.id})" class="p-1.5 text-steel-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-steel-700 rounded transition-colors" title="Excluir Usuário">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>` : '<span class="text-xs text-steel-400 italic">Restrito</span>'}
                </td>
            </tr>
        `).join('');
    };

    window.openEditModal = (id) => {
        const user = usersList.find(u => u.id === id);
        if (!user) return;
        
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editName').value = user.nome;
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editRole').value = user.role;
        // Se o usuário logado não for ADMIN, não pode setar outro como ADMIN
        const editRoleSelect = document.getElementById('editRole');
        if (!isSuperAdmin) {
            Array.from(editRoleSelect.options).forEach(opt => {
                const isRestricted = !canInteractWithRole(currentUser.role, opt.value);
                opt.disabled = isRestricted;
                opt.hidden = isRestricted;
            });
        }
        
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
