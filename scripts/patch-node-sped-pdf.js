const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../node_modules/node-sped-pdf/dist/index.js');
if (fs.existsSync(targetPath)) {
    let content = fs.readFileSync(targetPath, 'utf8');
    
    // 1. Linhas contínuas e remoção de marca d'água oculta
    content = content.replace(/dashArray:\s*\[5,\s*3\]/g, '');
    content = content.replace(/"Powered by @node-sped-pdf"/g, '""');
    
    // 2. Altura mais espaçada nas linhas de produtos
    content = content.replace(/line \+= xProdH \* 6\.9;/g, 'line += (xProdH * 6.9) + 8; lIndex += 1.15;');

    // 3. Aumentar a área de Dados Adicionais na primeira página
    // Diminui o limite do grid de produtos na primeira página (152 no lugar de 72 garante 80 pontos a mais)
    content = content.replace(/blockH = PDF\.height - PDF\.mtBlock - 72;/g, 'blockH = PDF.height - PDF.mtBlock - 152;');
    // Aumenta os retângulos de 40 para 120
    content = content.replace(/addRet\(page, 0, PDF\.mtBlock \+ 8, PDF\.width, 40\);/g, 'addRet(page, 0, PDF.mtBlock + 8, PDF.width, 120);');
    content = content.replace(/addRet\(page, 0, PDF\.mtBlock \+ 8, PDF\.width \* 0\.65, 40\);/g, 'addRet(page, 0, PDF.mtBlock + 8, PDF.width * 0.65, 120);');
    // Aumenta o cursor final
    content = content.replace(/PDF\.mtBlock \+= 40;/g, 'PDF.mtBlock += 120;');

    fs.writeFileSync(targetPath, content, 'utf8');
    console.log('node-sped-pdf patched successfully.');
}
