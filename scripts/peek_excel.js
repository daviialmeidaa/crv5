const xlsx = require('xlsx');

try {
    const workbook = xlsx.readFile('contrato_insert.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    console.log(`Linhas: ${data.length}`);
    if (data.length > 0) {
        console.log("Colunas encontradas:", Object.keys(data[0]));
        console.log("Primeira linha:", data[0]);
    }
} catch (e) {
    console.error(e);
}
