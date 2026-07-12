const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pgPool = require('../db/pgConnection');
const { JWT_SECRET, authMiddleware } = require('../middleware/authMiddleware');

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    try {
        // Buscar usuário no PostgreSQL
        const result = await pgPool.query(
            'SELECT id, nome, email, password_hash, is_admin, first_access, is_active, avatar_url FROM users WHERE email = $1',
            [email]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Email ou senha inválidos' });
        }

        // Verificar se o usuário está ativo
        if (!user.is_active) {
            return res.status(403).json({ error: 'Usuário desativado. Contate o administrador.' });
        }

        // Verificar a senha usando bcrypt
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Email ou senha inválidos' });
        }

        // Gerar o JWT Token válido por 8 horas
        const token = jwt.sign(
            { 
                id: user.id, 
                nome: user.nome, 
                email: user.email, 
                is_admin: user.is_admin 
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Login realizado com sucesso!',
            token,
            user: { 
                id: user.id, 
                nome: user.nome, 
                email: user.email, 
                is_admin: user.is_admin,
                first_access: user.first_access,
                avatar_url: user.avatar_url
            }
        });

    } catch (err) {
        console.error('Erro na rota de login:', err);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// Rota protegida para validar token
router.get('/me', authMiddleware, (req, res) => {
    res.json({
        message: 'Autenticado com sucesso!',
        user: req.user
    });
});

// POST /api/auth/first_access - Alterar senha inicial
router.post('/first_access', authMiddleware, async (req, res) => {
    const { new_password } = req.body;
    const userId = req.user.id;

    if (!new_password) {
        return res.status(400).json({ error: 'A nova senha é obrigatória.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(new_password, salt);

        await pgPool.query(
            'UPDATE users SET password_hash = $1, first_access = false WHERE id = $2',
            [passwordHash, userId]
        );

        res.json({ message: 'Senha atualizada com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar senha no primeiro acesso:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar a senha.' });
    }
});

module.exports = router;
