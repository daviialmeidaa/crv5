document.addEventListener('DOMContentLoaded', () => {
    // Verifica se há token
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        window.location.href = '/';
        return;
    }

    let user;
    try {
        user = JSON.parse(userStr);
    } catch (e) {
        window.location.href = '/';
        return;
    }

    // Se o usuário não estiver em primeiro acesso, não deveria estar aqui
    if (user.first_access !== true) {
        window.location.href = '/dashboard';
        return;
    }

    const firstAccessForm = document.getElementById('firstAccessForm');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const submitBtn = document.getElementById('submitBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const btnText = document.getElementById('btnText');

    firstAccessForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Esconder erros anteriores
        errorMessage.classList.add('hidden');

        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            errorText.textContent = "As senhas não coincidem. Tente novamente.";
            errorMessage.classList.remove('hidden');
            return;
        }

        if (newPassword.length < 6) {
            errorText.textContent = "A senha deve ter pelo menos 6 caracteres.";
            errorMessage.classList.remove('hidden');
            return;
        }

        // UI Loading State
        submitBtn.disabled = true;
        btnText.textContent = 'Salvando...';
        loadingSpinner.classList.remove('hidden');

        try {
            const response = await fetch('/api/auth/first_access', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ new_password: newPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao alterar a senha.');
            }

            // Sucesso! Atualiza o localStorage do user
            user.first_access = false;
            localStorage.setItem('user', JSON.stringify(user));

            // Redireciona para o dashboard
            window.location.href = '/dashboard';

        } catch (error) {
            errorText.textContent = error.message;
            errorMessage.classList.remove('hidden');
            
            submitBtn.disabled = false;
            btnText.textContent = 'Salvar Senha e Acessar';
            loadingSpinner.classList.add('hidden');
        }
    });
});
