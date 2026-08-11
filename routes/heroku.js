const express = require('express');
const router = express.Router();
const { authMiddleware: verifyToken } = require('../middleware/authMiddleware');

// Rota para resetar os dynos do heroku
router.post('/reset', verifyToken, async (req, res) => {
    try {
        const { role } = req.user;

        // Apenas ADMIN pode resetar dynos
        if (role !== 'ADMIN') {
            return res.status(403).json({ message: 'Acesso negado: Apenas administradores podem resetar o servidor.' });
        }

        const apiKey = process.env.HEROKU_API_KEY;
        const appName = process.env.HEROKU_APP_NAME;

        if (!apiKey || !appName) {
            return res.status(500).json({ 
                message: 'Variáveis de ambiente do Heroku não configuradas (HEROKU_API_KEY ou HEROKU_APP_NAME).' 
            });
        }

        // Faz a chamada para a API do Heroku para reiniciar todos os dynos do app usando fetch (nativo no Node 18+)
        const response = await fetch(`https://api.heroku.com/apps/${appName}/dynos`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.heroku+json; version=3',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Heroku API Error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json().catch(() => ({}));
        res.json({ message: 'Comando de reset enviado ao Heroku com sucesso.', data });

    } catch (error) {
        console.error('Erro ao resetar Heroku:', error.message);
        res.status(500).json({ 
            message: 'Erro ao tentar comunicar com a API do Heroku.',
            details: error.message
        });
    }
});

module.exports = router;
