const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// Public HTML URLs retained for compatibility; internal pages render app/views.
const pages = {
    "agenda_licitacoes": "html/agenda_licitacoes/index.html",
    "403": "html/403/index.html",
    "perfil": "html/perfil/index.html",
    "itens_arrematados": "html/itens_arrematados/index.html",
    "cliente_detalhe": "html/cliente_detalhe/index.html",
    "perfis": "html/perfis/index.html",
    "contas_a_receber": "html/contas_a_receber/index.html",
    "reset_heroku": "html/reset_heroku/index.html",
    "cirurgias": "html/cirurgias/index.html",
    "dashboard": "html/dashboard/index.html",
    "clientes": "html/clientes/index.html",
    "usuarios": "html/usuarios/index.html",
    "custos_produtos": "html/custos_produtos/index.html",
    "cadastro_usuario": "html/cadastro_usuario/index.html",
    "primeiro_acesso": "html/primeiro_acesso/index.html",
    "index": "html/login/index.html"
};

// Compatibilidade com caminhos anteriores e links ja distribuidos.
const legacyScripts = {
    "agenda_licitacoes.js": "js/pages/agenda_licitacoes/agenda_licitacoes.js",
    "custos_produtos.js": "js/pages/custos_produtos/custos_produtos.js",
    "itens_arrematados.js": "js/pages/itens_arrematados/itens_arrematados.js",
    "clientes.js": "js/pages/clientes/clientes.js",
    "cliente_detalhe.js": "js/pages/cliente_detalhe/cliente_detalhe.js",
    "primeiro_acesso.js": "js/pages/primeiro_acesso/primeiro_acesso.js",
    "contas_a_receber_v3.js": "js/pages/contas_a_receber/contas_a_receber_v3.js",
    "auth_guard.js": "js/shared/auth_guard.js",
    "perfil.js": "js/pages/perfil/perfil.js",
    "login.js": "js/pages/login/login.js",
    "theme.js": "js/components/navbar/theme-toggle.js",
    "cell_selector.js": "js/shared/cell_selector.js",
    "cirurgias.js": "js/pages/cirurgias/cirurgias.js",
    "dashboard.js": "js/pages/dashboard/dashboard.js",
    "cadastro_usuario.js": "js/pages/cadastro_usuario/cadastro_usuario.js",
    "usuarios.js": "js/pages/usuarios/usuarios.js",
    "notifications.js": "js/components/navbar/notifications.js",
    "perfis.js": "js/pages/perfis/perfis.js",
    "reset_heroku.js": "js/pages/reset_heroku/reset_heroku.js",
    "layout.js": "js/shared/layout.js"
};

function pageFile(name) {
    return path.join(publicDir, pages[name]);
}

module.exports = { publicDir, pages, legacyScripts, pageFile };
