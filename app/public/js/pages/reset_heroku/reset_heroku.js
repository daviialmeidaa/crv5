document.addEventListener('DOMContentLoaded', () => {
    const btnRestart = document.getElementById('btnRestart');
    const logContainer = document.getElementById('logContainer');
    const cursor = document.getElementById('terminalCursor');

    function appendLog(message, isError = false, isSuccess = false) {
        const div = document.createElement('div');
        div.textContent = `[${new Date().toLocaleTimeString()}] > ${message}`;
        if (isError) {
            div.className = 'text-red-400 font-bold';
        } else if (isSuccess) {
            div.className = 'text-nexo-400 font-bold';
        } else {
            div.className = 'text-gray-300';
        }
        logContainer.appendChild(div);
        
        // Mantém o scroll sempre embaixo
        const terminalBody = document.getElementById('terminalBody');
        terminalBody.scrollTop = terminalBody.scrollHeight;
    }

    async function checkServerStatus() {
        try {
            // Tenta acessar a página principal. 
            // Se o servidor estiver reiniciando (Heroku), vai dar timeout, 502, ou 503.
            const response = await fetch('/', { 
                method: 'GET',
                // Evita usar cache para termos o status real
                cache: 'no-store'
            });
            
            if (response.ok) {
                return true;
            }
            return false;
        } catch (error) {
            // Network error (servidor indisponível)
            return false;
        }
    }

    btnRestart.addEventListener('click', async () => {
        // Confirmação
        if (!confirm('ATENÇÃO: Você tem certeza que deseja reiniciar TODOS os dynos da aplicação no Heroku? O sistema ficará fora do ar por alguns segundos.')) {
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            appendLog('Erro: Token de autenticação não encontrado. Faça login novamente.', true);
            return;
        }

        btnRestart.disabled = true;
        btnRestart.classList.add('opacity-50', 'cursor-not-allowed');
        btnRestart.innerHTML = `
            <svg class="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processando...
        `;

        logContainer.innerHTML = '';
        appendLog('Iniciando sequência de reinício (Restart All Dynos)...');
        appendLog('Autenticando via API do Heroku...');

        try {
            const response = await fetch('/api/heroku/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                appendLog(`Erro ao enviar comando: ${errorData.message}`, true);
                throw new Error(errorData.message || 'Erro interno.');
            }

            const data = await response.json();
            appendLog('Comando aceito com sucesso pelo Heroku.', false, true);
            appendLog('Sinal de SIGTERM enviado aos Dynos atuais. Desligando processos Node.js...');
            
            // Inicia o Loop de Pinging para verificar quando volta
            appendLog('Iniciando monitoramento de Health Check...');
            
            let attempts = 0;
            const maxAttempts = 30; // 30 * 3 = 90 segundos limite
            let isOnline = false;
            
            // Aguarda 3 segundos antes do primeiro ping, pois o Heroku leva um tempinho para derrubar
            await new Promise(r => setTimeout(r, 3000));

            const pingInterval = setInterval(async () => {
                attempts++;
                appendLog(`Health Check (Ping ${attempts}/${maxAttempts})...`);
                
                isOnline = await checkServerStatus();

                if (isOnline) {
                    clearInterval(pingInterval);
                    cursor.classList.remove('blink');
                    appendLog('✔️ SUCESSO: O servidor está ONLINE novamente e respondendo requisições!', false, true);
                    appendLog('Processo de reinício concluído. O sistema está normalizado.', false, true);
                    
                    btnRestart.disabled = false;
                    btnRestart.classList.remove('opacity-50', 'cursor-not-allowed');
                    btnRestart.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Confirmar e Reiniciar
                    `;
                } else {
                    if (attempts >= maxAttempts) {
                        clearInterval(pingInterval);
                        appendLog('Aviso: O tempo limite de espera foi atingido (90s). O servidor ainda não está respondendo, mas pode estar em processo de boot (Build/Start).', true);
                        
                        btnRestart.disabled = false;
                        btnRestart.classList.remove('opacity-50', 'cursor-not-allowed');
                        btnRestart.innerHTML = `Confirmar e Reiniciar`;
                    }
                }
            }, 3000);

        } catch (error) {
            appendLog(`Falha no processo: ${error.message}`, true);
            btnRestart.disabled = false;
            btnRestart.classList.remove('opacity-50', 'cursor-not-allowed');
            btnRestart.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Confirmar e Reiniciar
            `;
        }
    });
});
