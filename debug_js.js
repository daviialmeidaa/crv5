const fs = require('fs');
const code = fs.readFileSync('public/js/agenda_licitacoes.js', 'utf8');

try {
  // test syntax
  const acorn = require('acorn');
  acorn.parse(code, { ecmaVersion: 2020 });
  console.log("Syntax is OK");
} catch(e) {
  console.log("Syntax Error:", e.message);
}
