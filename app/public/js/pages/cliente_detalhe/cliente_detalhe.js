/**
 * Gerenciamento da Tela de Detalhe do Cliente
 * Ficha Cadastral + KPIs + Grid de Notas Fiscais (dados mockados).
 */
const ClienteDetalhe = (() => {
    let modalItens = [];
    let modalCurrentPage = 1;
    let modalGrid = null;
    let currentModalContext = {
        empresa: '',
        numero_nota: '',
        cliente: '',
        valor: ''
    };

    // ==========================================
    // 1. Extrair ID do Cliente da URL
    // ==========================================
    const clienteId = window.location.pathname.split('/').pop();

    // Os dados do cliente agora são buscados via API no init().

    

    // ==========================================
    // 4. Definição das Colunas do Grid
    // ==========================================
    const columns = [
        { key: 'empresa', label: 'Empresa Vendedora' },
        { key: 'nota', label: 'Nota', type: 'number' },
        // { key: 'posicao', label: 'Posição' }, // Ocultado temporariamente
        { key: 'contrato', label: 'Contrato' },
        { key: 'pregao', label: 'Pregão' },
        { key: 'tipoContrato', label: 'Tipo Contrato' },
        { key: 'classificacao', label: 'Classificação' },
        { key: 'empenho', label: 'Empenho' },
        { key: 'documento', label: 'Documento' },
        { key: 'valor', label: 'Valor', type: 'currency' },
        { key: 'dataVencimento', label: 'Data de Vencimento', type: 'date' },
        { key: 'dataPagamento', label: 'Data de Pagamento', type: 'date' },
        { 
            key: 'diasAtraso', label: 'Dias de Atraso', type: 'number',
            render: (v) => {
                if (v === '-' || v === null || v === undefined) return '-';
                
                const dias_totais = parseInt(v);
                if (isNaN(dias_totais)) return '-';
                
                const anos = Math.floor(dias_totais / 365);
                let resto_dias = dias_totais % 365;
                
                const meses = Math.floor(resto_dias / 30.416);
                resto_dias = resto_dias - (meses * 30.416);
                
                const semanas = Math.floor(resto_dias / 7);
                const dias_finais = Math.floor(resto_dias % 7);
                
                const tooltipParts = [];
                if (anos > 0) tooltipParts.push(`${anos} ano${anos > 1 ? 's' : ''}`);
                if (meses > 0) tooltipParts.push(`${meses} ${meses > 1 ? 'meses' : 'mês'}`);
                if (semanas > 0) tooltipParts.push(`${semanas} semana${semanas > 1 ? 's' : ''}`);
                if (dias_finais > 0 || tooltipParts.length === 0) tooltipParts.push(`${dias_finais} dia${dias_finais !== 1 ? 's' : ''}`);
                
                let title = '';
                if (tooltipParts.length === 1) {
                    title = tooltipParts[0];
                } else if (tooltipParts.length > 1) {
                    const last = tooltipParts.pop();
                    title = tooltipParts.join(', ') + ' e ' + last;
                }
                
                return `<span title="${title}" class="cursor-help border-b border-dashed border-steel-400 hover:text-nexo-600 transition-colors">${dias_totais}</span>`;
            }
        },
        {
            key: 'status', label: 'Status', render: v => {
                const variants = { PAGO: 'success', ATRASADO: 'danger', PENDENTE: 'alert' };
                const variant = variants[v] || 'neutral';
                return `<span class="status-badge status-badge-${variant}">${HubDataGrid.components.values.escape(v)}</span>`;
            }
        }
    ];

    // ==========================================
    // 5. Estado Global do Grid
    // ==========================================
    const state = {
        rawData: [],
        filteredData: [],
        viewData: [],
        filters: {},
        sort: { key: null, dir: null },
        pagination: { current: 1, limit: 25, total: 0 }
    };


    // ==========================================
    // 6. Elementos DOM
    // ==========================================
    const elements = {};

    // ==========================================
    // 7. Inicialização
    // ==========================================
    const grid = HubDataGrid.create({
        bodyId: 'notasTableBody',
        headerId: 'notasTableHeader',
        infoId: 'notasPaginationInfo',
        paginationId: 'notasPaginationControls',
        pageSizeId: 'notasPerPage',
        clearId: 'btnClearFiltersNotas',
        state,
        columns,
        export: false,
        onChange: () => updateKpis(),
        onRowClick: (row) =>
            ClienteDetalhe.openNotaModal(
                row.empresa,
                row.nota,
                row.documento || '',
                document.getElementById('clienteNome')?.textContent || '',
                '',
                '',
                row.valor || '0'
            )
    });

    const init = () => {
        elements.tableHeader=document.getElementById('notasTableHeader'); elements.tableBody=document.getElementById('notasTableBody'); elements.btnClearFilters=document.getElementById('btnClearFiltersNotas');
        fetchClienteData();fetchNotasData();loadContatos();loadHistorico();
    };

    const fetchClienteData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/clientes/${clienteId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) {
                throw new Error('Falha ao buscar dados do cliente');
            }
            const data = await res.json();
            
            document.getElementById('breadcrumbClientName').textContent = data.razaoSocial || '-';
            document.getElementById('clienteCodigo').textContent = data.codigo || clienteId || '-';
            document.getElementById('clienteNome').textContent = data.razaoSocial || '-';
            document.getElementById('clienteFantasia').textContent = data.nomeFantasia || '-';
            document.getElementById('clienteClassificacao').textContent = data.classificacao || '-';
            document.getElementById('clienteCnpj').textContent = data.cnpj || '-';
            
            // Concatenação do Endereço
            let endParts = [];
            if (data.tipoLogradouro) endParts.push(data.tipoLogradouro);
            if (data.logradouro) endParts.push(data.logradouro);
            if (data.numero) endParts.push(data.numero);
            
            let comp = data.complemento ? String(data.complemento).trim() : '';
            if (comp && comp.toLowerCase() !== '<null>') {
                endParts.push(comp);
            }
            
            if (data.bairro) endParts.push(data.bairro);
            document.getElementById('clienteEndereco').textContent = endParts.join(' ') || '-';
            
            document.getElementById('clienteCidade').textContent = data.cidade || '-';
            document.getElementById('clienteUf').textContent = data.uf || '-';
            document.getElementById('clienteCep').textContent = data.cep || '-';
            document.getElementById('clienteEmail').textContent = data.email || '-';
            
            // Concatenação do Telefone
            let tel = '';
            if (data.ddd) tel += `(${String(data.ddd).trim()}) `;
            if (data.telefone) tel += String(data.telefone).trim();
            document.getElementById('clienteTelefone').textContent = tel || '-';
            
        } catch (error) {
            console.error('Erro ao buscar dados do cliente:', error);
            document.getElementById('clienteNome').textContent = 'Erro ao carregar';
        }
    };

    
    // ==========================================
    // 8.5 Buscar Notas Fiscais
    // ==========================================
    const fetchNotasData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/clientes/${clienteId}/notas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Falha ao buscar notas fiscais');
            const data = await res.json();
            
            // Ajustar datas para YYYY-MM-DD se vierem em ISO (garante que os filtros funcionem)
            state.rawData = data.map(row => {
                if (row.dataVencimento && row.dataVencimento.includes('T')) {
                    row.dataVencimento = row.dataVencimento.split('T')[0];
                }
                if (row.dataPagamento && row.dataPagamento.includes('T')) {
                    row.dataPagamento = row.dataPagamento.split('T')[0];
                }

                if (row.status === 'ATRASADO' && row.dataVencimento) {
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const venc = new Date(row.dataVencimento + 'T00:00:00');
                    
                    const diffTime = hoje - venc;
                    row.diasAtraso = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
                } else {
                    row.diasAtraso = '-';
                }

                return row;
            });
            processData();
        } catch (error) {
            console.error('Erro ao buscar notas:', error);
            state.rawData = [];
            processData();
        }
    };

    // ==========================================
    // 9. Processamento de Dados (Filtrar + Ordenar + Paginar)
    // ==========================================
    const processData = () => {
        grid.process();
    };

    // ==========================================
    // 10. Atualizar KPIs
    // ==========================================
    const formatBRL = (value) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const updateKpis = () => {
        const data = state.filteredData;
        const vendido = data.reduce((sum, r) => sum + (parseFloat(r.valor) || 0), 0);
        const pago = data.filter(r => r.status === 'PAGO').reduce((sum, r) => sum + (parseFloat(r.valor) || 0), 0);
        const aberto = data.filter(r => r.status === 'PENDENTE' || r.status === 'ATRASADO').reduce((sum, r) => sum + (parseFloat(r.valor) || 0), 0);
        const processos = data.filter(r => r.status === 'PENDENTE' || r.status === 'ATRASADO').length;

        document.getElementById('kpiVendido').textContent = formatBRL(vendido);
        document.getElementById('kpiPago').textContent = formatBRL(pago);
        document.getElementById('kpiAberto').textContent = formatBRL(aberto);
        document.getElementById('kpiProcessos').textContent = processos;
    };

    // ==========================================
    // 11. Renderização de Cabeçalhos
    // ==========================================
    const renderHeaders = () => {
        grid.renderHeaders();
    };

    // ==========================================
    // 12. Renderização do Corpo da Tabela
    // ==========================================
    const renderTableBody = () => {
        grid.renderBody();
    };

    // ==========================================
    // 13. Paginação (Padrão minimalista do sistema)
    // ==========================================
    const renderPagination = () => {
        grid.pagination.render();
    };

    // ==========================================
    // 14. Filtros (Modal Dinâmico)
    // ==========================================
    const formatCurrency = (val) => {
        if (val === '-' || !val) return '-';
        return parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatDate = (val) => {
        if (val === '-' || !val) return '-';
        const parts = String(val).split('T')[0].split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return val;
    };


    const closeFilter = () => grid.filters.close();

    const openFilter = (event, colKey) => {
        grid.openFilter(event, colKey);
    };

    // Fechar filtro ao clicar fora
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('filterModal');
        if (modal && !modal.contains(e.target) && !e.target.closest('[data-filter-btn]')) {
            closeFilter();
        }
    });

    // ==========================================
    // 15. Ações Públicas
    // ==========================================
    const toggleSort = (key) => { grid.toggleSort(key); };

    const changePage = (page) => { grid.setPage(page); };

    const clearAllFilters = () => { grid.clearFilters(); };

    // ==========================================
    // 16. Tabs Principais (Notas / Agenda / Histórico)
    // ==========================================
    const activeTabClass = 'flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-lg border-b-2 border-nexo-500 text-nexo-600 dark:text-nexo-400 bg-nexo-50/50 dark:bg-nexo-500/10 transition-all duration-200';
    const inactiveTabClass = 'flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg border-b-2 border-transparent text-steel-500 dark:text-steel-400 hover:text-steel-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-steel-700/50 transition-all duration-200';

    const switchMainTab = (tab) => {
        const tabs = {
            notas: { btn: 'mainTabNotas', content: 'tabContentNotas' },
            agenda: { btn: 'mainTabAgenda', content: 'tabContentAgenda' },
            historico: { btn: 'mainTabHistorico', content: 'tabContentHistorico' }
        };

        Object.keys(tabs).forEach(key => {
            const btn = document.getElementById(tabs[key].btn);
            const content = document.getElementById(tabs[key].content);
            if (key === tab) {
                btn.className = activeTabClass;
                content.classList.remove('hidden');
            } else {
                btn.className = inactiveTabClass;
                content.classList.add('hidden');
            }
        });
    };

    // ==========================================
    // 17. Agenda de Contatos (PostgreSQL)
    // ==========================================
    let contatos = []; 
    const loadContatos = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/clientes/${clienteId}/contatos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                contatos = await res.json();
                renderAgendaCards();
                
                const selectHistorico = document.getElementById('historicoContato');
                if (selectHistorico) {
                    selectHistorico.innerHTML = '<option value="">Selecione o contato...</option>';
                    contatos.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.id;
                        opt.textContent = c.nome_contato + (c.cargo_contato ? ` (${c.cargo_contato})` : '');
                        selectHistorico.appendChild(opt);
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao carregar contatos:', error);
        }
    };

    const avatarColors = [
        'bg-nexo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
        'bg-violet-500', 'bg-sky-500', 'bg-pink-500', 'bg-indigo-500'
    ];

    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return parts[0][0].toUpperCase();
    };

    const getAvatarColor = (name) => {
        if (!name) return avatarColors[0];
        const idx = name.charCodeAt(0) % avatarColors.length;
        return avatarColors[idx];
    };

    const escapeHtmlSafe = (str) => {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    const renderAgendaCards = () => {
        const emptyState = document.getElementById('agendaEmptyState');
        const cardsContainer = document.getElementById('agendaCards');

        if (contatos.length === 0) {
            emptyState.classList.remove('hidden');
            cardsContainer.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        cardsContainer.classList.remove('hidden');

        let html = '';
        contatos.forEach((c, idx) => {
            const initials = getInitials(c.nome_contato);
            const color = getAvatarColor(c.nome_contato);
            html += `
                <div class="bg-gray-50 dark:bg-steel-900/50 rounded-xl border border-gray-200 dark:border-steel-700 p-5 hover:-translate-y-1 hover:shadow-lg hover:border-nexo-300 dark:hover:border-nexo-700 transition-all duration-300 group">
                    <div class="flex items-start gap-4">
                        <!-- Avatar -->
                        <div class="w-11 h-11 rounded-full ${color} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                            ${initials}
                        </div>
                        <!-- Info -->
                        <div class="flex-1 min-w-0">
                            <h4 class="text-sm font-semibold text-steel-800 dark:text-gray-100 truncate">${escapeHtmlSafe(c.nome_contato)}</h4>
                            <p class="text-xs text-steel-500 dark:text-steel-400 mt-0.5">${escapeHtmlSafe(c.cargo_contato) || 'Cargo não informado'}</p>
                        </div>
                        <!-- Ações -->
                        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="ClienteDetalhe.editContato(${idx})" class="p-1.5 rounded-lg text-steel-400 hover:text-nexo-500 hover:bg-nexo-50 dark:hover:bg-nexo-900/30 transition-colors" title="Editar">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onclick="ClienteDetalhe.deleteContato(${idx})" class="p-1.5 rounded-lg text-steel-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Excluir">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>

                    <!-- Dados de contato -->
                    <div class="mt-4 space-y-2 text-[13px]">
                        ${c.telefone_contato ? `
                        <div class="flex items-center gap-2 text-steel-600 dark:text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-steel-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            <span class="truncate">${escapeHtmlSafe(c.telefone_contato)}</span>
                            <button onclick="navigator.clipboard.writeText('${escapeHtmlSafe(c.telefone_contato)}')" class="ml-auto p-1 rounded text-steel-300 hover:text-nexo-500 transition-colors shrink-0" title="Copiar telefone">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </button>
                        </div>` : ''}
                        ${c.email_contato ? `
                        <div class="flex items-center gap-2 text-steel-600 dark:text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-steel-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <span class="truncate">${escapeHtmlSafe(c.email_contato)}</span>
                            <button onclick="navigator.clipboard.writeText('${escapeHtmlSafe(c.email_contato)}')" class="ml-auto p-1 rounded text-steel-300 hover:text-nexo-500 transition-colors shrink-0" title="Copiar e-mail">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </button>
                        </div>` : ''}
                    </div>

                    ${c.observacao ? `
                    <div class="mt-3 pt-3 border-t border-gray-200 dark:border-steel-700">
                        <p class="text-xs text-steel-500 dark:text-steel-400 italic">"${escapeHtmlSafe(c.observacao)}"</p>
                    </div>` : ''}
                </div>
            `;
        });
        cardsContainer.innerHTML = html;
    };

    let editingContatoIdx = null;

    const openContatoModal = (idx = null) => {
        editingContatoIdx = idx;
        const isEdit = idx !== null;
        const c = isEdit ? contatos[idx] : {};

        // Cria modal overlay
        let modal = document.getElementById('contatoModal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'contatoModal';
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-steel-900/40 backdrop-blur-sm" onclick="ClienteDetalhe.closeContatoModal()"></div>
            <div class="bg-white dark:bg-steel-800 rounded-2xl shadow-2xl w-full max-w-md relative z-10 mx-4 border border-gray-100 dark:border-steel-700 animate-fade-in-up">
                <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-steel-700 bg-gray-50/50 dark:bg-steel-900/50 rounded-t-2xl">
                    <h3 class="text-base font-semibold text-steel-800 dark:text-gray-100">${isEdit ? 'Editar Contato' : 'Novo Contato'}</h3>
                    <button onclick="ClienteDetalhe.closeContatoModal()" class="text-steel-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-steel-700">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="block text-[11px] font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wider mb-1.5">Nome Completo *</label>
                        <input type="text" id="contatoNome" value="${escapeHtmlSafe(c.nome_contato || '')}" class="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-steel-900 border border-gray-200 dark:border-steel-600 rounded-lg outline-none focus:ring-2 focus:ring-nexo-500/40 focus:border-nexo-500 text-steel-700 dark:text-gray-200 transition-all" placeholder="Ex: Maria da Silva">
                    </div>
                    <div>
                        <label class="block text-[11px] font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wider mb-1.5">Cargo / Função</label>
                        <input type="text" id="contatoCargo" value="${escapeHtmlSafe(c.cargo_contato || '')}" class="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-steel-900 border border-gray-200 dark:border-steel-600 rounded-lg outline-none focus:ring-2 focus:ring-nexo-500/40 focus:border-nexo-500 text-steel-700 dark:text-gray-200 transition-all" placeholder="Ex: Coord. Financeira">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[11px] font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wider mb-1.5">Telefone</label>
                            <input type="tel" id="contatoTelefone" value="${escapeHtmlSafe(c.telefone_contato || '')}" class="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-steel-900 border border-gray-200 dark:border-steel-600 rounded-lg outline-none focus:ring-2 focus:ring-nexo-500/40 focus:border-nexo-500 text-steel-700 dark:text-gray-200 transition-all" placeholder="(51) 99123-4567">
                        </div>
                        <div>
                            <label class="block text-[11px] font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wider mb-1.5">E-mail</label>
                            <input type="email" id="contatoEmail" value="${escapeHtmlSafe(c.email_contato || '')}" class="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-steel-900 border border-gray-200 dark:border-steel-600 rounded-lg outline-none focus:ring-2 focus:ring-nexo-500/40 focus:border-nexo-500 text-steel-700 dark:text-gray-200 transition-all" placeholder="email@exemplo.com">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[11px] font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wider mb-1.5">Observação</label>
                        <textarea id="contatoObs" rows="2" class="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-steel-900 border border-gray-200 dark:border-steel-600 rounded-lg outline-none focus:ring-2 focus:ring-nexo-500/40 focus:border-nexo-500 text-steel-700 dark:text-gray-200 transition-all resize-none" placeholder="Notas sobre este contato...">${escapeHtmlSafe(c.observacao || '')}</textarea>
                    </div>
                    <div class="flex justify-end gap-3 pt-2">
                        <button onclick="ClienteDetalhe.closeContatoModal()" class="px-4 py-2 text-sm font-medium text-steel-500 hover:text-steel-700 dark:hover:text-gray-300 transition-colors">Cancelar</button>
                        <button onclick="ClienteDetalhe.saveContato()" class="px-5 py-2 text-sm font-medium bg-nexo-600 hover:bg-nexo-700 text-white rounded-lg shadow-sm transition-colors">${isEdit ? 'Salvar Alterações' : 'Adicionar'}</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    };

    const closeContatoModal = () => {
        const modal = document.getElementById('contatoModal');
        if (modal) modal.remove();
        editingContatoIdx = null;
    };

    const saveContato = async () => {
        const nome = document.getElementById('contatoNome').value.trim();
        if (!nome) { alert('O nome é obrigatório.'); return; }

        const payload = {
            nome,
            cargo: document.getElementById('contatoCargo').value.trim(),
            telefone: document.getElementById('contatoTelefone').value.trim(),
            email: document.getElementById('contatoEmail').value.trim(),
            observacao: document.getElementById('contatoObs').value.trim()
        };

        const isEdit = editingContatoIdx !== null;
        const url = isEdit 
            ? `/api/clientes/${clienteId}/contatos/${contatos[editingContatoIdx].id}`
            : `/api/clientes/${clienteId}/contatos`;
        const method = isEdit ? 'PUT' : 'POST';

        const btn = document.querySelector('#contatoModal button:last-child');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<svg class="animate-spin h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
        btn.disabled = true;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Erro ao salvar contato');

            await loadContatos();
            closeContatoModal();
        } catch (error) {
            console.error('Erro:', error);
            alert('Falha ao salvar contato. Tente novamente.');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    const editContato = (idx) => openContatoModal(idx);

    const deleteContato = (idx) => {
        const contato = contatos[idx];
        if (!contato) return;

        let modal = document.getElementById('deleteContatoModal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'deleteContatoModal';
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-steel-900/40 backdrop-blur-sm transition-opacity" onclick="document.getElementById('deleteContatoModal').remove()"></div>
            <div class="bg-white dark:bg-steel-800 rounded-2xl shadow-2xl w-full max-w-sm relative z-10 mx-4 border border-gray-100 dark:border-steel-700 animate-fade-in-up p-6 text-center">
                <div class="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </div>
                <h3 class="text-lg font-bold text-steel-900 dark:text-gray-100 mb-2">Excluir Contato</h3>
                <p class="text-sm text-steel-500 dark:text-steel-400 mb-6">
                    Tem certeza que deseja excluir o contato <strong>${escapeHtmlSafe(contato.nome_contato)}</strong>?<br>Esta ação não poderá ser desfeita.
                </p>
                <div class="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onclick="document.getElementById('deleteContatoModal').remove()" class="px-5 py-2.5 bg-gray-100 dark:bg-steel-700 text-steel-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-steel-600 transition-colors text-sm font-semibold w-full sm:w-auto">
                        Cancelar
                    </button>
                    <button id="btnConfirmDeleteContato" class="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors text-sm font-semibold w-full sm:w-auto flex items-center justify-center gap-2 shadow-sm shadow-red-500/30">
                        Sim, excluir
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const btnConfirm = document.getElementById('btnConfirmDeleteContato');
        btnConfirm.onclick = async () => {
            const originalText = btnConfirm.innerHTML;
            btnConfirm.innerHTML = '<svg class="animate-spin h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Excluindo...';
            btnConfirm.disabled = true;

            try {
                const token = localStorage.getItem('token');
                const contatoId = contato.id;
                const res = await fetch(`/api/clientes/${clienteId}/contatos/${contatoId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) throw new Error('Erro ao deletar contato');

                modal.remove();
                await loadContatos();
            } catch (error) {
                console.error('Erro:', error);
                alert('Falha ao excluir contato. Tente novamente.');
                btnConfirm.innerHTML = originalText;
                btnConfirm.disabled = false;
            }
        };
    };

    // ==========================================
    // 18. Histórico de Cobrança (PostgreSQL)
    // ==========================================
    let historicoEntries = []; // Array da API

    const tipoIcons = {
        LIGACAO: '📞',
        EMAIL: '✉️',
        WHATSAPP: '💬',
        REUNIAO: '🤝',
        OUTRO: '📝'
    };
    const tipoLabels = {
        LIGACAO: 'Ligação',
        EMAIL: 'E-mail',
        WHATSAPP: 'WhatsApp',
        REUNIAO: 'Reunião',
        OUTRO: 'Outro'
    };
    const resultadoStyles = {
        PROMESSA: { label: 'Promessa de Pagamento', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
        SEM_RESPOSTA: { label: 'Sem Resposta', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
        RECUSOU: { label: 'Recusou', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
        NEGOCIACAO: { label: 'Em Negociação', bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400', dot: 'bg-sky-500' },
        INFORMATIVO: { label: 'Informativo', bg: 'bg-gray-100 dark:bg-steel-700', text: 'text-steel-600 dark:text-gray-400', dot: 'bg-steel-400' }
    };

    let agendamentoAtivo = false;

    const toggleAgendamento = () => {
        agendamentoAtivo = !agendamentoAtivo;
        const fields = document.getElementById('agendamentoFields');
        const checkbox = document.getElementById('agendamentoCheckbox');
        const chevron = document.getElementById('agendamentoChevron');

        const toggleBtn = document.getElementById('agendamentoToggleBtn');

        if (agendamentoAtivo) {
            fields.classList.remove('hidden');
            toggleBtn.classList.remove('rounded-xl');
            toggleBtn.classList.add('rounded-t-xl');
            checkbox.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>';
            checkbox.className = 'w-5 h-5 rounded-md bg-amber-500 border-2 border-amber-500 flex items-center justify-center transition-all duration-200';
            chevron.style.transform = 'rotate(180deg)';
            // Pré-preencher data com amanhã
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateInput = document.getElementById('agendamentoData');
            if (dateInput && !dateInput.value) {
                dateInput.value = tomorrow.toISOString().split('T')[0];
            }
            // Inicializar os pickers customizados do projeto
            if (typeof initCustomDatepickers === 'function') initCustomDatepickers();
            if (typeof initCustomTimepickers === 'function') initCustomTimepickers();
        } else {
            fields.classList.add('hidden');
            toggleBtn.classList.remove('rounded-t-xl');
            toggleBtn.classList.add('rounded-xl');
            checkbox.innerHTML = '';
            checkbox.className = 'w-5 h-5 rounded-md border-2 border-gray-300 dark:border-steel-600 flex items-center justify-center transition-all duration-200';
            chevron.style.transform = 'rotate(0deg)';
        }
    };

    const loadHistorico = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/clientes/${clienteId}/historico`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                historicoEntries = await res.json();
                renderHistoricoTimeline();
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    };

    const renderHistoricoTimeline = () => {
        const emptyState = document.getElementById('historicoEmptyState');
        const entriesContainer = document.getElementById('historicoEntries');

        if (historicoEntries.length === 0) {
            emptyState.classList.remove('hidden');
            entriesContainer.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        entriesContainer.classList.remove('hidden');

        let html = '<div class="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-steel-700"></div>';

        historicoEntries.forEach(entry => {
            const icon = tipoIcons[entry.tipo_contato] || '📝';
            const tipoLabel = tipoLabels[entry.tipo_contato] || entry.tipo_contato;
            const rs = resultadoStyles[entry.resultado_contato] || resultadoStyles.INFORMATIVO;
            const dateObj = new Date(entry.created_at);
            const dateStr = dateObj.toLocaleDateString('pt-BR') + ' às ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            html += `
                <div class="relative pl-12 pb-8 last:pb-0">
                    <!-- Dot -->
                    <div class="absolute left-[12px] top-1 w-4 h-4 rounded-full ${rs.dot} border-[3px] border-white dark:border-steel-800 shadow-sm z-10"></div>
                    
                    <!-- Card -->
                    <div class="bg-gray-50 dark:bg-steel-900/50 rounded-xl border border-gray-200 dark:border-steel-700 p-4 hover:-translate-y-1 hover:shadow-lg hover:border-nexo-300 dark:hover:border-nexo-700 transition-all duration-300">
                        <!-- Header -->
                        <div class="flex items-start justify-between mb-2">
                            <div class="flex flex-col gap-1">
                                <div class="flex items-center gap-2">
                                    <span class="text-base">${icon}</span>
                                    <span class="text-sm font-semibold text-steel-800 dark:text-gray-200">${tipoLabel}</span>
                                    <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ${rs.bg} ${rs.text}">${rs.label}</span>
                                </div>
                                ${entry.nome_contato ? `<p class="text-xs text-steel-500 dark:text-steel-400 mt-1">Contato com: <span class="font-medium text-steel-700 dark:text-gray-300">${escapeHtmlSafe(entry.nome_contato)}</span></p>` : ''}
                            </div>
                            <span class="text-[11px] text-steel-400 dark:text-steel-500 font-mono mt-0.5">${dateStr}</span>
                        </div>
                        <!-- Usuario -->
                        <p class="text-xs text-steel-500 dark:text-steel-400 mb-2">por <span class="font-medium">${escapeHtmlSafe(entry.usuario_nome || 'Sistema')}</span></p>
                        <!-- Descrição -->
                        <p class="text-sm text-steel-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">${escapeHtmlSafe(entry.descritivo_contato)}</p>
                        ${entry.agendamento_data_contato ? `
                        <!-- Agendamento de Retorno -->
                        <div class="mt-3 pt-3 border-t border-gray-200 dark:border-steel-700">
                            <div class="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/30">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                        ${tipoIcons[entry.agendamento_tipo_retorno_contato] || '📞'} Retorno agendado para ${new Date(entry.agendamento_data_contato).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}${entry.agendamento_hora_contato ? ' às ' + entry.agendamento_hora_contato.substring(0, 5) : ''}
                                    </p>
                                    ${entry.agendamento_nota_contato ? `<p class="text-[11px] text-amber-600/80 dark:text-amber-500/80 mt-0.5 truncate">${escapeHtmlSafe(entry.agendamento_nota_contato)}</p>` : ''}
                                </div>
                            </div>
                        </div>` : ''}
                    </div>
                </div>
            `;
        });

        entriesContainer.innerHTML = html;
    };

    const registrarHistorico = async () => {
        const tipo = document.getElementById('historicoTipo').value;
        const contato = document.getElementById('historicoContato').value;
        const resultado = document.getElementById('historicoResultado').value;
        const descricao = document.getElementById('historicoDescricao').value.trim();

        if (!tipo) { alert('Selecione o tipo de contato.'); return; }
        if (!contato) { alert('Selecione o contato vinculado. (Se não houver, cadastre na aba Agenda de Contatos)'); return; }
        if (!resultado) { alert('Selecione o resultado.'); return; }
        if (!descricao) { alert('Descreva o contato realizado.'); return; }

        let payload = {
            tipo_contato: tipo,
            agenda_contato_id: parseInt(contato, 10),
            resultado_contato: resultado,
            descritivo_contato: descricao,
            has_agendamento: agendamentoAtivo
        };

        // Capturar agendamento (se ativo)
        if (agendamentoAtivo) {
            const agData = document.getElementById('agendamentoData').value;
            const agHora = document.getElementById('agendamentoHora').value;
            const agTipoRetorno = document.getElementById('agendamentoTipoRetorno').value;
            const agNota = document.getElementById('agendamentoNota').value.trim();

            if (!agData) { alert('Informe a data do retorno agendado.'); return; }

            payload.agendamento_data_contato = agData;
            if (agHora) payload.agendamento_hora_contato = agHora;
            payload.agendamento_tipo_retorno_contato = agTipoRetorno;
            if (agNota) payload.agendamento_nota_contato = agNota;
        }

        const btn = document.getElementById('btnSubmitHistorico');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Registrando...';
        btn.disabled = true;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/clientes/${clienteId}/historico`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Erro ao salvar histórico');

            // Limpar formulário
            document.getElementById('historicoTipo').value = '';
            document.getElementById('historicoContato').value = '';
            document.getElementById('historicoResultado').value = '';
            document.getElementById('historicoDescricao').value = '';

            // Reset agendamento
            if (agendamentoAtivo) {
                document.getElementById('agendamentoData').value = '';
                document.getElementById('agendamentoHora').value = '';
                document.getElementById('agendamentoTipoRetorno').value = 'LIGACAO';
                document.getElementById('agendamentoNota').value = '';
                toggleAgendamento(); // Fecha o painel
            }

            // Recarregar histórico
            await loadHistorico();
        } catch (error) {
            console.error(error);
            alert('Falha ao registrar histórico de cobrança.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    // ==========================================
    // 19. Boot
    // ==========================================
    document.addEventListener('DOMContentLoaded', init);

    return {
        toggleSort,
        changePage,
        clearAllFilters,
        openFilter,
        switchMainTab,
        openContatoModal,
        closeContatoModal,
        saveContato,
        editContato,
        deleteContato,
        registrarHistorico,
        toggleAgendamento,
        switchNotaTab(tab) {
            const btnProd = document.getElementById('tabBtnProdutos');
            const btnObs = document.getElementById('tabBtnObservacoes');
            const btnFollowUp = document.getElementById('tabBtnFollowUp');
            const contentProd = document.getElementById('tabContentProdutos');
            const contentObs = document.getElementById('tabContentObservacoes');
            const contentFollowUp = document.getElementById('tabContentFollowUp');

            const activeClass = 'pb-3 border-b-2 border-nexo-500 text-nexo-600 dark:text-nexo-400 font-medium text-sm transition-colors';
            const inactiveClass = 'pb-3 border-b-2 border-transparent text-steel-500 hover:text-steel-800 dark:text-steel-400 dark:hover:text-gray-200 font-medium text-sm transition-colors';

            if (btnProd) btnProd.className = tab === 'produtos' ? activeClass : inactiveClass;
            if (btnObs) btnObs.className = tab === 'observacoes' ? activeClass : inactiveClass;
            if (btnFollowUp) btnFollowUp.className = tab === 'followup' ? activeClass : inactiveClass;

            if (contentProd) contentProd.classList.toggle('hidden', tab !== 'produtos');
            if (contentObs) contentObs.classList.toggle('hidden', tab !== 'observacoes');
            if (contentFollowUp) contentFollowUp.classList.toggle('hidden', tab !== 'followup');
        },

        renderModalItens() {
            if (!modalGrid) modalGrid = HubDataGrid.presets.notaItems({ export: false, onChange: state => { modalCurrentPage = state.pagination.current; } });
            if (modalGrid.state.rawData !== modalItens) { modalGrid.state.rawData = modalItens || []; modalGrid.state.filters = {}; }
            modalGrid.state.pagination.current = modalCurrentPage;
            modalGrid.process();
        },

        changeModalPage(page) { modalGrid?.setPage(page); },

        async openNotaModal(empresa, numero_nota, documento, cliente, esfera, uf, valorTotal) {
            const modal = document.getElementById('notaModal');
            const loading = document.getElementById('notaModalLoading');
            
            // Show modal and loading state
            modal.classList.remove('hidden');
            loading.classList.remove('hidden');
            
            // Reset fields
            document.getElementById('modalNotaTitulo').textContent = numero_nota;
            this.switchNotaTab('produtos'); // Default to products tab
            
            // Reset edit states


            document.getElementById('modalEmpresa').textContent = '---';

            document.getElementById('modalNatureza').textContent = '---';
            document.getElementById('modalDataEmissao').textContent = '---';
            document.getElementById('modalValorTotal').textContent = '---';
            document.getElementById('modalContato').textContent = '---';
            document.getElementById('modalObservacoes').textContent = '---';
            document.getElementById('modalItensCount').textContent = '0 itens';
            if (document.getElementById('modalFollowUpCount')) document.getElementById('modalFollowUpCount').textContent = '0 reg';
            document.getElementById('modalItensBody').innerHTML = '';
            if (document.getElementById('modalFollowUpBody')) document.getElementById('modalFollowUpBody').innerHTML = '';
            
            try {
                const token = localStorage.getItem('token');
                let url = `/api/notas/${empresa}/${numero_nota}`;
                
                const params = new URLSearchParams();
                if (valorTotal) params.append('valor', valorTotal);
                if (documento) params.append('documento', documento);
                
                const qs = params.toString();
                if (qs) url += `?${qs}`;
                
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                    throw new Error('Falha ao buscar dados da nota fiscal no Supra.');
                }
                
                const data = await response.json();
                
                const toTitleCase = (str) => {
                    if (!str) return '';
                    return str.toString().toLowerCase().split(' ').map(word => {
                        const preps = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'com', 'por', 'para'];
                        if (preps.includes(word)) return word;
                        return word.charAt(0).toUpperCase() + word.slice(1);
                    }).join(' ');
                };

                // Populate Header
                if (data.cabecalho) {
                    currentModalContext.empresa = empresa;
                    currentModalContext.numero_nota = numero_nota;
                    currentModalContext.codigo_nota = data.cabecalho.codigo;
                    currentModalContext.clifor_codigo = data.cabecalho.clifor_codigo;
                    currentModalContext.documento = documento;

                    document.getElementById('modalEmpresa').textContent = toTitleCase(empresa);

                    document.getElementById('modalNatureza').textContent = toTitleCase(data.cabecalho.nome_natureza_operacao) || '---';
                    document.getElementById('modalNatureza').title = toTitleCase(data.cabecalho.nome_natureza_operacao) || '';
                    
                    if (data.cabecalho.data) {
                        // Trata o timezone para evitar que a data volte um dia (ex: 15/07 virar 14/07)
                        const dateString = data.cabecalho.data;
                        const dateObj = new Date(dateString);
                        const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
                        const correctedDate = new Date(dateObj.getTime() + userTimezoneOffset);
                        document.getElementById('modalDataEmissao').textContent = !isNaN(correctedDate) ? correctedDate.toLocaleDateString('pt-BR') : '---';
                    }
                    
                    document.getElementById('modalValorTotal').textContent = data.cabecalho.valor_total ? 
                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.cabecalho.valor_total) : '---';
                        
                    document.getElementById('modalContato').textContent = data.cabecalho.nome_contato || '---';
                    
                    let obs = data.cabecalho.informacao_complementar;
                    if (obs) {
                        // Limpa caracteres especiais nulos e espaços de preenchimento (trailing) causados por colunas CHAR no banco
                        obs = obs.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/g, '').replace(/\s+$/g, '');
                    }
                    document.getElementById('modalObservacoes').textContent = (obs && obs !== '') ? obs : 'Nenhuma observação informada.';
                }
                
                // Populate Items
                if (data.itens && data.itens.length > 0) {
                    document.getElementById('modalItensCount').textContent = `${data.itens.length} itens`;
                    modalItens = data.itens;
                    modalCurrentPage = 1;
                    this.renderModalItens();
                } else {
                    document.getElementById('modalItensCount').textContent = `0 itens`;
                    modalItens = [];
                    this.renderModalItens();
                }
                
                // Populate Follow-Up
                if (data.followup && data.followup.length > 0) {
                    if (document.getElementById('modalFollowUpCount')) {
                        document.getElementById('modalFollowUpCount').textContent = `${data.followup.length} reg`;
                    }
                    this.renderModalFollowUp(data.followup);
                } else {
                    if (document.getElementById('modalFollowUpCount')) {
                        document.getElementById('modalFollowUpCount').textContent = `0 reg`;
                    }
                    if (document.getElementById('modalFollowUpBody')) {
                        document.getElementById('modalFollowUpBody').innerHTML = '<tr><td colspan="3" class="text-center py-8 text-steel-500">Nenhum follow-up registrado.</td></tr>';
                    }
                }
                
            } catch (err) {
                console.error(err);
                alert('Ocorreu um erro ao buscar os dados da nota. Verifique a conexão com o Supra.');
            } finally {
                loading.classList.add('hidden');
            }
        },
        
        closeNotaModal() {
            document.getElementById('notaModal').classList.add('hidden');
        },

        async downloadDanfe() {
            if (!currentModalContext.empresa || !currentModalContext.numero_nota) return;

            const btn = document.getElementById('btnVerDanfe');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Gerando...`;
            btn.disabled = true;

            try {
                const token = localStorage.getItem('token');
                
                // Abre a aba com a URL direta e o token, permitindo que o navegador
                // assuma o controle do download e respeite o header Content-Disposition com o nome correto
                const url = `/api/notas/${currentModalContext.empresa}/${currentModalContext.numero_nota}/danfe?token=${token}`;
                window.open(url, '_blank');
                
            } catch (error) {
                console.error("Erro ao abrir DANFE:", error);
                alert("Ocorreu um erro ao gerar a DANFE.");
            } finally {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }
        },

        renderModalFollowUp(followups) {
            const tbody = document.getElementById('modalFollowUpBody');
            if (!tbody) return;
            if (!followups || followups.length === 0) return;

            const sortedFollowups = [...followups].sort((a, b) => {
                return new Date(b.data || 0) - new Date(a.data || 0);
            });

            let html = '';
            sortedFollowups.forEach(f => {
                let dateStr = '---';
                if (f.data) {
                    const d = new Date(f.data);
                    // O banco SQL Server salva a hora local, mas ao enviar via JSON o node converte para UTC adicionando o 'Z'.
                    // Por isso, devemos extrair os dados usando os métodos UTC para ignorar o fuso horário do navegador
                    // e exibir exatamente os dígitos que vieram do banco (ex: 10:05 ao invés de 07:05).
                    if (!isNaN(d)) {
                        const day = String(d.getUTCDate()).padStart(2, '0');
                        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                        const year = d.getUTCFullYear();
                        const h = String(d.getUTCHours()).padStart(2, '0');
                        const m = String(d.getUTCMinutes()).padStart(2, '0');
                        const s = String(d.getUTCSeconds()).padStart(2, '0');
                        dateStr = `${day}/${month}/${year} ${h}:${m}:${s}`;
                    } else {
                        // fallback to string direct print if it was an ISO or something that can't be parsed
                        dateStr = f.data;
                    }
                }

                html += `
                    <tr class="hover:bg-gray-50 dark:hover:bg-steel-800/50 transition-colors">
                        <td class="px-4 py-2 text-steel-600 dark:text-gray-300 font-medium whitespace-nowrap align-top border-l-2 border-transparent group-hover:border-nexo-500 transition-colors">${dateStr}</td>
                        <td class="px-4 py-2 text-steel-800 dark:text-gray-200 whitespace-nowrap align-top">${f.usuario || 'SISTEMA'}</td>
                        <td class="px-4 py-2 text-steel-600 dark:text-gray-300 break-words align-top">${f.observacao || '---'}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        },

        showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-sm font-medium z-[200] transform transition-all duration-300 translate-y-10 opacity-0 flex items-center gap-2 ${
                type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
            }`;
            
            const icon = type === 'success' 
                ? '<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
                : '<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
                
            toast.innerHTML = `${icon} <span>${message}</span>`;
            document.body.appendChild(toast);
            
            // Animate in
            requestAnimationFrame(() => {
                toast.classList.remove('translate-y-10', 'opacity-0');
            });
            
            // Remove after 4 seconds
            setTimeout(() => {
                toast.classList.add('translate-y-10', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        },

        toggleEditContrato(show) {
            if (show) {
                document.getElementById('displayContratoContainer').classList.add('hidden');
                document.getElementById('btnEditContrato').classList.add('hidden');
                document.getElementById('editContratoContainer').classList.remove('hidden');
                document.getElementById('editContratoContainer').classList.add('flex');
                
                let currentVal = document.getElementById('modalContato').textContent.trim();
                if (currentVal === '---') currentVal = '';
                document.getElementById('editContratoInput').value = currentVal;
            } else {
                document.getElementById('displayContratoContainer').classList.remove('hidden');
                document.getElementById('btnEditContrato').classList.remove('hidden');
                document.getElementById('editContratoContainer').classList.add('hidden');
                document.getElementById('editContratoContainer').classList.remove('flex');
            }
        },

        async saveContrato() {
            const input = document.getElementById('editContratoInput');
            const newValue = input.value.trim();
            const token = localStorage.getItem('token');

            if (!currentModalContext.empresa || !currentModalContext.codigo_nota) {
                this.showToast('Erro interno: Faltam dados da nota para atualização.', 'error');
                return;
            }

            try {
                input.disabled = true;
                const res = await fetch(`/api/notas/${currentModalContext.empresa}/${currentModalContext.codigo_nota}/contrato`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ contrato: newValue, numero_nota: currentModalContext.numero_nota, documento: currentModalContext.documento })
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Falha ao atualizar contrato no servidor.');
                }

                // Update UI
                document.getElementById('modalContato').textContent = newValue || '---';
                this.toggleEditContrato(false);
                this.showToast('Contrato atualizado com sucesso!');
                
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                this.showToast(err.message, 'error');
            } finally {
                input.disabled = false;
            }
        }
    };
})();



