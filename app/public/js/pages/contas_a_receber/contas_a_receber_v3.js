const ContasGrid = (function () {

    // 1. Definição das Colunas
    const columns = [
        { key: 'empresa', label: 'Empresa Vendedora', sticky: true, center: true },
        { key: 'nota', label: 'Nota', sticky: true, center: true },
        { key: 'codCliente', label: 'Cód. Cliente', center: true },
        { key: 'cliente', label: 'Cliente' },
        { key: 'esfera', label: 'Esfera', center: true },
        { key: 'uf', label: 'UF', center: true },
        { key: 'contrato', label: 'Contrato', center: true },
        { key: 'tipoContrato', label: 'Tipo Contrato', center: true },
        { key: 'edital', label: 'Edital', center: true },
        { key: 'classificacao', label: 'Classificação', center: true },
        { key: 'empenho', label: 'Nº Empenho', center: true },
        { key: 'documento', label: 'Nº Documento', center: true },
        { key: 'valor', label: 'Valor Nota', type: 'currency', center: true },
        // { key: 'boletoEmitido', label: 'Boleto Emitido' }, // Ocultado
        { key: 'valorRecebido', label: 'Valor Depósito', type: 'currency', center: true },
        { key: 'dataEmissao', label: 'Data de Emissão', type: 'date', center: true },
        { key: 'dataVencimento', label: 'Data de Vencimento', type: 'date', center: true },
        { key: 'dataPagamento', label: 'Data de Pagamento', type: 'date', center: true },
        {
            key: 'status', label: 'Status do Pagamento', center: true, render: v => {
                const variants = { PAGO: 'success', ATRASADO: 'danger', PENDENTE: 'alert' };
                const variant = variants[v] || 'neutral';
                return `<span class="status-badge status-badge-${variant}">${HubDataGrid.components.values.escape(v)}</span>`;
            }
        },
        { key: 'conta', label: 'Banco', center: true },
        { key: 'retemIr', label: 'Retém IR?', center: true }
    ];

    // 2. Estado Global
    const state = {
        rawData: [],
        filteredData: [],
        viewData: [],
        filters: {}, // { columnKey: Set(['Val1', 'Val2']) }
        sort: { key: 'dataEmissao', dir: 'desc' }, // Default order
        pagination: { current: 1, limit: 25, total: 0 }
    };
    
    let modalItens = [];
    let modalCurrentPage = 1;
    let modalGrid = null;
    
    let currentModalContext = {
        empresa: null,
        numero_nota: null,
        codigo_nota: null,
        clifor_codigo: null,
        documento: null
    };

    // 3. Integração com Banco de Dados PostgreSQL
    // Grid owns filtering, sorting, pagination, rendering and cell selection.
    columns.forEach(col => { if (!col.center) col.align = 'left'; });
    const grid = HubDataGrid.create({
        bodyId: 'contasTableBody',
        headerId: 'contasTableHeader',
        infoId: 'paginationInfo',
        paginationId: 'paginationControls',
        pageSizeId: 'itemsPerPage',
        clearId: 'btnClearAllFilters',
        exportId: 'btnExport',
        columns,
        state,
        tieBreaker: (a, b) =>
            a.nota > b.nota
                ? -1
                : a.nota < b.nota
                  ? 1
                  : (a.documento || '') < (b.documento || '')
                    ? -1
                    : (a.documento || '') > (b.documento || '')
                      ? 1
                      : 0,
        onRowClick: (row) =>
            ContasGrid.openNotaModal(
                row.empresa,
                row.nota,
                row.documento || '',
                row.cliente || '',
                row.esfera || '',
                row.uf || '',
                row.valor || '0'
            ),
        onExport: () => ContasGrid.exportToExcel(),
        onEmptyExport: () => alert('Nenhum dado para exportar com os filtros atuais.')
    });

    async function fetchData() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/titulos', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Falha ao buscar dados');

            const data = await res.json();

            // Mapeando do DB (snake_case) para a grid (camelCase)
            state.rawData = data.map(row => ({
                cliente: row.cliente || '-',
                empresa: row.empresa || '-',
                nota: row.nota || '-',
                codCliente: row.cod_cliente || '-',
                esfera: row.esfera ? row.esfera.replace(/\s+/g, ' ').trim().toUpperCase() : '-',
                uf: row.uf || '-',
                contrato: row.contrato || '-',
                tipoContrato: row.tipo_contrato || '-',
                edital: row.edital || '-',
                classificacao: row.classificacao || '-',
                empenho: row.empenho || '-',
                documento: row.documento || '-',
                valor: row.valor_nota ? row.valor_nota.toString() : '0.00',
                boletoEmitido: row.boleto_emitido || 'Não',
                valorRecebido: row.valor_deposito ? row.valor_deposito.toString() : '0.00',
                dataEmissao: row.data_emissao || '-',
                dataVencimento: row.data_vencimento || '-',
                dataPagamento: row.data_pagamento || '-',
                status: (() => {
                    const raw = row.status ? row.status.trim() : '';
                    if (raw.toUpperCase() === 'PAGO') return 'PAGO';
                    // Pendente ou vazio: checar se está atrasado
                    if (row.data_vencimento) {
                        const venc = new Date(row.data_vencimento.split('T')[0]);
                        const hoje = new Date();
                        hoje.setHours(0, 0, 0, 0);
                        if (venc < hoje && (!row.data_pagamento)) return 'ATRASADO';
                    }
                    return 'PENDENTE';
                })(),
                conta: row.banco || '-',
                retemIr: row.retem_ir || 'Não'
            }));

            processData();
        } catch (err) {
            console.error(err);
            document.getElementById('contasTableBody').innerHTML = `<tr><td colspan="22" class="px-6 py-12 text-center text-red-500">Erro ao carregar dados do servidor. O banco local está rodando?</td></tr>`;
        }
    }

    // 4. Lógica de Pipeline (Filtro -> Ordenação -> Paginação)
    function processData() {
        grid.process();
    }

    // 5. Renderização (DOM)
    function formatCurrency(val) {
        if (val === '-' || !val) return '-';
        return parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatDate(val) {
        if (val === '-' || !val) return '-';
        if (typeof val === 'string' && val.includes('T')) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            }
        }
        const parts = String(val).split('T')[0].split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return val;
    }

    function renderHeaders() {
        grid.renderHeaders();
    }

    function renderTableBody() {
        grid.renderBody();
    }

    function renderPagination() {
        grid.pagination.render();
    }

    // 6. Componente do Dropdown de Filtro (Modal Flutuante)

    function openFilter(event, colKey) {
        grid.openFilter(event, colKey);
    }

    function closeFilter() {
        grid.filters.close();
    }

    // Fechar filtro ao clicar fora


    // 7. API Exposta Globalmente
    return {
        init: function () {
            // Busca dados do backend
            fetchData();

            // Botão de Sincronização com Modal
            const btnSync = document.getElementById('btnSyncSupra');
            if (btnSync) {
                btnSync.addEventListener('click', async () => {
                    btnSync.disabled = true;
                    btnSync.classList.add('opacity-70', 'cursor-not-allowed');

                    // Helpers do Modal
                    const modal = document.getElementById('syncModal');
                    const modalContent = document.getElementById('syncModalContent');
                    const stateLoading = document.getElementById('syncStateLoading');
                    const stateSuccess = document.getElementById('syncStateSuccess');
                    const stateNoChanges = document.getElementById('syncStateNoChanges');
                    const stateError = document.getElementById('syncStateError');
                    const footer = document.getElementById('syncModalFooter');
                    const stepText = document.getElementById('syncStepText');
                    const subtitle = document.getElementById('syncModalSubtitle');
                    const title = document.getElementById('syncModalTitle');

                    function resetModal() {
                        stateLoading.classList.remove('hidden');
                        stateSuccess.classList.add('hidden');
                        stateNoChanges.classList.remove('flex'); stateNoChanges.classList.add('hidden');
                        stateError.classList.remove('flex'); stateError.classList.add('hidden');
                        footer.classList.add('hidden'); footer.classList.remove('flex');
                        title.textContent = 'Sincronizando com o Supra';
                        subtitle.textContent = 'Conectando ao servidor...';
                        stepText.textContent = 'Estabelecendo conexão...';
                        modalContent.classList.remove('scale-100'); modalContent.classList.add('scale-95');
                    }

                    function openModal() {
                        resetModal();
                        modal.classList.remove('hidden');
                        modal.classList.add('flex');
                        requestAnimationFrame(() => {
                            modal.style.opacity = '1';
                            modalContent.classList.remove('scale-95');
                            modalContent.classList.add('scale-100');
                        });
                    }

                    function showFooter() {
                        footer.classList.remove('hidden');
                        footer.classList.add('flex');
                    }

                    function closeModal() {
                        modal.style.opacity = '0';
                        modalContent.classList.remove('scale-100');
                        modalContent.classList.add('scale-95');
                        setTimeout(() => {
                            modal.classList.remove('flex');
                            modal.classList.add('hidden');
                        }, 300);
                        btnSync.disabled = false;
                        btnSync.classList.remove('opacity-70', 'cursor-not-allowed');
                    }

                    document.getElementById('syncModalClose').onclick = closeModal;

                    // Abrir modal e iniciar
                    openModal();

                    const progressText = document.getElementById('syncProgressText');
                    const progressBar = document.getElementById('syncProgressBar');
                    if (progressText) progressText.textContent = '0%';
                    if (progressBar) progressBar.style.width = '0%';

                    try {
                        const token = localStorage.getItem('token');
                        const res = await fetch('/api/titulos/sync', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        if (!res.ok) {
                            const errData = await res.json().catch(() => ({}));
                            throw new Error(errData.error || 'Erro desconhecido no servidor.');
                        }

                        const reader = res.body.getReader();
                        const decoder = new TextDecoder('utf-8');
                        let done = false;
                        let finalData = null;

                        while (!done) {
                            const { value, done: readerDone } = await reader.read();
                            done = readerDone;
                            
                            if (value) {
                                const chunk = decoder.decode(value, { stream: true });
                                const lines = chunk.split('\n').filter(l => l.trim());
                                
                                for (const line of lines) {
                                    try {
                                        const parsed = JSON.parse(line);
                                        if (parsed.type === 'progress') {
                                            stepText.textContent = parsed.data.message;
                                            if (progressText) progressText.textContent = `${parsed.data.progress}%`;
                                            if (progressBar) progressBar.style.width = `${parsed.data.progress}%`;
                                        } else if (parsed.type === 'complete') {
                                            finalData = parsed.data;
                                        } else if (parsed.type === 'error') {
                                            throw new Error(parsed.error);
                                        }
                                    } catch(e) {
                                        // Ignore parse errors on partial chunks if any
                                    }
                                }
                            }
                        }

                        if (!finalData) throw new Error('Falha ao receber a resposta final da sincronização.');

                        const data = finalData;
                        const d = data.details;
                        const totalChanges = d.totalUpdated + d.totalNew + d.totalDeleted;

                        // Esconder Loading
                        stateLoading.classList.add('hidden');

                        if (totalChanges === 0) {
                            // Estado: Sem Mudanças
                            title.textContent = 'Sincronização Completa';
                            subtitle.textContent = `${data.details.totalAnalyzed} registro(s) analisado(s). Nenhuma alteração detectada.`;
                            stateNoChanges.classList.remove('hidden');
                            stateNoChanges.classList.add('flex');
                        } else {
                            // Estado: Sucesso com detalhes
                            title.textContent = 'Sincronização Completa';
                            subtitle.textContent = `${data.details.totalAnalyzed} registro(s) analisado(s). ${totalChanges} alteração(ões) processada(s).`;

                            let resultsHtml = '';
                            d.empresas.forEach(emp => {
                                resultsHtml += `
                                    <div class="bg-gray-50 dark:bg-steel-700/50 rounded-lg p-3">
                                        <p class="font-semibold text-steel-800 dark:text-gray-200 mb-1.5">${emp.empresa}</p>
                                        <div class="grid grid-cols-4 gap-2 text-xs">
                                            <div class="flex flex-col items-center bg-white dark:bg-steel-800 rounded-md p-2">
                                                <span class="text-lg font-bold sync-count-analyzed">${emp.analyzed}</span>
                                                <span class="text-steel-500 dark:text-steel-400">Analisados</span>
                                            </div>
                                            <div class="flex flex-col items-center bg-white dark:bg-steel-800 rounded-md p-2">
                                                <span class="text-lg font-bold sync-count-updated">${emp.updated}</span>
                                                <span class="text-steel-500 dark:text-steel-400">Atualizados</span>
                                            </div>
                                            <div class="flex flex-col items-center bg-white dark:bg-steel-800 rounded-md p-2">
                                                <span class="text-lg font-bold sync-count-new">${emp.new}</span>
                                                <span class="text-steel-500 dark:text-steel-400">Novos</span>
                                            </div>
                                            <div class="flex flex-col items-center bg-white dark:bg-steel-800 rounded-md p-2">
                                                <span class="text-lg font-bold sync-count-deleted">${emp.deleted}</span>
                                                <span class="text-steel-500 dark:text-steel-400">Excluídos</span>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            });
                            document.getElementById('syncResultsContainer').innerHTML = resultsHtml;
                            stateSuccess.classList.remove('hidden');

                            // Recarregar dados da tabela
                            fetchData();
                        }
                        showFooter();

                    } catch (err) {
                        console.error(err);

                        stateLoading.classList.add('hidden');
                        title.textContent = 'Erro na Sincronização';
                        subtitle.textContent = 'Não foi possível completar';
                        document.getElementById('syncErrorMessage').textContent = err.message || 'Verifique a conexão com o servidor do Supra.';
                        stateError.classList.remove('hidden');
                        stateError.classList.add('flex');
                        showFooter();
                    }
                });
            }
        },
        toggleSort(key) { grid.toggleSort(key); },
        setPage(page) { grid.setPage(page); },
        openFilter: openFilter,
        exportToExcel() { return grid.export({ filename: 'Contas_Receber_Export_' + new Date().toISOString().slice(0,10) + '.xlsx', sheetName: 'Contas_a_Receber' }); },
        
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
            if (document.getElementById('editEsferaContainer') && !document.getElementById('editEsferaContainer').classList.contains('hidden')) {
                this.toggleEditEsfera(false);
            }
            if (document.getElementById('editContratoContainer') && !document.getElementById('editContratoContainer').classList.contains('hidden')) {
                this.toggleEditContrato(false);
            }

            document.getElementById('modalEmpresa').textContent = '---';
            document.getElementById('modalEsfera').textContent = '---';
            document.getElementById('modalUF').textContent = '---';
            document.getElementById('modalCliente').textContent = '---';
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
                    document.getElementById('modalEsfera').textContent = toTitleCase(esfera) || '---';
                    document.getElementById('modalUF').textContent = uf ? uf.toUpperCase() : '---';
                    document.getElementById('modalCliente').textContent = toTitleCase(cliente) || '---';
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
            btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-steel-600 dark:text-nexo-400 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Gerando...`;
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

        toggleEditEsfera(show) {
            if (show) {
                document.getElementById('displayEsferaContainer').classList.add('hidden');
                document.getElementById('btnEditEsfera').classList.add('hidden');
                document.getElementById('editEsferaContainer').classList.remove('hidden');
                document.getElementById('editEsferaContainer').classList.add('flex');
                
                let currentVal = document.getElementById('modalEsfera').textContent.trim().toUpperCase();
                const select = document.getElementById('editEsferaSelect');
                if (['PARTICULAR', 'MUNICIPAL', 'ESTADUAL', 'FEDERAL'].includes(currentVal)) {
                    select.value = currentVal;
                }
            } else {
                document.getElementById('displayEsferaContainer').classList.remove('hidden');
                document.getElementById('btnEditEsfera').classList.remove('hidden');
                document.getElementById('editEsferaContainer').classList.add('hidden');
                document.getElementById('editEsferaContainer').classList.remove('flex');
            }
        },

        async saveEsfera() {
            const select = document.getElementById('editEsferaSelect');
            const newValue = select.value;
            const token = localStorage.getItem('token');

            if (!currentModalContext.empresa || !currentModalContext.clifor_codigo) {
                this.showToast('Erro interno: Faltam dados do cliente para atualização.', 'error');
                return;
            }

            try {
                select.disabled = true;
                const res = await fetch(`/api/notas/${currentModalContext.empresa}/${currentModalContext.clifor_codigo}/esfera`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ esfera: newValue, documento: currentModalContext.documento })
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Falha ao atualizar esfera no servidor.');
                }

                // Update UI
                const toTitleCase = (str) => {
                    return str.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
                };
                document.getElementById('modalEsfera').textContent = toTitleCase(newValue);
                this.toggleEditEsfera(false);
                this.showToast('Esfera atualizada com sucesso!');
                
                // Background refresh grid
                fetchData(); 
            } catch (err) {
                this.showToast(err.message, 'error');
            } finally {
                select.disabled = false;
            }
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
                
                // Background refresh grid
                fetchData();
            } catch (err) {
                this.showToast(err.message, 'error');
            } finally {
                input.disabled = false;
            }
        }
    };

})();

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    ContasGrid.init();
});
