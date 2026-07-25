document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cadastroForm');
    const adminToggleContainer = document.getElementById('adminToggleContainer');
    
    // Verifica permissões do usuário
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = currentUser.role === 'ADMIN';

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

    // Ocultar as opções maiores do que o nível do usuário
    const userRoleSelect = document.getElementById('userRole');
    if (userRoleSelect && !isSuperAdmin) {
        Array.from(userRoleSelect.options).forEach(opt => {
            const isRestricted = !canInteractWithRole(currentUser.role, opt.value);
            opt.disabled = isRestricted;
            opt.hidden = isRestricted;
        });
    }

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
