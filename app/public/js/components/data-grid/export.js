(function (root) {
    'use strict';
    const V = root.HubDataGridParts.values;
    class Exporter {
        static rows(data, columns, options = {}) {
            const exported = columns.filter(
                (col) => col.type !== 'actions' && col.type !== 'input' && col.exportable !== false
            );
            return data.map((row) => {
                const output = {};
                exported.forEach((col) => {
                    let value = options.value
                        ? options.value(row, col)
                        : col.exportValue
                          ? col.exportValue(row)
                          : V.value(row, col);
                    if (col.type === 'date') value = V.isEmpty(value) ? '' : V.date(value);
                    else if (
                        ['currency', 'number', 'deadline', 'percent'].includes(col.type) &&
                        !V.isEmpty(value)
                    ) {
                        // Excel numbers have 15 significant digits: preserve large identifiers as text.
                        if (!(typeof value === 'string' && value.replace(/\D/g, '').length > 15))
                            value = V.numeric(value) ?? value;
                    } else if (col.type === 'boolean') value = value ? 'Sim' : 'Não';
                    output[col.label] = value ?? '';
                });
                return Object.assign(output, options.extraValues ? options.extraValues(row) : {});
            });
        }
        static write(data, columns, options = {}) {
            if (!root.XLSX) throw new Error('Biblioteca de exportação não carregada.');
            const rows = Exporter.rows(data, columns, options),
                sheet = root.XLSX.utils.json_to_sheet(rows);
            sheet['!cols'] = Object.keys(rows[0] || {}).map((label) => ({
                wch: Math.min(50, Math.max(12, label.length + 2))
            }));
            if (options.accounting && sheet['!ref']) {
                const range = root.XLSX.utils.decode_range(sheet['!ref']);
                for (let r = 1; r <= range.e.r; r++)
                    for (let c = 0; c <= range.e.c; c++) {
                        const cell = sheet[root.XLSX.utils.encode_cell({ r, c })];
                        if (cell?.t === 'n') cell.z = '#,##0.00;(#,##0.00)';
                    }
            }
            const workbook = root.XLSX.utils.book_new();
            root.XLSX.utils.book_append_sheet(workbook, sheet, (options.sheetName || 'Dados').slice(0, 31));
            const filename = options.filename || 'dados.xlsx';
            root.XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : filename + '.xlsx');
            return workbook;
        }
    }
    root.HubDataGridParts.Exporter = Exporter;
    if (typeof module !== 'undefined' && module.exports) module.exports = Exporter;
})(globalThis);
