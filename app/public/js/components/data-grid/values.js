(function (root) {
    'use strict';
    const EMPTY = Symbol('empty'),
        NONE = Symbol('none');
    const isEmpty = (value) => value == null || value === '' || value === '-';
    const escape = (value) =>
        String(value ?? '').replace(
            /[&<>"']/g,
            (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
        );
    function numeric(value) {
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        if (isEmpty(value)) return null;
        const text = String(value).trim();
        const number = Number(text);
        if (Number.isFinite(number)) return number;
        const localized = Number(text.replace(/\./g, '').replace(',', '.'));
        return Number.isFinite(localized) ? localized : null;
    }
    function dateParts(value) {
        if (isEmpty(value) || value === EMPTY) return null;
        if (value instanceof Date) {
            if (Number.isNaN(value.getTime())) return null;
            return [value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()];
        }
        const text = String(value);
        let match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s|$)/);
        let parts = match ? match.slice(1).map(Number) : null;
        if (!parts && (match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)))
            parts = [Number(match[3]), Number(match[2]), Number(match[1])];
        if (!parts) return null;
        const date = new Date(0);
        date.setUTCFullYear(parts[0], parts[1] - 1, parts[2]);
        date.setUTCHours(0, 0, 0, 0);
        return date.getUTCFullYear() === parts[0] &&
            date.getUTCMonth() + 1 === parts[1] &&
            date.getUTCDate() === parts[2]
            ? parts
            : null;
    }
    function date(value) {
        const parts = dateParts(value);
        return parts
            ? `${String(parts[2]).padStart(2, '0')}/${String(parts[1]).padStart(2, '0')}/${parts[0]}`
            : isEmpty(value)
              ? '-'
              : String(value);
    }
    function currency(value) {
        const number = numeric(value);
        return number === null ? '-' : number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    // Dates, descriptions and identifiers containing letters are not partial numbers.
    function selectionNumber(value) {
        let text = String(value ?? '').trim();
        if (!text || /\d{1,4}[/:]\d{1,2}/.test(text) || /^\d{4}-\d{2}-\d{2}/.test(text)) return null;
        const negative = /^\(.*\)$/.test(text);
        text = text
            .replace(/^\(|\)$/g, '')
            .replace(/R\$/g, '')
            .replace(/\s|\u00a0/g, '');
        if (!/^[+-]?(?:\d+(?:\.\d{3})*(?:,\d+)?|\d+\.\d+)$/.test(text)) return null;
        const number = Number(
            text.includes(',')
                ? text.replace(/\./g, '').replace(',', '.')
                : /^[-+]?\d{1,3}(?:\.\d{3})+$/.test(text)
                  ? text.replace(/\./g, '')
                  : text
        );
        return Number.isFinite(number) ? (negative ? -Math.abs(number) : number) : null;
    }
    const values = {
        EMPTY,
        NONE,
        isEmpty,
        escape,
        numeric,
        dateParts,
        date,
        currency,
        selectionNumber,
        filterKey: (value, column) => {
            if (value == null || value === '') return EMPTY;
            const parts = column?.type === 'date' ? dateParts(value) : null;
            return parts
                ? `${String(parts[0]).padStart(4, '0')}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`
                : String(value);
        },
        value: (row, col) => (col.value ? col.value(row) : row[col.key])
    };
    (root.HubDataGridParts ||= {}).values = values;
    if (typeof module !== 'undefined' && module.exports) module.exports = values;
})(globalThis);
