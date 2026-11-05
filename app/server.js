require('dotenv').config();
process.env.TZ = 'America/Sao_Paulo';
const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const { publicDir, pages, legacyScripts } = require('./config/publicPaths');

const { configureViews, sendPage } = require('./services/pageRenderer');

const app = express();
configureViews(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(compression({
    filter: (req, res) => {
        if (req.headers['accept'] === 'text/event-stream') {
            return false; // Não comprime SSE (impede o buffering das notificações)
        }
        return compression.filter(req, res);
    }
}));
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Preserve the previous physical HTML URLs after moving internal pages to views.
for (const [name, relativePath] of Object.entries(pages)) {
    app.get('/' + relativePath, (req, res) => sendPage(res, name));
}
// Preserve nested script URLs used by previously distributed pages.
app.get('/js/shared/theme.js', (req, res) => res.sendFile(path.join(publicDir, legacyScripts['theme.js'])));
app.get('/js/shared/notifications.js', (req, res) => res.sendFile(path.join(publicDir, legacyScripts['notifications.js'])));

// Arquivos estáticos do frontend (HTML, CSS, JS, Images)
app.use(express.static(publicDir));
app.use('/assets', express.static(path.join(publicDir, 'assets')));

// Preserva os caminhos de arquivos acessiveis antes da reorganizacao.
for (const name of Object.keys(pages)) {
    app.get('/' + name + '.html', (req, res) => sendPage(res, name));
}
for (const [name, relativePath] of Object.entries(legacyScripts)) {
    app.get('/js/' + name, (req, res) => res.sendFile(path.join(publicDir, relativePath)));
}

// Rotas da API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/titulos', require('./routes/titulos'));
app.use('/api/contratos', require('./routes/contratos'));
app.use('/api/users', require('./routes/users'));
app.use('/api/metas', require('./routes/metas'));
app.use('/api/notas', require('./routes/notas'));
app.use('/api/itens_arrematados', require('./routes/itens_arrematados'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/agenda_licitacoes', require('./routes/agenda_licitacoes'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/heroku', require('./routes/heroku'));
app.use('/api/vba', require('./routes/vba_integration'));
const { createFastapiProxy } = require('./services/fastapiProxy');
app.use('/docs', createFastapiProxy());
app.use('/api/docs', createFastapiProxy());
app.use('/api/openapi.json', createFastapiProxy());
app.use('/api/perfis', require('./routes/perfis'));
app.use('/api/opme', require('./routes/opme'));
app.use('/api/financeiro', require('./routes/financeiro'));

// Rota padrão cai no index (Login)
app.get('/', (req, res) => {
    sendPage(res, 'index');
});

// Nova rota para Contas a Receber
app.get('/contas_a_receber', (req, res) => {
    sendPage(res, 'contas_a_receber');
});

// Nova rota para Perfis
app.get('/perfis', (req, res) => {
    sendPage(res, 'perfis');
});

// Nova rota para Cobrança (Clientes)
app.get('/clientes', (req, res) => {
    sendPage(res, 'clientes');
});

// Nova rota para Custos Produtos
app.get('/custos_produtos', (req, res) => {
    sendPage(res, 'custos_produtos');
});

// Detalhe do Cliente (rota parametrizada)
app.get('/clientes/:id', (req, res) => {
    sendPage(res, 'cliente_detalhe');
});

// Nova rota para Itens Arrematados
app.get('/itens_arrematados', (req, res) => {
    sendPage(res, 'itens_arrematados');
});

// Nova rota para Agenda de Licitações
app.get('/agenda_licitacoes', (req, res) => {
    sendPage(res, 'agenda_licitacoes');
});

// Nova rota para Dashboard
app.get('/cirurgias', (req, res) => {
    sendPage(res, 'cirurgias');
});

app.get('/dashboard', (req, res) => {
    sendPage(res, 'dashboard');
});

// Nova rota para Usuários
app.get('/usuarios', (req, res) => {
    sendPage(res, 'usuarios');
});

// Nova rota para Cadastro de Usuário
app.get('/cadastro_usuario', (req, res) => {
    sendPage(res, 'cadastro_usuario');
});

// Nova rota para Primeiro Acesso
app.get('/primeiro_acesso', (req, res) => {
    sendPage(res, 'primeiro_acesso');
});

// Nova rota para Perfil
app.get('/perfil', (req, res) => {
    sendPage(res, 'perfil');
});

// Nova rota para Reset do Heroku
app.get('/reset-heroku', (req, res) => {
    sendPage(res, 'reset_heroku');
});

app.get('/403', (req, res) => {
    sendPage(res, '403');
});

const cron = require('node-cron');
const { runSync } = require('./services/syncService');
const { initAgendaCron } = require('./services/cron_agenda');
const { initCobrancaCron, initCobrancaLiveReminders } = require('./services/cron_cobranca');

const pgPool = require('./db/pgConnection');
const { loadCustomRoles } = require('./middleware/rbac');

// Iniciar os Cron Jobs
// initAgendaCron(); // Removido para evitar duplicidade com o script standalone (Heroku/OS Scheduler)
// initCobrancaCron(); // Removido para evitar duplicidade com o script standalone (Heroku/OS Scheduler)
initCobrancaLiveReminders();

// Iniciando o servidor
loadCustomRoles(pgPool).then(() => {
    require('./services/notificationBridge').start();
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
        console.log(`🔗 Acesse: http://localhost:${PORT}`);
        
        // A inicialização do Cron da Agenda foi removida daqui, pois o Heroku Scheduler é o responsável pelos disparos.

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
});
