document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cadastroForm');
    const adminToggleContainer = document.getElementById('adminToggleContainer');
    
    // Verifica permissões do usuário
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = currentUser.role === 'ADMIN';

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

    const loadRoles = async () => {
        try {
            const res = await fetch('/api/perfis', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!res.ok) throw new Error('Falha ao buscar perfis');
            const perfis = await res.json();
            
            const userRoleSelect = document.getElementById('userRole');
            if (!userRoleSelect) return;
            
            userRoleSelect.innerHTML = '<option value="" disabled selected>Selecione um perfil...</option>';
            
            perfis.forEach(perfil => {
                const opt = document.createElement('option');
                opt.value = perfil.name;
                opt.textContent = perfil.name;
                
                // Aplicar RBAC do frontend
                if (!isSuperAdmin) {
                    const isRestricted = !canAssignRole(currentUser.role, perfil.name);
                    if (isRestricted) {
                        opt.disabled = true;
                        opt.hidden = true;
                    }
                }
                
                userRoleSelect.appendChild(opt);
            });
            
        } catch (err) {
            console.error(err);
            const userRoleSelect = document.getElementById('userRole');
            if (userRoleSelect) {
                userRoleSelect.innerHTML = '<option value="" disabled selected>Erro ao carregar perfis</option>';
            }
        }
    };
    
    // Iniciar carregamento dos perfis
    loadRoles();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const role = document.getElementById('userRole').value;

        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Salvando...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ nome, email, role })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao cadastrar usuário.');
            }

            Toastify({
                text: data.message,
                duration: 3000,
                style: { background: "#10b981" },
                gravity: "bottom"
            }).showToast();

            // Limpar formulário
            form.reset();

        } catch (error) {
            Toastify({
                text: error.message,
                duration: 4000,
                style: { background: "#ef4444" },
                gravity: "bottom"
            }).showToast();
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
});
