const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pgPool = require('../db/pgConnection');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requirePermission, getRoleLevel, canInteractWithRole } = require('../middleware/rbac');

// Configuração do Nodemailer
/* 
// Histórico: Configuração anterior (HostGator)
const transporter = nodemailer.createTransport({
    host: 'mail.nexomed.com.br',
    port: 465,
    secure: true,
    auth: {
        user: 'ti@nexomed.com.br',
        pass: '3&#AhEeBChh#'
    }
});
*/

// Nova Configuração: Google Workspace (Gmail)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'davi.almeida@iebtinnovation.com',
        pass: process.env.GMAIL_APP_PASSWORD
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
            // No Heroku, o sistema de arquivos é efêmero (apagado a cada deploy/restart)
            // Para não precisar de AWS S3, vamos salvar o Base64 diretamente no banco de dados.
            avatarUrl = avatarBase64;
        }

        let query = 'UPDATE users SET nome = $1 WHERE id = $2 RETURNING id, nome, email, role, first_access, avatar_url';
        let values = [nome, userId];

        if (avatarUrl) {
            query = 'UPDATE users SET nome = $1, avatar_url = $2 WHERE id = $3 RETURNING id, nome, email, role, first_access, avatar_url';
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

// GET /api/users - Listar todos os usuários (requer canViewUsers)
router.get('/', authMiddleware, requirePermission('canViewUsers'), async (req, res) => {
    try {
        const result = await pgPool.query('SELECT id, nome, email, role, avatar_url, first_access FROM users ORDER BY role ASC, nome ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro interno ao listar usuários' });
    }
});

// POST /api/users - Cadastrar um novo usuário (requer canManageUsers)
router.post('/', authMiddleware, requirePermission('canManageUsers'), async (req, res) => {
    const { nome, email, role } = req.body;

    if (!nome || !email || !role) {
        return res.status(400).json({ error: 'Nome, e-mail e perfil são obrigatórios.' });
    }

    // Regra de segurança hierárquica e departamental
    if (!canInteractWithRole(req.user.role, role)) {
        return res.status(403).json({ error: 'Você não tem permissão para criar um usuário com este perfil (nível superior ou departamento diferente).' });
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
            `INSERT INTO users (nome, email, password_hash, role, first_access, is_active)
             VALUES ($1, $2, $3, $4, true, true)
             RETURNING id, nome, email, role`,
            [nome, email, passwordHash, role]
        );

        // Dispara o e-mail em background
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers.host || 'painel.nexomed.com.br:3000';
        const appUrl = `${protocol}://${host}`;

        const mailOptions = {
            // from: '"Nexomed Sistemas" <ti@nexomed.com.br>', // Histórico
            from: '"Nexomed Sistemas" <davi.almeida@iebtinnovation.com>',
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

// PUT /api/users/:id - Atualizar um usuário específico (requer canManageUsers)
router.put('/:id', authMiddleware, requirePermission('canManageUsers'), async (req, res) => {
    const { id } = req.params;
    const { nome, email, role } = req.body;

    if (!nome || !email || !role) {
        return res.status(400).json({ error: 'Nome, e-mail e perfil são obrigatórios.' });
    }

    // Regra de segurança hierárquica e departamental: Não pode promover alguém para nível/departamento não permitido
    if (!canInteractWithRole(req.user.role, role)) {
        return res.status(403).json({ error: 'Você não pode alterar o perfil deste usuário para um perfil não permitido pelo seu nível/departamento.' });
    }

    try {
        // Verifica se está tentando alterar um usuário que tem perfil maior/diferente
        const targetUser = await pgPool.query('SELECT role FROM users WHERE id = $1', [id]);
        if (targetUser.rows.length > 0) {
            if (!canInteractWithRole(req.user.role, targetUser.rows[0].role)) {
                return res.status(403).json({ error: 'Você não tem permissão para alterar os dados deste perfil (nível superior ou departamento diferente).' });
            }
        }

        const result = await pgPool.query(
            'UPDATE users SET nome = $1, email = $2, role = $3 WHERE id = $4 RETURNING id, nome, email, role, avatar_url',
            [nome, email, role, id]
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

// DELETE /api/users/:id - Excluir um usuário
router.delete('/:id', authMiddleware, requirePermission('canManageUsers'), async (req, res) => {
    const { id } = req.params;

    // Prevenir que o usuário se exclua
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Você não pode excluir a si mesmo.' });
    }

    try {
        // Verifica se está tentando excluir um perfil restrito
        const targetUser = await pgPool.query('SELECT role FROM users WHERE id = $1', [id]);
        
        if (targetUser.rows.length > 0) {
            if (!canInteractWithRole(req.user.role, targetUser.rows[0].role)) {
                return res.status(403).json({ error: 'Você não tem permissão para excluir este usuário (nível superior ou departamento diferente).' });
            }
        }

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
