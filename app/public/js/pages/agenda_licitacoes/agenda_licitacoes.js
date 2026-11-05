/**
 * Agenda de Licitações - Frontend Controller v2
 * Grid idêntico ao Contas a Receber: filtros em cascata, tipografia, hover, paginação.
 * Modal de Contrato ao clicar no número do contrato.
 */
const AL = (() => {

    // ==========================================
    // 1. Definição das Colunas
    // ==========================================
    const columns = [
        { key: 'data_limite', label: 'Data Limite da Proposta', type: 'date' },
        { key: 'hora_limite', label: 'Hora Limite da Proposta' },
        { key: 'data_lances', label: 'Data dos Lances', type: 'date' },
        { key: 'hora_lances', label: 'Horário dos Lances' },
        { key: 'modalidade', label: 'Modalidade' },
        { key: 'pregao', label: 'Nº do Pregão' },
        { key: 'orgao', label: 'Órgão/Instituição' },
        { key: 'uf', label: 'UF' },
        { key: 'categoria', label: 'Categoria/Classe do Material' },
        { key: 'objeto', label: 'Objeto/Especialidade' },
        { key: 'portal', label: 'Portal/Plataforma do Pregão' },
        { key: 'data_cadastro', label: 'Data de Cadastro da Proposta', type: 'date' },
        { key: 'observacoes_status', label: 'Observações/Status' },
        { key: 'antecedencia', label: 'Antecedência do Cadastro (Dia Útil)', type: 'number' }
    ];

    // ==========================================
    // 2. Estado Global
    // ==========================================
    const state = {
        rawData: [],
        filteredData: [],
        viewData: [],
        filters: {},
        sort: { key: null, dir: 'desc' },
        pagination: { current: 1, limit: 25, total: 0 }
    };

    let currentTab = 'NEXOMED';

    // ==========================================
    // 3. Helpers e Permissões
    // ==========================================
    let userRole = '';
    try {
        const u = JSON.parse(localStorage.getItem('user'));
        if (u && u.role) userRole = u.role;
    } catch(e) {}
    const canDelete = ['ADMIN', 'LC3', 'LC4'].includes(userRole);

    function formatCurrency(val) {
        if (val === null || val === undefined || val === '' || val === '-') return '-';
        const num = parseFloat(val);
        if (isNaN(num)) return val;
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatDate(val) {
        if (!val || val === '-') return '-';
        if (typeof val === 'string' && val.includes('-') && val.length >= 10) {
            const parts = val.split('T')[0].split('-');
            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return val;
    }

    function getStatusBadge(v) {
        if (!v || v === '-') return '-';
        return String(v).toUpperCase();
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.className = `toast ${type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-amber-500' : 'bg-emerald-600'} text-white`;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
    }

    function getToken() { return localStorage.getItem('token'); }

    // ==========================================
    // 4. Data Fetching
    // ==========================================
    const gridColumns = [
        ...columns.map((col) => ({
            ...col,
            wrap: true,
            align: 'center'
        })),
        {
            key: '_actions',
            label: 'Excluir',
            type: 'actions',
            render: (_value, row) =>
                canDelete
                    ? HubDataGrid.components.Actions.button({
                          label: 'Excluir',
                          icon: 'delete',
                          danger: true,
                          onClick: () => requestDelete(row.CHAVE)
                      })
                    : '-'
        }
    ];
    const grid = HubDataGrid.create({
        bodyId: 'alTableBody',
        headerId: 'alTableHeader',
        infoId: 'paginationInfo',
        paginationId: 'paginationControls',
        pageSizeId: 'itemsPerPage',
        clearId: 'btnClearFilters',
        state,
        columns: gridColumns,
        headerLayout: 'inline',

        onRowClick: (row) => openModal(row.CHAVE),
        onEmptyExport: () => showToast('Nenhum dado para exportar', 'warning'),
        renderCell: (value, col, row) => {
            if (col.type === 'actions') return col.render(value, row);
            if (col.key === 'SITUACAO_STATUS') return HubDataGrid.components.values.escape(getStatusBadge(value));
            if (col.type === 'date')
                return HubDataGrid.components.values.escape(HubDataGrid.components.values.date(value));
            if (col.type === 'currency') return formatCurrency(value);
            let text = value == null || value === '' ? '-' : String(value);
            if (['ORGAO', 'MUNICIPIO', 'UF', 'CLASSIFICACAO', 'MATERIAL'].includes(col.key))
                text = text.toUpperCase();
            text = HubDataGrid.components.values.escape(text);
            return col.link ? '<span class="font-medium">' + text + '</span>' : text;
        }
    });

    async function fetchData() {
        document.getElementById('tableLoading').classList.remove('hidden');
        try {
            const param = `?empresa=${currentTab}`;
            const response = await fetch(`/api/agenda_licitacoes${param}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!response.ok) throw new Error('Erro ao buscar dados');
            state.rawData = await response.json();
            state.filters = {};
            state.pagination.current = 1;
            processData();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            showToast('Erro ao carregar dados do servidor', 'error');
            document.getElementById('alTableBody').innerHTML = `<tr><td colspan="${columns.length + 1}" class="px-6 py-12 text-center text-red-500">Erro ao carregar dados do servidor.</td></tr>`;
        } finally {
            document.getElementById('tableLoading').classList.add('hidden');
        }
    }

    // ==========================================
    // 6. Pipeline: Filtro -> Ordenação -> Paginação
    // ==========================================
    function processData() {
        grid.process();
    }

    // ==========================================
    // 7. Renderização (DOM) — Idêntico ao Contas a Receber
    // ==========================================
    function renderHeaders() {
        grid.renderHeaders();
    }

    function renderTableBody() {
        grid.renderBody();
    }

    // ==========================================
    // 8. Paginação — Idêntica ao Contas a Receber (SVGs)
    // ==========================================
    function renderPagination() {
        grid.pagination.render();
    }

    // ==========================================
    // 9. Filtros em Cascata (idênticos ao Contas a Receber)
    // ==========================================
    function openFilter(event, colKey) {
        grid.openFilter(event, colKey);
    }

    function closeFilter() {
        grid.filters.close();
    }


    // ==========================================
        // ==========================================
    // 10. Lógica de Dias Úteis
    // ==========================================
    function calculateBusinessDays(startDate, endDate) {
        if (!startDate || !endDate) return '';
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

        // Ignorar tempo
        start.setUTCHours(0,0,0,0);
        end.setUTCHours(0,0,0,0);

        if (start > end) return '';

        let count = 0;
        let current = new Date(start);

        while (current <= end) {
            const dayOfWeek = current.getUTCDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                count++;
            }
            current.setUTCDate(current.getUTCDate() + 1);
        }

        return count;
    }

    function initBusinessDaysAutoCalc() {
        const inputCadastro = document.getElementById('formDataCadastro');
        const inputLimite = document.getElementById('formDataLimite');
        const inputAntecedencia = document.getElementById('formAntecedencia');

        const updateCalc = () => {
            const valCadastro = inputCadastro.value;
            const valLimite = inputLimite.value;
            if (valCadastro && valLimite) {
                const result = calculateBusinessDays(valCadastro, valLimite);
                inputAntecedencia.value = result;
            } else {
                inputAntecedencia.value = '';
            }
        };

        if (inputCadastro && inputLimite) {
            inputCadastro.addEventListener('change', updateCalc);
            inputLimite.addEventListener('change', updateCalc);
        }
    }

    // ==========================================
    // 11. CRUD Modal (Criar / Editar Item)
    // ==========================================
    let editingChave = null;
    let deleteChave = null;

    function openModal(chave = null) {
        editingChave = chave;
        const modal = document.getElementById('itemModal');
        const title = document.getElementById('modalTitle');
        const deleteBtn = document.getElementById('btnDeleteFromModal');
        const form = document.getElementById('itemForm');

        form.reset();

        if (chave) {
            // Edição
            const item = state.rawData.find(r => String(r.CHAVE) === String(chave));
            if (!item) return;

            title.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-nexo-500 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> Editar Item ${chave}`;
            if (deleteBtn && canDelete) deleteBtn.classList.remove('hidden');

            const empSel = document.getElementById('formEmpresa');
            empSel.value = item.empresa || currentTab;
            empSel.disabled = true;
            document.getElementById('formPregao').value = item.pregao || '';
            document.getElementById('formModalidade').value = item.modalidade || '';
            document.getElementById('formOrgao').value = item.orgao || '';
            document.getElementById('formUF').value = item.uf || '';
            document.getElementById('formCategoria').value = item.categoria || '';
            document.getElementById('formObjeto').value = item.objeto || '';
            document.getElementById('formPortal').value = item.portal || '';
            document.getElementById('formObservacoes').value = item.observacoes_status || '';

            // Datas
            const inputCadastro = document.getElementById('formDataCadastro');
            const inputLimite = document.getElementById('formDataLimite');
            const inputLances = document.getElementById('formDataLances');
            const horaLimite = document.getElementById('formHoraLimite');
            const horaLances = document.getElementById('formHoraLances');

            inputCadastro.value = item.data_cadastro ? item.data_cadastro.split('T')[0] : '';
            inputLimite.value = item.data_limite ? item.data_limite.split('T')[0] : '';
            horaLimite.value = item.hora_limite || '';
            inputLances.value = item.data_lances ? item.data_lances.split('T')[0] : '';
            horaLances.value = item.hora_lances || '';
            document.getElementById('formAntecedencia').value = item.antecedencia !== null ? item.antecedencia : '';

            // Sincronizar com datepickers visuais customizados
            inputCadastro.dispatchEvent(new Event('change'));
            inputLimite.dispatchEvent(new Event('change'));
            inputLances.dispatchEvent(new Event('change'));
            horaLimite.dispatchEvent(new Event('change'));
            horaLances.dispatchEvent(new Event('change'));

        } else {
            // Criação
            title.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-nexo-500 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg> Novo Item da Agenda`;
            if (deleteBtn) deleteBtn.classList.add('hidden');
            const empSel = document.getElementById('formEmpresa');
            empSel.value = currentTab;
            empSel.disabled = false;

            document.getElementById('formDataCadastro').dispatchEvent(new Event('change'));
            document.getElementById('formDataLimite').dispatchEvent(new Event('change'));
            document.getElementById('formDataLances').dispatchEvent(new Event('change'));
            document.getElementById('formHoraLimite').dispatchEvent(new Event('change'));
            document.getElementById('formHoraLances').dispatchEvent(new Event('change'));
        }

        if (typeof initCustomDatepickers === 'function') initCustomDatepickers();
        if (typeof initCustomTimepickers === 'function') initCustomTimepickers();

        // Initialize business days auto calc if not yet initialized on these inputs
        initBusinessDaysAutoCalc();

        modal.classList.remove('hidden');
    }

    function closeModal() {
        document.getElementById('itemModal').classList.add('hidden');
        editingChave = null;
    }

    async function saveItem(event) {
        if (event) event.preventDefault();
        
        const data = {
            empresa: document.getElementById('formEmpresa').value || null,
            pregao: document.getElementById('formPregao').value || null,
            modalidade: document.getElementById('formModalidade').value || null,
            orgao: document.getElementById('formOrgao').value || null,
            uf: document.getElementById('formUF').value || null,
            categoria: document.getElementById('formCategoria').value || null,
            objeto: document.getElementById('formObjeto').value || null,
            portal: document.getElementById('formPortal').value || null,
            observacoes_status: document.getElementById('formObservacoes').value || null,
            data_cadastro: document.getElementById('formDataCadastro').value || null,
            data_limite: document.getElementById('formDataLimite').value || null,
            hora_limite: document.getElementById('formHoraLimite').value || null,
            data_lances: document.getElementById('formDataLances').value || null,
            hora_lances: document.getElementById('formHoraLances').value || null,
            antecedencia: document.getElementById('formAntecedencia').value !== '' ? parseInt(document.getElementById('formAntecedencia').value) : null
        };

        const pp = currentTab === 'BML' ? '?empresa=BML' : '';
        
        try {
            let res;
            if (editingChave) {
                // PUT
                res = await fetch(`/api/agenda_licitacoes/${editingChave}${pp}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data)
                });
            } else {
                // POST
                res = await fetch(`/api/agenda_licitacoes${pp}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(data)
                });
            }

            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erro ao salvar item'); }

            showToast(editingChave ? 'Item atualizado com sucesso!' : 'Item criado com sucesso!');
            closeModal();
            await fetchData();
        } catch (error) { 
            console.error('Erro ao salvar:', error); 
            showToast(error.message || 'Erro ao salvar item', 'error');  
        }
    }

    // ==========================================
    // 12. Delete
    // ==========================================
    function requestDelete(chave) {
        deleteChave = chave;
        const row = state.rawData.find(r => r.CHAVE === chave);
        document.getElementById('deleteModalText').textContent = `Tem certeza que deseja excluir o item "${row?.COD_CONTRATO_CONCAT || chave}"? Esta ação não pode ser desfeita.`;
        document.getElementById('deleteModal').classList.remove('hidden');
    }
    function closeDeleteModal() { document.getElementById('deleteModal').classList.add('hidden'); deleteChave = null; }
    async function confirmDelete() {
        if (!deleteChave) return;
        const pp = currentTab === 'BML' ? '?empresa=BML' : '';
        try {
            const res = await fetch(`/api/agenda_licitacoes/${deleteChave}${pp}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erro ao excluir'); }
            showToast('Item excluído com sucesso!'); closeDeleteModal(); closeModal(); await fetchData();
        } catch (error) { showToast(error.message || 'Erro ao excluir item', 'error'); }
    }
    function deleteFromModal() { if (editingChave) requestDelete(editingChave); }

    // ==========================================
    // 13. Tab Switching
    // ==========================================
    function switchTab(tab) {
        currentTab = tab;
        const tN = document.getElementById('tabNexomed'), tB = document.getElementById('tabBml');
        const ac = 'bg-white dark:bg-steel-600 text-steel-800 dark:text-white shadow-sm';
        const ic = 'text-steel-500 dark:text-steel-400 hover:text-steel-700 dark:hover:text-gray-200';
        tN.className = `px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${tab === 'NEXOMED' ? ac : ic}`;
        tB.className = `px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${tab === 'BML' ? ac : ic}`;
        fetchData();
    }

    // ==========================================
    // 14. Export
    // ==========================================
    function exportXLS() { return grid.export({ filename:'agenda_licitacoes_'+currentTab.toLowerCase()+'_'+new Date().toISOString().slice(0,10)+'.xlsx', sheetName:'Agenda_'+currentTab, extraValues: () => ({'Empresa Participante':currentTab}) }); }

    // ==========================================
    // Setup Custom Dropdowns
    // ==========================================
    function setupCustomDropdown(inputId, dropdownId, listId, dataFetcher = null, onChange = null) {
        const input = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        const ul = document.getElementById(listId);
        let optionsData = [];

        const renderOptions = (filter = '') => {
            ul.innerHTML = '';
            const filterStr = filter.toUpperCase();
            const filtered = optionsData.filter(opt => opt.toUpperCase().includes(filterStr));
            if (filtered.length === 0) {
                ul.innerHTML = '<li class="px-4 py-2 text-steel-400 text-xs text-center italic">Nenhum resultado</li>';
                return;
            }
            filtered.forEach(opt => {
                const li = document.createElement('li');
                li.textContent = opt;
                li.className = 'px-4 py-2 cursor-pointer hover:bg-nexo-50 dark:hover:bg-steel-700 transition-colors text-steel-700 dark:text-gray-200';
                li.onmousedown = (e) => { // mousedown dispara antes do blur
                    e.preventDefault();
                    input.value = opt;
                    dropdown.classList.add('hidden');
                    if (onChange) onChange(opt);
                };
                ul.appendChild(li);
            });
        };

        const loadData = async () => {
            if (dataFetcher && optionsData.length === 0) {
                optionsData = await dataFetcher();
            }
            renderOptions(input.value);
        };

        input.addEventListener('focus', async () => {
            dropdown.classList.remove('hidden');
            await loadData();
            renderOptions('');
        });

        input.addEventListener('input', async (e) => {
            dropdown.classList.remove('hidden');
            await loadData();
            renderOptions(e.target.value);
        });

        input.addEventListener('blur', () => { dropdown.classList.add('hidden'); });

        return {
            setOptions: (data) => { optionsData = data; renderOptions(); },
            clearOptions: () => { optionsData = []; }
        };
    }

    // ==========================================
    // 15. Init
    // ==========================================
    function init() {
        // Initialize Custom Dropdowns
        const ufs = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
        const modalidadeOps = ["Pregão Eletrônico", "Pregão Presencial", "Dispensa", "Cotação Eletrônica", "Convite", "Concorrência"];
        const portalOps = ["Comprasnet", "Compras.MG", "PE. INTEGRADO", "Compras.SC", "Banco do Brasil - Antigo", "Banco do Brasil - Novo", "COMPRAS.RJ", "COMPRAS.AM", "COTAÇÕES.SC", "FUNDEP", "FAMESP/SP", "PUBLINEXO", "DISPENSA.SC", "E-MAIL", "BBM NET", "BLL", "Compras Públicas", "Banrrisul", "Licitanet", "Outros"];
        const categoriaOps = ["OPME", "Descartável", "Misto", "Serviços Médicos"];
        
        setupCustomDropdown('formUF', 'ufDropdown', 'ufList').setOptions(ufs);
        setupCustomDropdown('formModalidade', 'modalidadeDropdown', 'modalidadeList').setOptions(modalidadeOps);
        setupCustomDropdown('formPortal', 'portalDropdown', 'portalList').setOptions(portalOps);
        setupCustomDropdown('formCategoria', 'categoriaDropdown', 'categoriaList').setOptions(categoriaOps);

        fetchData();

        // Seleção de células (Ctrl+Click+Arrasto)

    }

    document.addEventListener('DOMContentLoaded', init);

    // Public API
    return {
        switchTab, toggleSort: key => grid.toggleSort(key),
        setPage: p => grid.setPage(p),
        openFilter, openModal, closeModal, saveItem,
        requestDelete, closeDeleteModal, confirmDelete, deleteFromModal,
        exportXLS,
    };
})();
