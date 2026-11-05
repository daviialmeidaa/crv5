    // ==========================================
    // 17. Modal de Saldo Ata Hospital
    // ==========================================
    let currentSaldoAtaHospitalEditId = null;
    let availableUnidades = [];

    async function fetchUnidadesForContract(contrato) {
        try {
            const res = await fetch(`/api/opme/unidades?contrato=${encodeURIComponent(contrato)}`);
            if (res.ok) {
                const data = await res.json();
                availableUnidades = data.map(u => u.sigla);
            } else {
                availableUnidades = [];
            }
        } catch (err) {
            console.error('Erro ao buscar unidades', err);
            availableUnidades = [];
        }
    }

    async function openSaldoAtaHospitalModal(idx) {
        const modal = document.getElementById('modalSaldoAtaHospital');
        const title = document.getElementById('saldoAtaHospitalModalTitle');
        const form = document.getElementById('saldoAtaHospitalForm');
        const container = document.getElementById('saldoAtaHospitalProductsContainer');
        const btnAdd = document.getElementById('btnAdicionarSaldoAtaHospitalBlock');

        form.reset();
        container.innerHTML = '';
        const contrato = state.selectedContract ? state.selectedContract.id_contrato : '';
        document.getElementById('fcSaldoAtaHospitalContrato').value = contrato;

        if (contrato) {
            await fetchUnidadesForContract(contrato);
        }

        if (idx !== null && idx !== undefined) {
            // Modo Edição
            const item = state.viewData[idx];
            if (!item) return;
            currentSaldoAtaHospitalEditId = item.id;
            title.innerHTML = `
                <svg class="h-5 w-5 text-nexo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar Item Ata Hospital
            `;
            btnAdd.classList.add('hidden');
            renderSaldoAtaHospitalBlock(item, 0, false); 
        } else {
            // Modo Criação
            currentSaldoAtaHospitalEditId = null;
            title.innerHTML = `
                <svg class="h-5 w-5 text-nexo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Novo Item Ata Hospital
            `;
            btnAdd.classList.remove('hidden');
            renderSaldoAtaHospitalBlock({}, 0, true); 
        }

        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');
            modal.querySelector('.modal-content').classList.add('scale-100', 'opacity-100');
        });
    }

    function closeSaldoAtaHospitalModal() {
        const modal = document.getElementById('modalSaldoAtaHospital');
        const content = modal.querySelector('.modal-content');
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            currentSaldoAtaHospitalEditId = null;
        }, 300);
    }

    function toggleSaldoAtaHospitalProduct(header) {
        const body = header.nextElementSibling;
        const icon = header.querySelector('.accordion-icon');
        if (body.classList.contains('hidden')) {
            body.classList.remove('hidden');
            icon.classList.remove('-rotate-90');
        } else {
            body.classList.add('hidden');
            icon.classList.add('-rotate-90');
        }
    }

    function renderSaldoAtaHospitalBlock(item, idx, canRemove) {
        const container = document.getElementById('saldoAtaHospitalProductsContainer');
        const block = document.createElement('div');
        block.className = 'sah-block border-l-4 border-l-nexo-500 border border-gray-200 dark:border-steel-600 rounded-lg bg-gray-50/50 dark:bg-steel-800/50 relative overflow-visible transition-all duration-300';
        
        let removeBtnHtml = '';
        if (canRemove) {
            removeBtnHtml = `
                <button type="button" onclick="OPME.removeSaldoAtaHospitalProduct(this)" class="text-steel-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-steel-700 rounded-md flex items-center gap-1.5 text-[11px] font-medium" title="Remover Produto">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remover
                </button>
            `;
        }

        const itemName = item.item_ata ? `ITEM ATA: ${item.item_ata}` : 'NOVO ITEM ATA HOSPITAL';
        let unidadesOptions = '<option value="">Selecione...</option>';
        availableUnidades.forEach(u => {
            unidadesOptions += `<option value="${u}" ${item.unidade === u ? 'selected' : ''}>${u}</option>`;
        });

        block.innerHTML = `
            <!-- Accordion Header -->
            <div class="flex items-center justify-between px-4 py-3 cursor-pointer group select-none hover:bg-gray-100 dark:hover:bg-steel-700/50 transition-colors rounded-t-lg" onclick="OPME.toggleSaldoAtaHospitalProduct(this)">
                <div class="flex items-center gap-3">
                    <svg class="accordion-icon h-4 w-4 text-steel-400 group-hover:text-nexo-500 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    <span class="text-xs font-bold text-steel-700 dark:text-gray-200 uppercase tracking-wide">${itemName}</span>
                </div>
                ${removeBtnHtml}
            </div>

            <!-- Accordion Body -->
            <div class="accordion-body p-4 border-t border-gray-100 dark:border-steel-700 bg-white dark:bg-steel-800 rounded-b-lg hidden">
                <div class="flex flex-col md:flex-row gap-4">
                    <!-- Coluna da Esquerda (50%) -->
                    <div class="w-full md:w-1/2 grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Unidade *</label>
                            <select class="sah-unidade w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 transition-all">
                                ${unidadesOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Item Ata *</label>
                            <input type="text" class="sah-item-ata w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 transition-all uppercase" value="${item.item_ata || ''}">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Qtde Ata *</label>
                            <input type="number" step="0.01" class="sah-qtde w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 transition-all" value="${item.quantidade_ata || ''}" oninput="OPME.calculateTotalSaldoAtaHospital(this)">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Vlr. Unitário *</label>
                            <input type="text" class="sah-vlrunit w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 transition-all" value="${item.valor_unitario ? formatCurrencyInput(item.valor_unitario) : ''}" oninput="formatCurrencyLive(this); OPME.calculateTotalSaldoAtaHospital(this)">
                        </div>
                        <div class="col-span-2">
                            <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Vlr. Total</label>
                            <input type="text" readonly class="sah-vlrtot font-bold text-emerald-600 dark:text-emerald-400 w-full px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-gray-100 dark:bg-steel-800 rounded-lg outline-none cursor-not-allowed" value="${item.valor_total ? formatCurrencyInput(item.valor_total) : ''}">
                        </div>
                    </div>
                    
                    <!-- Coluna da Direita (50%) -->
                    <div class="w-full md:w-1/2 flex flex-col">
                        <label class="block text-xs font-medium text-steel-600 dark:text-steel-400 mb-1">Descrição do Item</label>
                        <textarea class="sah-descricao custom-scrollbar w-full flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-steel-600 bg-white dark:bg-steel-700 rounded-lg text-steel-800 dark:text-gray-200 outline-none focus:border-nexo-500 input-glow transition-all uppercase resize-none">${item.descricao_item || ''}</textarea>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(block);
        
        if (!item.id) {
            const allBodies = container.querySelectorAll('.accordion-body');
            allBodies.forEach(b => {
                b.classList.add('hidden');
                b.previousElementSibling.querySelector('.accordion-icon').classList.add('-rotate-90');
            });
            const lastBody = block.querySelector('.accordion-body');
            lastBody.classList.remove('hidden');
            lastBody.previousElementSibling.querySelector('.accordion-icon').classList.remove('-rotate-90');
        }
    }

    function addSaldoAtaHospitalProduct() {
        renderSaldoAtaHospitalBlock({}, 0, true);
    }

    function removeSaldoAtaHospitalProduct(btn) {
        btn.closest('.sah-block').remove();
    }

    function calculateTotalSaldoAtaHospital(input) {
        const block = input.closest('.sah-block');
        const qtdeStr = block.querySelector('.sah-qtde').value;
        const qtde = parseFloat(qtdeStr) || 0;
        
        const vlrUnStr = block.querySelector('.sah-vlrunit').value;
        const vlrUn = parseCurrency(vlrUnStr) || 0;
        
        const total = qtde * vlrUn;
        block.querySelector('.sah-vlrtot').value = formatCurrencyInput(total);
    }

    async function saveSaldoAtaHospital() {
        const contrato = document.getElementById('fcSaldoAtaHospitalContrato').value;
        if (!contrato) return showToast('Selecione um contrato antes de salvar.', 'warning');

        const blocks = document.querySelectorAll('.sah-block');
        if (blocks.length === 0) return showToast('Adicione pelo menos um item.', 'warning');

        let items = [];
        let hasError = false;

        blocks.forEach(block => {
            const unidade = block.querySelector('.sah-unidade').value;
            const item_ata = block.querySelector('.sah-item-ata').value.trim();
            const descricao_item = block.querySelector('.sah-descricao').value.trim();
            const quantidade_ata = parseFloat(block.querySelector('.sah-qtde').value) || 0;
            const valor_unitario = parseCurrency(block.querySelector('.sah-vlrunit').value) || 0;
            const valor_total = parseCurrency(block.querySelector('.sah-vlrtot').value) || 0;

            if (!unidade) {
                hasError = true;
                showToast('A unidade é obrigatória para todos os itens.', 'warning');
            }

            items.push({
                contrato,
                unidade,
                item_ata,
                descricao_item,
                quantidade_ata,
                valor_unitario,
                valor_total
            });
        });

        if (hasError) return;

        try {
            const btn = document.querySelector('#modalSaldoAtaHospital button:last-child');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = 'Aguarde...';
            btn.disabled = true;

            let url = '/api/opme/saldo-ata-hospital';
            let method = 'POST';
            let bodyData = { items };

            if (currentSaldoAtaHospitalEditId) {
                url = `/api/opme/saldo-ata-hospital/${currentSaldoAtaHospitalEditId}`;
                method = 'PUT';
                bodyData = items[0]; 
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            const data = await res.json();
            if (res.ok) {
                showToast(currentSaldoAtaHospitalEditId ? 'Item atualizado!' : 'Itens inseridos!');
                closeSaldoAtaHospitalModal();
                fetchData();
            } else {
                showToast(data.error || 'Erro ao salvar itens de ata hospital.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Erro de conexão ao salvar.', 'error');
        } finally {
            const btn = document.querySelector('#modalSaldoAtaHospital button:last-child');
            if (btn) {
                btn.innerHTML = `
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Salvar
                `;
                btn.disabled = false;
            }
        }
    }
