// Shared presentation adapter for the item lists in the two invoice dialogs.
(function (root) {
    const titleCase = (value) =>
        String(value || '')
            .toLowerCase()
            .split(' ')
            .map((word) =>
                ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'com', 'por', 'para'].includes(word)
                    ? word
                    : word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join(' ');
    const decimal = (value) =>
        value == null
            ? '-'
            : Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    root.HubDataGrid.presets = {
        notaItems(options = {}) {
            return root.HubDataGrid.create({
                bodyId: 'modalItensBody',
                headerId: 'modalItensHeader',
                infoId: 'modalPaginationInfo',
                paginationId: 'modalPaginationControls',
                pageSizeId: 'modalItensPerPage',
                clearId: 'modalItensClear',
                exportId: 'modalItensExport',
                recordLabel: 'itens',
                state: {
                    rawData: [],
                    filters: {},
                    sort: { key: null, dir: 'asc' },
                    pagination: { current: 1, limit: 10, total: 0 }
                },
                ...(options.export === false ? {} : { exportOptions: { filename: 'itens_nota.xlsx' } }),
                columns: [
                    { key: 'prod_codigo', label: 'Cód. Produto', align: 'left' },
                    {
                        key: 'produto_nome',
                        label: 'Produto',
                        align: 'left',
                        wrap: true,
                        render: (value) => ({ text: titleCase(value) })
                    },
                    {
                        key: 'fabricante_nome',
                        label: 'Fabricante',
                        align: 'left',
                        render: (value) => ({ text: titleCase(value) })
                    },
                    { key: 'classificacao_fiscal', label: 'NCM', align: 'left' },
                    {
                        key: 'quantidade',
                        label: 'Qtd',
                        type: 'number',
                        align: 'right',
                        render: (value) => ({ text: decimal(value), numericValue: value })
                    },
                    { key: 'Unidade', label: 'Unid' },
                    {
                        key: 'valor_unitario',
                        label: 'Valor Unit.',
                        type: 'currency',
                        align: 'right',
                        render: (value) => ({ text: decimal(value), numericValue: value })
                    },
                    {
                        key: 'valor_total',
                        label: 'Valor Total',
                        type: 'currency',
                        align: 'right',
                        render: (value) => ({
                            text: decimal(value),
                            numericValue: value,
                            className: 'font-medium text-nexo-600 dark:text-nexo-400'
                        })
                    }
                ],
                ...options
            });
        }
    };
})(globalThis);
