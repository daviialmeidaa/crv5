const xlsx = require('xlsx');
const data = [{ a: "1500.00" }, { a: 1500 }];
const ws = xlsx.utils.json_to_sheet(data);
console.log(ws);
