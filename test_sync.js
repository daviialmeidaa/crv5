const fs = require('fs');
const content = fs.readFileSync('public/js/cirurgias.js', 'utf8');
const match = content.match(/async syncNotasFiscais\(\) \{([\s\S]*?)\}/);
console.log(match ? match[0] : 'not found');
