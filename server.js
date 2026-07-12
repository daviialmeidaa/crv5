require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Arquivos estáticos do frontend (HTML, CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Rotas da API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/titulos', require('./routes/titulos'));
app.use('/api/contratos', require('./routes/contratos'));
app.use('/api/users', require('./routes/users'));
app.use('/api/metas', require('./routes/metas'));

// Rota padrão cai no index (Login)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Nova rota para Contas a Receber
app.get('/contas_a_receber', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contas_a_receber.html'));
});

// Nova rota para Dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Nova rota para Usuários
app.get('/usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'usuarios.html'));
});

// Nova rota para Cadastro de Usuário
app.get('/cadastro_usuario', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cadastro_usuario.html'));
});

// Nova rota para Primeiro Acesso
app.get('/primeiro_acesso', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'primeiro_acesso.html'));
});

// Nova rota para Perfil
app.get('/perfil', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'perfil.html'));
});

const cron = require('node-cron');
const { runSync } = require('./services/syncService');

// Iniciando o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🔗 Acesse: http://localhost:${PORT}`);
    
    // Configura o Cron Job para rodar a cada 15 minutos
    cron.schedule('*/15 * * * *', async () => {
        console.log('⏰ Executando Sincronização Automática via Cron...');
        try {
            await runSync();
        } catch (err) {
            console.error('❌ Falha no Cron Job de Sincronização:', err.message);
        }
    });
});
