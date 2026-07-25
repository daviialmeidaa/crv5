document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cadastroForm');
    const adminToggleContainer = document.getElementById('adminToggleContainer');
    
    // Verifica permissões do usuário
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = currentUser.role === 'ADMIN';

    // Desabilitar a opção ADMIN se o usuário não for ADMIN
    const userRoleSelect = document.getElementById('userRole');
    if (userRoleSelect && !isSuperAdmin) {
        Array.from(userRoleSelect.options).forEach(opt => {
            opt.disabled = opt.value === 'ADMIN';
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
