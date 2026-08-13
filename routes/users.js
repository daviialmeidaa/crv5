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

        const updatedUser = result.rows[0];
        const { getPermissionsForRole } = require('../middleware/rbac');
        updatedUser.permissions = getPermissionsForRole(updatedUser.role);

        res.json({
            message: 'Perfil atualizado com sucesso!',
            user: updatedUser
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
            subject: 'Bem vindo ao HUB - Nexomed',
            html: `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header with Logo -->
                    <div style="background-color: #111827; padding: 24px 32px; text-align: center; border-bottom: 4px solid #0097A7;">
                        <img src="https://hub.nexomed.com.br/assets/images/logo.png" alt="Nexomed" style="height: 32px; display: inline-block; outline: none; text-decoration: none;">
                    </div>

                    <!-- Content -->
                    <div style="padding: 40px 32px;">
                        <h1 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.3;">
                            Bem-vindo(a) à Nexomed
                        </h1>
                        <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                            Olá, <strong>${nome}</strong>.<br><br>
                            Sua conta para acesso ao HUB de Ferramentas da Nexomed, acaba de ser criada. Abaixo estão suas credenciais para realizar o primeiro acesso.
                        </p>
                        
                        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 24px; margin-bottom: 24px;">
                            <h3 style="color: #374151; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px 0;">
                                Detalhes do Acesso
                            </h3>
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: none;">
                                <tr>
                                    <td style="padding: 0 0 12px 0; color: #6b7280; font-size: 14px; width: 80px;">Usuário:</td>
                                    <td style="padding: 0 0 12px 0; color: #111827; font-size: 14px; font-weight: 600;">${email}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 0; color: #6b7280; font-size: 14px;">Senha:</td>
                                    <td style="padding: 0; color: #0097A7; font-size: 16px; font-weight: 700; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${generatedPassword}</td>
                                </tr>
                            </table>
                        </div>

                        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 32px;">
                            <p style="margin: 0; color: #b45309; font-size: 14px; line-height: 1.5;">
                                <strong>Aviso de Segurança:</strong> Por razões de segurança, o sistema exigirá a alteração desta senha provisória no seu primeiro login.
                            </p>
                        </div>
                        
                        <div style="text-align: center;">
                            <a href="${appUrl}/?force_logout=1" style="display: inline-block; background-color: #0097A7; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">Acessar o Sistema</a>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">
                            © ${new Date().getFullYear()} Nexomed. Todos os direitos reservados.<br>
                            Esta é uma mensagem automática. Por favor, não responda.
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
