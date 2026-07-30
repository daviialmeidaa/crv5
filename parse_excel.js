const xlsx = require('xlsx');
const workbook = xlsx.readFile('AGENDA_LICITACAO.xlsx', {cellDates: true});
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);
console.log("First row:");
console.dir(data[0]);
