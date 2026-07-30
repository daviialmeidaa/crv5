const fs = require('fs');

let js = fs.readFileSync('public/js/itens_arrematados.js', 'utf8');

// Rename IA to AL
js = js.replace(/const IA = \(\(\) => \{/g, 'const AL = (() => {');
js = js.replace(/window\.IA = IA;/g, 'window.AL = AL;');
js = js.replace(/IA\./g, 'AL.');

// Replace column definitions
const oldColumns = `    const columns = [
        { key: 'COD_CONTRATO_CONCAT', label: 'Contrato', link: true },
        { key: 'EDITAL', label: 'Edital' },
        { key: 'ORGAO', label: 'Órgão' },
        { key: 'MUNICIPIO', label: 'Município' },
        { key: 'UF', label: 'UF' },
        { key: 'TIPO_CONTRATO', label: 'Tipo Contrato' },
        { key: 'CLASSIFICACAO', label: 'Classificação' },
        { key: 'MATERIAL', label: 'Material' },
        { key: 'QTDE', label: 'Qtde', type: 'number' },
        { key: 'VALOR_UNITARIO', label: 'Vlr. Unit.', type: 'currency' },
        { key: 'VALOR_TOTAL', label: 'Vlr. Total', type: 'currency' },
        { key: 'SITUACAO_STATUS', label: 'Status' },
        { key: 'DATA_INICIO', label: 'Início', type: 'date' },
        { key: 'DATA_TERMINO', label: 'Término', type: 'date' },
        { key: 'VIGENCIA', label: 'Vigência' },
    ];`;

const newColumns = `    const columns = [
        { key: 'data_limite', label: 'Data Limite da Proposta', type: 'date' },
        { key: 'hora_limite', label: 'Hora Limite da Proposta' },
        { key: 'data_lances', label: 'Data dos Lances', type: 'date' },
        { key: 'hora_lances', label: 'Horário dos Lances' },
        { key: 'modalidade', label: 'Modalidade' },
        { key: 'pregao', label: 'Nº do Pregão' },
        { key: 'orgao', label: 'Órgão/Instituição' },
        { key: 'uf', label: 'UF' },
        { key: 'categoria', label: 'Categoria/Classe do Material' },
        { key: 'objeto', label: 'Objeto/Especialidade' },
        { key: 'portal', label: 'Portal/Plataforma do Pregão' },
        { key: 'empresa', label: 'Empresa Participante' },
        { key: 'data_cadastro', label: 'Data de Cadastro da Proposta', type: 'date' },
        { key: 'observacoes_status', label: 'Observações/Status' },
        { key: 'antecedencia', label: 'Antecedência do Cadastro (Dia Útil)', type: 'number' }
    ];`;

js = js.replace(oldColumns, newColumns);

// Fix fetch URL
js = js.replace(/\/api\/itens_arrematados/g, '/api/agenda_licitacoes');
js = js.replace(/\?participante=/g, '?empresa=');

// Fix specific rendering formatting
// Replace occurrences of SITUACAO_STATUS formatting with observacoes_status formatting where relevant
js = js.replace(/getStatusBadge\(row\.SITUACAO_STATUS\)/g, 'getStatusBadge(row.observacoes_status)');
js = js.replace(/const val = col\.key === 'SITUACAO_STATUS' \? getStatusBadge\(row\[col\.key\]\) : row\[col\.key\];/g, 
  `let val = row[col.key];
   if (col.key === 'observacoes_status') val = getStatusBadge(val);
  `);
  
// Fix HTML element IDs reference in JS
js = js.replace(/iaTableHeader/g, 'alTableHeader');
js = js.replace(/iaTableBody/g, 'alTableBody');
js = js.replace(/Itens Arrematados/g, 'Agenda de Licitações');
js = js.replace(/Item Arrematado/g, 'Item da Agenda');
js = js.replace(/IA_NEXOMED/g, 'AL_NEXOMED');

// Since the columns don't have COD_CONTRATO_CONCAT anymore, let's fix the cell rendering logic if it checks for it
js = js.replace(/if \(col\.key === 'COD_CONTRATO_CONCAT'\) \{[\s\S]*?\} else if/g, 'if');

// Update data access since we don't need COD_CONTRATO logic for opening modal
// Remove openModal(row.CHAVE) from the first column if any, and make it standard unless we want a modal
// Wait, for Agenda, we just render the text. The user wants the same grid.

fs.writeFileSync('public/js/agenda_licitacoes.js', js);
console.log('JS File Generated');
