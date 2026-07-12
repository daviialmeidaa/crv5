const xlsx = require('xlsx');
const workbook = xlsx.readFile('contas a receber base inicial.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { defval: "", raw: false });
let c = 0;
for(const row of data) {
  if (row['Nº Documento'] && row['Nº Documento'].toString().includes('040352')) {
     console.log('Row raw:false:', row['Nº Documento']);
     c++;
  }
}
const data2 = xlsx.utils.sheet_to_json(sheet, { defval: "", raw: true });
let c2 = 0;
for(const row of data2) {
  if (row['Nº Documento'] && row['Nº Documento'].toString().includes('040352')) {
     console.log('Row raw:true:', row['Nº Documento']);
     c2++;
  }
}
