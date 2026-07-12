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
        const mailOptions = {
            from: '"Nexomed Sistemas" <ti@nexomed.com.br>',
            to: email,
            subject: 'Bem-vindo à Nexomed - Suas credenciais de acesso',
            html: `
            <div style="font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                    
                    <!-- Header with Gradient -->
                    <div style="background: linear-gradient(135deg, #00838F 0%, #0097A7 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: 2px;">NEXOMED</h1>
                        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Contas a Receber v5</p>
                    </div>

                    <!-- Body -->
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 20px 0;">Olá, ${nome}!</h2>
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                            Sua conta de acesso ao nosso sistema financeiro foi gerada com sucesso. Preparamos um ambiente seguro e de alta performance para você.
                        </p>

                        <!-- Credenciais Card -->
                        <div style="background-color: #1f2937; border-radius: 12px; padding: 30px; position: relative; overflow: hidden;">
                            <!-- Decorative element -->
                            <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background-color: #0097A7;"></div>
                            
                            <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Credenciais de Acesso</p>
                            
                            <div style="margin-bottom: 20px;">
                                <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">Usuário / E-mail</p>
                                <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 600;">${email}</p>
                            </div>

                            <div>
                                <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">Senha Provisória</p>
                                <p style="margin: 0; color: #00E5FF; font-size: 24px; font-weight: 700; letter-spacing: 2px;">${generatedPassword}</p>
                            </div>
                        </div>

                        <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 30px 0 0 0; padding-left: 15px; border-left: 3px solid #e5e7eb;">
                            ⚠️ <strong>Atenção:</strong> Por razões de segurança corporativa, no seu primeiro login será exigido que você cadastre uma nova senha pessoal definitiva.
                        </p>

                        <!-- Acesso Button -->
                        <div style="text-align: center; margin-top: 40px;">
                            <span style="display: inline-block; background-color: #0097A7; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 151, 167, 0.25);">Acesse pelo Servidor Local</span>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
                            Este é um e-mail automático gerado pelo sistema interno Nexomed.<br>Por favor, não responda a esta mensagem.
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
