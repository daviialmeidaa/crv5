const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pgPool = require('../db/pgConnection');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { authMiddleware } = require('../middleware/authMiddleware');

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
    host: 'mail.nexomed.com.br',
    port: 465,
    secure: true,
    auth: {
        user: 'ti@nexomed.com.br',
        pass: '3&#AhEeBChh#'
    }
});

// Função para gerar senha forte
function generateRandomPassword(length = 10) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(0, charset.length);
        password += charset[randomIndex];
    }
    return password;
}

router.put('/profile', authMiddleware, async (req, res) => {
    const { nome, avatarBase64 } = req.body;
    const userId = req.user.id;

    if (!nome) {
        return res.status(400).json({ error: 'O nome é obrigatório' });
    }

    let avatarUrl = null;

    try {
        // Se a imagem for enviada em base64
        if (avatarBase64 && avatarBase64.startsWith('data:image')) {
            const matches = avatarBase64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
            
            if (matches && matches.length === 3) {
                const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');
                
                // Define o caminho físico (public/uploads/avatars/1.jpg)
                const fileName = `${userId}-${Date.now()}.${ext}`;
                const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
                const filePath = path.join(uploadDir, fileName);

                // Garante que o diretório existe
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                fs.writeFileSync(filePath, buffer);
                avatarUrl = `/uploads/avatars/${fileName}`;
            }
        }

        let query = 'UPDATE users SET nome = $1 WHERE id = $2 RETURNING id, nome, email, is_admin, first_access, avatar_url';
        let values = [nome, userId];

        if (avatarUrl) {
            query = 'UPDATE users SET nome = $1, avatar_url = $2 WHERE id = $3 RETURNING id, nome, email, is_admin, first_access, avatar_url';
            values = [nome, avatarUrl, userId];
        }

        const result = await pgPool.query(query, values);
        
        res.json({
            message: 'Perfil atualizado com sucesso!',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao atualizar perfil' });
    }
});

// Middleware auxiliar para verificar se é admin
const adminMiddleware = (req, res, next) => {
    if (!req.user || !req.user.is_admin) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    next();
};

// GET /api/users - Listar todos os usuários (apenas admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const result = await pgPool.query('SELECT id, nome, email, is_admin, avatar_url, first_access FROM users ORDER BY nome ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro interno ao listar usuários' });
    }
});

// POST /api/users - Cadastrar um novo usuário (apenas admin)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    const { nome, email, is_admin } = req.body;

    if (!nome || !email) {
        return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
    }

    try {
        // Verifica se já existe um usuário com esse email
        const checkEmail = await pgPool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (checkEmail.rows.length > 0) {
            return res.status(400).json({ error: 'Já existe um usuário cadastrado com esse e-mail.' });
        }

        // Gera a senha forte aleatória e faz o hash
        const generatedPassword = generateRandomPassword(10);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(generatedPassword, salt);

        // Insere no banco
        const result = await pgPool.query(
            `INSERT INTO users (nome, email, password_hash, is_admin, first_access, is_active)
             VALUES ($1, $2, $3, $4, true, true)
             RETURNING id, nome, email, is_admin`,
            [nome, email, passwordHash, is_admin === true || is_admin === 'true']
        );

        // Dispara o e-mail em background
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers.host || 'localhost:3000';
        const appUrl = `${protocol}://${host}`;

        const mailOptions = {
            from: '"Nexomed Sistemas" <ti@nexomed.com.br>',
            to: email,
            subject: 'Bem vindo ao Contas a Receber - Nexomed',
            html: `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; margin: 0;">
                <div style="max-width: 750px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    
                    <!-- Header -->
                    <div style="padding: 32px 32px 0 32px;">
                        <div style="display: inline-block; padding: 6px 12px; background-color: #e0f2f1; color: #00838F; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
                            Contas a Receber v5
                        </div>
                        <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.2;">
                            Bem-vindo(a) ao Contas a Receber v5 da Nexomed 👋
                        </h1>
                        <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0;">
                            Olá, <strong>${nome}</strong>! Sua conta de acesso foi criada com sucesso pelo administrador do sistema.
                        </p>
                    </div>

                    <!-- Credenciais Box -->
                    <div style="padding: 32px;">
                        <h3 style="color: #374151; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">
                            🔒 Suas Credenciais
                        </h3>
                        
                        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
                            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px;">E-mail (Login):</p>
                            <p style="margin: 0 0 16px 0; color: #111827; font-size: 15px; font-weight: 600;">${email}</p>
                            
                            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px;">Senha provisória:</p>
                            <p style="margin: 0; color: #0097A7; font-size: 18px; font-weight: 700; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${generatedPassword}</p>
                        </div>

                        <div style="margin-top: 24px; padding: 12px 16px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
                            <p style="margin: 0; color: #b45309; font-size: 13px; line-height: 1.5;">
                                ⚠️ No seu primeiro acesso, o sistema exigirá que você cadastre uma nova senha pessoal definitiva por questões de segurança.
                            </p>
                        </div>
                        
                        <div style="margin-top: 32px; text-align: center;">
                            <a href="${appUrl}/?force_logout=1" style="display: inline-block; background-color: #0097A7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">Acessar o Sistema</a>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f3f4f6; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="color: #6b7280; font-size: 12px; margin: 0;">
                            Este é um e-mail automático gerado pelo sistema interno Nexomed.<br>Por favor, não responda.
                        </p>
                    </div>
                </div>
            </div>
            `
        };

        transporter.sendMail(mailOptions).catch(err => {
            console.error('Erro ao enviar e-mail com a senha. Erro do Nodemailer:', err);
        });

        res.status(201).json({ message: 'Usuário cadastrado com sucesso! A senha foi enviada para o e-mail.', user: result.rows[0] });
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).json({ error: 'Erro interno ao cadastrar usuário' });
    }
});

// PUT /api/users/:id - Atualizar um usuário específico (apenas admin)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const { id } = req.params;
    const { nome, email, is_admin } = req.body;

    if (!nome || !email) {
        return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
    }

    try {
        const result = await pgPool.query(
            'UPDATE users SET nome = $1, email = $2, is_admin = $3 WHERE id = $4 RETURNING id, nome, email, is_admin, avatar_url',
            [nome, email, is_admin === true || is_admin === 'true', id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json({ message: 'Usuário atualizado com sucesso!', user: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar usuário' });
    }
});

// DELETE /api/users/:id - Excluir um usuário (apenas admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const { id } = req.params;

    // Prevenir que o admin se exclua
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Você não pode excluir a si mesmo.' });
    }

    try {
        const result = await pgPool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json({ message: 'Usuário excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ error: 'Erro interno ao excluir usuário' });
    }
});

module.exports = router;
