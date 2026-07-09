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
            'SELECT id, nome, email, password_hash, is_admin, first_access, is_active FROM users WHERE email = $1',
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
                first_access: user.first_access
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

module.exports = router;
