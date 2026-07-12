document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cadastroForm');
    const adminToggleContainer = document.getElementById('adminToggleContainer');
    
    // Verifica se o usuário atual é admin para exibir o toggle
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser.is_admin !== true) {
        if (adminToggleContainer) {
            adminToggleContainer.style.display = 'none';
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const is_admin = document.getElementById('userIsAdmin').checked;

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
                body: JSON.stringify({ nome, email, is_admin })
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
