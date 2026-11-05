document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Carregar dados do usuário
    const userStr = localStorage.getItem('user');
    let currentUser = null;

    if (userStr) {
        try {
            currentUser = JSON.parse(userStr);
            
            // Popula campos
            const nameInput = document.getElementById('profileName');
            const emailInput = document.getElementById('profileEmail');
            
            if (nameInput) nameInput.value = currentUser.nome || '';
            if (emailInput) emailInput.value = currentUser.email || '';

            // Popula Iniciais ou Imagem de Avatar
            const avatarDisplay = document.getElementById('profileAvatarDisplay');
            const initialsSpan = document.getElementById('profileInitials');
            
            if (currentUser.avatar_url && avatarDisplay) {
                avatarDisplay.innerHTML = `<img src="${currentUser.avatar_url}" alt="Avatar" class="w-full h-full object-cover">`;
            } else if (initialsSpan && currentUser.nome) {
                const parts = currentUser.nome.trim().split(' ').filter(n => n.length > 0);
                let initials = '';
                if (parts.length > 0) initials += parts[0][0];
                if (parts.length > 1) initials += parts[parts.length - 1][0];
                initialsSpan.textContent = initials.toUpperCase();
            }

        } catch (e) {
            console.error('Erro ao carregar dados do usuário no perfil', e);
        }
    }

    // 2. Upload de Foto com Cropper.js
    const avatarUpload = document.getElementById('avatarUpload');
    
    // Elementos do Modal de Crop
    const cropModal = document.getElementById('cropModal');
    const cropModalContent = document.getElementById('cropModalContent');
    const imageToCrop = document.getElementById('imageToCrop');
    const cropCancelBtn = document.getElementById('cropCancelBtn');
    const cropApplyBtn = document.getElementById('cropApplyBtn');
    const cropZoomIn = document.getElementById('cropZoomIn');
    const cropZoomOut = document.getElementById('cropZoomOut');
    let cropper = null;

    const closeCropModal = () => {
        cropModalContent.classList.remove('scale-100', 'opacity-100');
        cropModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            cropModal.classList.add('hidden');
            if (cropper) {
                cropper.destroy();
                cropper = null;
            }
            avatarUpload.value = ''; // Reseta input para permitir re-upload
            imageToCrop.src = '';
        }, 200);
    };

    if (avatarUpload) {
        avatarUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validação simples (2MB max)
                if (file.size > 2 * 1024 * 1024) {
                    if (window.showModal) {
                        window.showModal('Erro', 'A imagem é muito grande. O tamanho máximo permitido é 2MB.', 'error');
                    } else {
                        alert('A imagem é muito grande. O tamanho máximo permitido é 2MB.');
                    }
                    avatarUpload.value = ''; // reseta
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    // Inicializa imagem no modal
                    imageToCrop.src = event.target.result;
                    
                    // Exibe o modal
                    cropModal.classList.remove('hidden');
                    requestAnimationFrame(() => {
                        cropModalContent.classList.remove('scale-95', 'opacity-0');
                        cropModalContent.classList.add('scale-100', 'opacity-100');
                    });

                    // Instancia o Cropper
                    if (cropper) cropper.destroy();
                    cropper = new Cropper(imageToCrop, {
                        aspectRatio: 1, // Quadrado/Círculo
                        viewMode: 1, // Restringe a imagem a não sair do canvas
                        dragMode: 'move', // Permite arrastar a imagem em vez de desenhar crop box
                        autoCropArea: 1,
                        cropBoxResizable: false,
                        toggleDragModeOnDblclick: false,
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Ações do Modal de Crop
    if (cropCancelBtn) cropCancelBtn.addEventListener('click', closeCropModal);
    
    if (cropZoomIn) {
        cropZoomIn.addEventListener('click', () => {
            if (cropper) cropper.zoom(0.1);
        });
    }

    if (cropZoomOut) {
        cropZoomOut.addEventListener('click', () => {
            if (cropper) cropper.zoom(-0.1);
        });
    }

    if (cropApplyBtn) {
        cropApplyBtn.addEventListener('click', () => {
            if (!cropper) return;
            
            // Pega o canvas cortado com tamanho padronizado
            const canvas = cropper.getCroppedCanvas({
                width: 400,
                height: 400,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });

            // Converte para JPEG 80% qualidade
            const base64Image = canvas.toDataURL('image/jpeg', 0.8);
            
            // Exibe na bolinha de perfil do formulário
            const avatarDisplay = document.getElementById('profileAvatarDisplay');
            if (avatarDisplay) {
                avatarDisplay.innerHTML = `<img src="${base64Image}" alt="Novo Avatar" class="w-full h-full object-cover">`;
            }

            closeCropModal();
        });
    }

    // 3. Submissão do Formulário
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = profileForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            
            // Loading visual
            btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Salvando...`;
            btn.disabled = true;
            btn.classList.add('opacity-80', 'cursor-not-allowed');

            const newName = document.getElementById('profileName').value;
            let avatarBase64 = null;

            // Extrair Base64 se o usuário selecionou uma nova imagem
            const avatarDisplay = document.getElementById('profileAvatarDisplay');
            let avatarImg = null;
            if (avatarDisplay) {
                avatarImg = avatarDisplay.querySelector('img');
            }
            if (avatarImg && avatarImg.src.startsWith('data:image')) {
                avatarBase64 = avatarImg.src;
            }

            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error("Usuário não autenticado");

                const response = await fetch('/api/users/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ nome: newName, avatarBase64 })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Erro ao atualizar perfil.');
                }

                // Sucesso: atualiza localstorage
                if (currentUser && data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                }

                // Mostra Modal Customizado
                if (window.showModal) {
                    window.showModal('Sucesso', 'Seu perfil foi atualizado corretamente.', 'success');
                } else {
                    alert('Perfil atualizado com sucesso!');
                }

                // Aguarda 1 segundo e meio (tempo do modal aparecer e o user ler) para recarregar ou apenas atualiza o header sem reload
                // Optamos por recarregar a página para aplicar a foto no menu superior perfeitamente.
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (err) {
                console.error(err);
                if (window.showModal) {
                    window.showModal('Oops!', err.message || 'Houve um problema ao salvar.', 'error');
                } else {
                    alert('Erro: ' + err.message);
                }
            } finally {
                // Restaura botão
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.classList.remove('opacity-80', 'cursor-not-allowed');
            }
        });
    }
});
