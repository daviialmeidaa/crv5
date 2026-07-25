const xlsx = require('xlsx');

const workbook = xlsx.readFile('itens_arrematados.xlsx');

const result = {};

workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    // Get the first few rows just to see the headers and data types
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    if (data.length > 0) {
        result[sheetName] = {
            headers: data[0],
            rowCount: data.length - 1,
            sampleRow: data[1] || []
        };
    } else {
        result[sheetName] = { headers: [], rowCount: 0 };
    }
});

console.log(JSON.stringify(result, null, 2));
