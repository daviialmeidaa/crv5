/**
 * Gerenciamento do Data Grid de Clientes
 * Grid com filtros em cascata, ordenação e paginação.
 */
const ClientesGrid = (() => {

    // ==========================================
    // 1. Definição das Colunas
    // ==========================================
    const columns = [
        { key: 'codigo', label: 'Código', type: 'number' },
        { key: 'razaoSocial', label: 'Razão Social' },
        { key: 'nomeFantasia', label: 'Nome Fantasia' },
        { key: 'cidade', label: 'Cidade' },
        { key: 'uf', label: 'UF' },
        { key: 'cnpj', label: 'CNPJ' }
    ];

    // ==========================================
    // 2. Estado Global
    // ==========================================
    const state = {
        rawData: [],
        filteredData: [],
        viewData: [],
        filters: {}, // { columnKey: Set(['val1', 'val2', '__NONE__']) }
        sort: { key: 'codigo', dir: 'asc' }, // Default sort: codigo ASC
        pagination: { current: 1, limit: 25, total: 0 }
    };


    // DOM Elements
    const elements = {
        searchInput: document.getElementById('searchClientInput'),
        tableHeader: document.getElementById('clientesTableHeader'),
        tableBody: document.getElementById('clientesTableBody'),
        itemsPerPage: document.getElementById('itemsPerPage'),
        btnClearFilters: document.getElementById('btnClearFilters')
    };

    // ==========================================
    // 3. Helper e Token
    // ==========================================
    const getToken = () => localStorage.getItem('token');

    // ==========================================
    // 4. Data Fetching
    // ==========================================
    const grid = HubDataGrid.create({
        bodyId: 'clientesTableBody',
        headerId: 'clientesTableHeader',
        infoId: 'paginationInfo',
        paginationId: 'paginationControls',
        pageSizeId: 'itemsPerPage',
        clearId: 'btnClearFilters',
        searchId: 'searchClientInput',
        columns,
        state,
        export: false,
        clearSearchOnReset: true,
        onRowClick: (row) => {
            window.location.href = '/clientes/' + row.codigo;
        },
        onRowAuxClick: (row, event) => {
            if (event.button === 1) window.open('/clientes/' + row.codigo, '_blank');
        }
    });

    const loadData = async () => {
        elements.tableBody.innerHTML = `<tr><td colspan="${columns.length}" class="px-6 py-12 text-center text-steel-400">Carregando clientes do Supra...</td></tr>`;
        
        try {
            const response = await fetch('/api/clientes', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            
            if (!response.ok) throw new Error('Erro ao buscar clientes');
            
            const data = await response.json();
            state.rawData = data || [];
            processData();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            elements.tableBody.innerHTML = `<tr><td colspan="${columns.length}" class="px-6 py-12 text-center text-red-500">Erro ao carregar dados do servidor.</td></tr>`;
        }
    };

    const processData = () => {
        grid.process();
    };

    // ==========================================
    // 5. Renderização (DOM)
    // ==========================================
    const renderHeaders = () => {
        grid.renderHeaders();
    };

    const renderTableBody = () => {
        grid.renderBody();
    };

    const renderPagination = () => {
        grid.pagination.render();
    };

    // ==========================================
    // 6. Lógica de Filtros Modal (Excel-like Padrão do Sistema)
    // ==========================================
    const openFilter = (event, colKey) => {
        grid.openFilter(event, colKey);
    };

    const closeFilterModal = () => grid.filters.close();

    // ==========================================
    // 7. Ações Expostas (Public API)
    // ==========================================
    const toggleSort = key => grid.toggleSort(key);

    const changePage = page => grid.setPage(page);

    const clearAllFilters = () => { elements.searchInput.value=''; grid.clearFilters(); };

    // Fechar modais ao clicar fora


    const init = () => { loadData(); };

    return {
        init,
        toggleSort,
        changePage,
        openFilter,
        clearAllFilters
    };

})();

document.addEventListener('DOMContentLoaded', ClientesGrid.init);
