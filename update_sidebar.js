const fs = require('fs');

const files = [
  'public/usuarios.html',
  'public/dashboard.html',
  'public/contas_a_receber.html',
  'public/cadastro_usuario.html',
  'public/itens_arrematados.html',
  'public/perfil.html'
];

const newLink = `                        <a href="/agenda_licitacoes"
                            class="flex items-center gap-2 py-2 text-[14px] font-medium text-steel-400 hover:text-white transition-colors sidebar-text">
                            <span class="w-1.5 h-1.5 rounded-full border border-current opacity-60 flex-shrink-0"></span>
                            Agenda
                        </a>
`;

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('Agenda')) {
    console.log(`Already updated ${file}`);
    return;
  }
  
  const searchStr = '<div class="sidebar-submenu hidden pl-[44px] pr-4 py-1 space-y-1">\n                        <a href="/itens_arrematados"';
  
  if (content.includes(searchStr)) {
    content = content.replace(searchStr, '<div class="sidebar-submenu hidden pl-[44px] pr-4 py-1 space-y-1">\n' + newLink + '                        <a href="/itens_arrematados"');
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`Could not find replace string in ${file}`);
  }
});
