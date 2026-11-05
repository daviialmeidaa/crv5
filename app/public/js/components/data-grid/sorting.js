(function (root) {
    'use strict';
    const parts = root.HubDataGridParts,
        V = parts.values;
    class Sorting {
        static compare(a, b, column = {}) {
            if (V.isEmpty(a) && V.isEmpty(b)) return 0;
            if (V.isEmpty(a)) return 1;
            if (V.isEmpty(b)) return -1;
            if (['number', 'currency', 'deadline', 'percent'].includes(column.type)) {
                if (/^[+-]?\d+$/.test(String(a)) && /^[+-]?\d+$/.test(String(b))) {
                    const left = BigInt(String(a)),
                        right = BigInt(String(b));
                    return left < right ? -1 : left > right ? 1 : 0;
                }
                a = V.numeric(a);
                b = V.numeric(b);
            } else if (column.type === 'date') {
                const toKey = (value) => {
                    const p = V.dateParts(value);
                    return p ? p[0] * 10000 + p[1] * 100 + p[2] : null;
                };
                a = toKey(a);
                b = toKey(b);
            } else {
                a = String(a).toLowerCase();
                b = String(b).toLowerCase();
            }
            if (a == null && b == null) return 0;
            if (a == null) return 1;
            if (b == null) return -1;
            return a < b ? -1 : a > b ? 1 : 0;
        }
        static apply(rows, columns, sort, options = {}) {
            const result = rows.slice();
            const col = columns.find((column) => column.key === sort.key);
            if (!col || col.sortable === false || col.type === 'actions')
                return options.defaultCompare ? result.sort(options.defaultCompare) : result;
            const dir = sort.dir === 'desc' ? -1 : 1;
            return result.sort((a, b) => {
                const va = V.value(a, col),
                    vb = V.value(b, col);
                // Missing/invalid values stay at the end for both directions.
                const empty = (value) =>
                    V.isEmpty(value) ||
                    (col.type === 'date' && !V.dateParts(value)) ||
                    (['number', 'currency', 'deadline', 'percent'].includes(col.type) &&
                        V.numeric(value) === null);
                if (empty(va) || empty(vb)) return empty(va) === empty(vb) ? 0 : empty(va) ? 1 : -1;
                const comparison = col.compare ? col.compare(va, vb, a, b) : Sorting.compare(va, vb, col);
                return comparison ? comparison * dir : options.tieBreaker ? options.tieBreaker(a, b) : 0;
            });
        }
    }
    parts.Sorting = Sorting;
    if (typeof module !== 'undefined' && module.exports) module.exports = Sorting;
})(globalThis);
