// public/js/dashboard.js — Motor do Dashboard Reativo

let rawData = [];
let filteredData = [];
let charts = {};
let currentMeta = null; // { ano, mes, valor_meta }

// ═══════════ CONSTANTES DE NEGÓCIO ═══════════
const BANCOS_VALIDOS = ['BB', 'BB_BML', 'BRADESCO', 'BRADESCO_BML', 'CEF', 'CEF_BOL', 'ITAU', 'ITAU_BML', 'ITAU_BOL', 'SANTANDER', 'SANTANDER_BML'];
const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ═══════════ FILTER STATE (multi-select, pill-based) ═══════════
const activeFilters = {
    empresa: [],
    status: [],
    esfera: [],
    uf: [],
    ano: [],
    mes: []
};

// Formatação Monetária
const fmt = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

// ═══════════ INIT ═══════════
const initDashboard = async () => {
    setupEventListeners();
    await fetchDashboardData();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// ═══════════ FETCH ═══════════
async function fetchDashboardData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const icon = document.getElementById('refreshIcon');
        if (icon) icon.classList.add('animate-spin');

        const res = await fetch('/api/titulos', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        // A API retorna um array direto (result.rows)
        rawData = Array.isArray(data) ? data : (data.titulos || []);

        const hoje = new Date();
        hoje.setHours(0,0,0,0);

        // Normalização de dados para os filtros e gráficos
        rawData.forEach(t => {
            if (t.empresa) {
                t.empresa = t.empresa.trim().toUpperCase();
            }
            if (t.esfera) {
                t.esfera = t.esfera.replace(/\s+/g, ' ').trim().toUpperCase();
            }
            if (t.status) {
                t.status = t.status.trim().toUpperCase();
                if (t.status === 'PENDENTE' && t.data_vencimento) {
                    const venc = new Date(t.data_vencimento);
                    venc.setHours(0,0,0,0);
                    if (venc < hoje && (!t.data_pagamento)) {
                        t.status = 'ATRASADO';
                    }
                }
            }
        });

        populateFilterPills();
        populateMetaSelectors();
        applyFilters();
        initMap();

        // Carregar meta do mês/ano selecionado
        await loadMeta();

        if (icon) icon.classList.remove('animate-spin');
    } catch (err) {
        console.error('Erro ao buscar dados do dashboard:', err);
        const icon = document.getElementById('refreshIcon');
        if (icon) icon.classList.remove('animate-spin');
    }
}

// ═══════════ META DE RECEBIMENTO ═══════════

function populateMetaSelectors() {
    const now = new Date();
    
    // Mês: selecionar o mês atual
    const metaMes = document.getElementById('metaMes');
    if (metaMes) metaMes.value = (now.getMonth() + 1).toString();

    // Ano: preencher com anos disponíveis nos dados + ano atual
    const anosSet = new Set();
    anosSet.add(now.getFullYear().toString());
    rawData.forEach(t => {
        if (t.data_pagamento) anosSet.add(t.data_pagamento.substring(0, 4));
        if (t.data_vencimento) anosSet.add(t.data_vencimento.substring(0, 4));
    });
    const anos = [...anosSet].sort();
    
    const metaAno = document.getElementById('metaAno');
    if (metaAno) {
        metaAno.innerHTML = anos.map(a => `<option value="${a}">${a}</option>`).join('');
        metaAno.value = now.getFullYear().toString();
    }

    // Attach listeners so the chart updates when month/year changes
    if (metaMes) metaMes.addEventListener('change', updateGaugeWithMeta);
    if (metaAno) metaAno.addEventListener('change', updateGaugeWithMeta);
}

async function loadMeta() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch(`/api/metas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data && typeof data.valor_meta !== 'undefined') {
            currentMeta = data;
            const input = document.getElementById('metaValorInput');
            if (input) input.value = parseFloat(currentMeta.valor_meta).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        } else {
            currentMeta = null;
            const input = document.getElementById('metaValorInput');
            if (input) input.value = '';
        }

        // Re-render gauge com a meta
        updateGaugeWithMeta();
    } catch (err) {
        console.error('Erro ao carregar meta:', err);
    }
}

async function saveMeta() {
    try {
        const token = localStorage.getItem('token');
        const rawValue = document.getElementById('metaValorInput')?.value;
        
        if (!token || !rawValue) return;

        // Parse valor: aceitar "1.560.480,32" ou "1560480.32"
        const cleanValue = rawValue.replace(/\./g, '').replace(',', '.');
        const valorMeta = parseFloat(cleanValue);
        if (isNaN(valorMeta) || valorMeta < 0) {
            if (window.showModal) window.showModal('Atenção', 'Digite um valor numérico válido para a meta.', 'error');
            return;
        }

        const res = await fetch('/api/metas', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ valor_meta: valorMeta })
        });

        const result = await res.json();
        if (res.ok) {
            currentMeta = result;
            updateGaugeWithMeta();
            if (window.showModal) window.showModal('Sucesso', `Meta de ${MONTH_NAMES[parseInt(mes)-1]}/${ano} salva: ${fmt(valorMeta)}`, 'success');
        }
    } catch (err) {
        console.error('Erro ao salvar meta:', err);
    }
}

async function deleteMeta() {
    try {
        const token = localStorage.getItem('token');
        const mes = document.getElementById('metaMes')?.value;
        const ano = document.getElementById('metaAno')?.value;
        if (!token || !mes || !ano) return;

        // Ao invés de deletar, atualizamos para valor 0
        const res = await fetch('/api/metas', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ valor_meta: 0 })
        });

        if (res.ok) {
            currentMeta = null;
            const input = document.getElementById('metaValorInput');
            if (input) input.value = '';
            updateGaugeWithMeta();
            if (window.showModal) window.showModal('Sucesso', 'Meta removida com sucesso.', 'success');
        }
    } catch (err) {
        console.error('Erro ao deletar meta:', err);
    }
}

function updateGaugeWithMeta() {
    const mes = document.getElementById('metaMes')?.value;
    const ano = document.getElementById('metaAno')?.value;
    let recebidoNoMes = 0;

    if (mes && ano) {
        filteredData.forEach(t => {
            if (!t.data_pagamento) return;
            
            const y = t.data_pagamento.substring(0, 4);
            const m = parseInt(t.data_pagamento.substring(5, 7)).toString();
            
            if (y === ano && m === mes) {
                const dep = parseFloat(t.valor_deposito) || 0;
                recebidoNoMes += dep;
            }
        });
    }

    const refStr = (mes && ano) ? ` (${mes.padStart(2,'0')}/${ano})` : '';

    if (currentMeta && currentMeta.valor_meta > 0) {
        const mv = parseFloat(currentMeta.valor_meta);
        const subtitle = document.getElementById('gaugeSubtitle');
        if (subtitle) subtitle.textContent = `Meta: ${fmt(mv)} | Recebido${refStr}: ${fmt(recebidoNoMes)}`;
        renderChartGauge(mv, recebidoNoMes);
    } else {
        const subtitle = document.getElementById('gaugeSubtitle');
        if (subtitle) subtitle.textContent = `Sem meta | Recebido${refStr}: ${fmt(recebidoNoMes)}`;
        renderChartGauge(0, recebidoNoMes);
    }
}

// ═══════════ EVENTS ═══════════
function setupEventListeners() {
    document.getElementById('btnRefresh')?.addEventListener('click', async () => {
        Object.keys(charts).forEach(k => { if (charts[k]) { charts[k].destroy(); charts[k] = null; } });
        await fetchDashboardData();
    });

    document.getElementById('btnClearFilters')?.addEventListener('click', () => {
        Object.keys(activeFilters).forEach(k => activeFilters[k] = []);
        populateFilterPills();
        applyFilters();
        document.getElementById('btnClearFilters').classList.add('hidden');
    });

    // Advanced filters toggle
    document.getElementById('btnToggleAdvancedFilters')?.addEventListener('click', () => {
        const container = document.getElementById('advancedFiltersContainer');
        const text = document.getElementById('advancedFiltersText');
        const icon = document.getElementById('advancedFiltersIcon');
        
        if (container) {
            container.classList.toggle('hidden');
            container.classList.toggle('grid');
            
            if (container.classList.contains('hidden')) {
                text.textContent = 'Mostrar mais filtros';
                icon.classList.remove('rotate-180');
            } else {
                text.textContent = 'Ocultar filtros';
                icon.classList.add('rotate-180');
            }
        }
    });

    // Meta controls toggle
    document.getElementById('btnEditMeta')?.addEventListener('click', () => {
        const panel = document.getElementById('metaControls');
        if (panel) panel.classList.toggle('hidden');
    });

    document.getElementById('btnSalvarMeta')?.addEventListener('click', saveMeta);
    document.getElementById('btnLimparMeta')?.addEventListener('click', deleteMeta);
    document.getElementById('metaMes')?.addEventListener('change', updateGaugeWithMeta);
    document.getElementById('metaAno')?.addEventListener('change', updateGaugeWithMeta);

    // Re-renderizar gráficos ao mudar de tema (light/dark)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                updateDashboard();
                if (typeof drawMap === 'function') drawMap();
            }
        });
    });
    observer.observe(document.documentElement, { attributes: true });
}

// ═══════════ PILL SYSTEM (Slicer-style toggle buttons) ═══════════

function populateFilterPills() {
    const getUnique = (key) => {
        let values = [...new Set(rawData.map(t => t[key]).filter(Boolean))];
        
        const customOrder = {
            empresa: ['NEXOMED', 'BML', 'MEDICAL LIFE'],
            status: ['PAGO', 'PENDENTE', 'ATRASADO'],
            esfera: ['MUNICIPAL', 'ESTADUAL', 'FEDERAL', 'PARTICULAR']
        };

        if (customOrder[key]) {
            return values.sort((a, b) => {
                const indexA = customOrder[key].indexOf(a.toUpperCase());
                const indexB = customOrder[key].indexOf(b.toUpperCase());
                
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return a.localeCompare(b);
            });
        }
        
        return values.sort();
    };

    renderPillGroup('filterEmpresa', getUnique('empresa'), 'empresa');
    renderPillGroup('filterStatus', getUnique('status'), 'status');
    renderPillGroup('filterEsfera', getUnique('esfera'), 'esfera');
    renderPillGroup('filterUf', getUnique('uf'), 'uf');

    // Anos extraídos da data de emissão
    const anos = [...new Set(rawData.map(t => {
        if (!t.data_emissao) return null;
        return new Date(t.data_emissao).getFullYear().toString();
    }).filter(Boolean))].sort();
    renderPillGroup('filterAno', anos, 'ano');

    // Meses fixos
    const meses = MONTH_NAMES.map((name, i) => ({ label: name, value: (i + 1).toString() }));
    renderPillGroupCustom('filterMes', meses, 'mes');
}

function renderPillGroup(containerId, values, filterKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (values.length === 0) {
        container.innerHTML = '<span class="text-[11px] text-steel-400 italic">—</span>';
        return;
    }

    values.forEach(val => {
        const isActive = activeFilters[filterKey].includes(val);
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.textContent = val;
        pill.className = getPillClass(isActive);
        pill.addEventListener('click', () => toggleFilter(filterKey, val, containerId));
        container.appendChild(pill);
    });
}

function renderPillGroupCustom(containerId, items, filterKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    items.forEach(item => {
        const isActive = activeFilters[filterKey].includes(item.value);
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.textContent = item.label;
        pill.dataset.value = item.value;
        pill.className = getPillClass(isActive);
        pill.addEventListener('click', () => toggleFilter(filterKey, item.value, containerId, item.label));
        container.appendChild(pill);
    });
}

function getPillClass(active) {
    if (active) {
        return 'shrink-0 whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer transition-all duration-200 bg-nexo-500 text-white shadow-sm hover:bg-nexo-600';
    }
    return 'shrink-0 whitespace-nowrap px-2.5 py-1 text-[11px] font-medium rounded-md cursor-pointer transition-all duration-200 bg-gray-100 dark:bg-steel-700 text-steel-600 dark:text-steel-400 hover:bg-nexo-100 dark:hover:bg-steel-600 hover:text-nexo-700 dark:hover:text-nexo-300';
}

function toggleFilter(filterKey, value, containerId, label) {
    const arr = activeFilters[filterKey];
    const idx = arr.indexOf(value);
    if (idx > -1) {
        arr.splice(idx, 1);
    } else {
        arr.push(value);
    }

    // Re-render just this pill group visually
    const container = document.getElementById(containerId);
    if (container) {
        container.querySelectorAll('button').forEach(btn => {
            const btnVal = btn.dataset.value || btn.textContent;
            btn.className = getPillClass(activeFilters[filterKey].includes(btnVal));
        });
    }

    // Toggle clear button visibility
    const hasAny = Object.values(activeFilters).some(a => a.length > 0);
    document.getElementById('btnClearFilters')?.classList.toggle('hidden', !hasAny);

    applyFilters();
}

// ═══════════ FILTER ENGINE ═══════════

function applyFilters() {
    filteredData = rawData.filter(t => {
        if (activeFilters.empresa.length && !activeFilters.empresa.includes(t.empresa)) return false;
        if (activeFilters.status.length && !activeFilters.status.includes(t.status)) return false;
        if (activeFilters.esfera.length && !activeFilters.esfera.includes(t.esfera)) return false;
        if (activeFilters.uf.length && !activeFilters.uf.includes(t.uf)) return false;

        if (activeFilters.ano.length || activeFilters.mes.length) {
            const dt = t.data_emissao ? new Date(t.data_emissao) : null;
            if (!dt) return false;
            if (activeFilters.ano.length && !activeFilters.ano.includes(dt.getFullYear().toString())) return false;
            if (activeFilters.mes.length && !activeFilters.mes.includes((dt.getMonth() + 1).toString())) return false;
        }

        return true;
    });

    updateDashboard();
}

// ═══════════ DASHBOARD UPDATE ═══════════

function updateDashboard() {
    let totalVendido = 0;
    let totalRecebido = 0;
    let totalAberto = 0;

    filteredData.forEach(t => {
        const valorNota = parseFloat(t.valor_nota) || 0;
        const valorDep = parseFloat(t.valor_deposito) || 0;
        
        totalVendido += valorNota;
        totalRecebido += valorDep;
        
        if ((t.status || '').toUpperCase() === 'PENDENTE' || !valorDep) {
            totalAberto += valorNota;
        }
    });

    // KPI text
    document.getElementById('kpiTotalVendido').textContent = fmt(totalVendido);
    document.getElementById('kpiTotalRecebido').textContent = fmt(totalRecebido);
    document.getElementById('kpiTotalAberto').textContent = fmt(totalAberto);

    // Progress bars (relative to totalVendido)
    const maxVal = totalVendido || 1;
    document.getElementById('barTotalVendido').style.width = '100%';
    document.getElementById('barTotalRecebido').style.width = Math.min((totalRecebido / maxVal) * 100, 100).toFixed(1) + '%';
    document.getElementById('barTotalAberto').style.width = Math.min((totalAberto / maxVal) * 100, 100).toFixed(1) + '%';

    // Charts
    renderChartBancos();
    updateGaugeWithMeta(); // O gauge usa a meta, não totalVendido
    renderChartEsfera();
    renderChartEvolucao();
    renderChartTopContratos();
    renderChartTopClientes();
}

// ═══════════ CHARTS ═══════════

function getTheme() {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
function getTextColor() {
    return getTheme() === 'dark' ? '#f3f4f6' : '#374151';
}

// --- Top 5 Contratos (Donut) ---
function renderChartTopContratos() {
    const dataMap = {};
    filteredData.forEach(t => {
        const val = parseFloat(t.valor_deposito) || 0;
        if (val > 0) {
            let contrato = t.contrato ? t.contrato.trim() : '';
            if (contrato) {
                let uf = (t.uf && t.uf.trim() !== '') ? ` - ${t.uf.trim()}` : '';
                const key = contrato + uf;
                dataMap[key] = (dataMap[key] || 0) + val;
            }
        }
    });

    const sorted = Object.entries(dataMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const labels = sorted.map(x => x[0]);
    const series = sorted.map(x => x[1]);

    const isDark = getTheme() === 'dark';
    const textColor = getTextColor();
    
    if (series.length === 0) {
        labels.push('Sem Dados');
        series.push(1);
    }

    const opts = {
        series: series,
        labels: labels,
        chart: {
            type: 'donut',
            height: 320,
            fontFamily: 'Inter, sans-serif',
            background: 'transparent'
        },
        theme: { mode: isDark ? 'dark' : 'light' },
        colors: ['#0097A7', '#00838F', '#00ACC1', '#4DD0E1', '#B2EBF2'],
        stroke: { show: true, colors: isDark ? ['#1f2937'] : ['#fff'] },
        plotOptions: {
            pie: {
                donut: { size: '65%' }
            }
        },
        dataLabels: {
            enabled: false
        },
        legend: {
            position: 'bottom',
            labels: { colors: textColor }
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: {
                formatter: function (val) {
                    if (labels[0] === 'Sem Dados') return 'R$ 0,00';
                    return fmt(val);
                }
            }
        }
    };

    if (charts.topContratos) {
        charts.topContratos.updateOptions(opts, false, false);
        charts.topContratos.updateSeries(series);
    } else {
        const ctx = document.getElementById('chartTopContratos');
        if (ctx) {
            charts.topContratos = new ApexCharts(ctx, opts);
            charts.topContratos.render();
        }
    }
}

// --- Top 10 Clientes (Bar Horizontal) ---
function renderChartTopClientes() {
    const dataMap = {};
    filteredData.forEach(t => {
        const val = parseFloat(t.valor_deposito) || 0;
        if (val > 0) {
            const key = (t.cliente && t.cliente.trim() !== '') ? t.cliente.trim() : 'Não Informado';
            if (key !== 'Não Informado') {
                dataMap[key] = (dataMap[key] || 0) + val;
            }
        }
    });

    const sorted = Object.entries(dataMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const labels = sorted.map(x => x[0]);
    const series = [{
        name: 'Total Recebido',
        data: sorted.map(x => x[1])
    }];

    const isDark = getTheme() === 'dark';
    const textColor = getTextColor();

    const opts = {
        series: series,
        chart: {
            type: 'bar',
            height: 320,
            fontFamily: 'Inter, sans-serif',
            background: 'transparent',
            toolbar: { show: false }
        },
        theme: { mode: isDark ? 'dark' : 'light' },
        plotOptions: {
            bar: {
                borderRadius: 4,
                horizontal: true,
                barHeight: '60%'
            }
        },
        colors: ['#10b981'],
        dataLabels: {
            enabled: false
        },
        xaxis: {
            categories: labels,
            labels: {
                style: { colors: textColor },
                formatter: function(val) { return fmt(val); }
            },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                align: 'right',
                style: { colors: textColor },
                maxWidth: 350,
                formatter: function (value) {
                    if (value && value.length > 40) {
                        return value.substring(0, 40) + '...';
                    }
                    return value;
                }
            }
        },
        grid: {
            borderColor: isDark ? '#374151' : '#f3f4f6',
            strokeDashArray: 4,
            xaxis: { lines: { show: true } },
            yaxis: { lines: { show: false } }
        },
        tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: { formatter: function (val) { return fmt(val); } }
        }
    };

    if (charts.topClientes) {
        charts.topClientes.updateOptions(opts, false, false);
        charts.topClientes.updateSeries(series);
    } else {
        const ctx = document.getElementById('chartTopClientes');
        if (ctx) {
            charts.topClientes = new ApexCharts(ctx, opts);
            charts.topClientes.render();
        }
    }
}

// --- Recebimento por Banco (Horizontal Bar) - APENAS bancos válidos ---
function renderChartBancos() {
    const group = {};

    // Inicializar todos os bancos válidos com 0
    BANCOS_VALIDOS.forEach(b => group[b] = 0);

    filteredData.forEach(t => {
        const b = (t.banco || '').trim().toUpperCase();
        if (!BANCOS_VALIDOS.includes(b)) return; // Ignorar bancos fora da lista
        const val = parseFloat(t.valor_deposito) || 0;
        if (val > 0) group[b] += val;
    });

    // Ordenar por valor desc — mostrar TODOS os bancos válidos inclusive com 0
    const sorted = Object.entries(group)
        .sort((a, b) => b[1] - a[1]);

    const seriesData = sorted.map(i => parseFloat(i[1].toFixed(2)));
    const categories = sorted.map(i => i[0]);

    const opts = {
        series: [{ name: 'Recebido', data: seriesData }],
        chart: { type: 'bar', height: 240, fontFamily: 'Inter, sans-serif', toolbar: { show: false }, background: 'transparent' },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%' } },
        dataLabels: {
            enabled: true,
            formatter: (val) => fmt(val),
            style: { fontSize: '10px', colors: [getTextColor()] },
            offsetX: 5
        },
        xaxis: { categories, labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { fontSize: '10px', colors: [getTextColor()] } } },
        grid: { show: false },
        colors: ['#0097A7'],
        tooltip: { y: { formatter: (val) => fmt(val) }, theme: getTheme() },
        theme: { mode: getTheme() }
    };

    if (!charts.bancos) {
        charts.bancos = new ApexCharts(document.querySelector("#chartBancos"), opts);
        charts.bancos.render();
    } else {
        charts.bancos.updateOptions(opts, false, false);
    }
}

// --- Gauge: Meta do Mês vs Recebido ---
function renderChartGauge(metaValor, recebidoNoMes) {
    let perc = 0;
    if (metaValor > 0) {
        perc = Math.min((recebidoNoMes / metaValor) * 100, 100);
    } else if (recebidoNoMes > 0) {
        perc = 100; // sem meta definida, mas recebeu algo
    }

    const opts = {
        series: [parseFloat(perc.toFixed(1))],
        chart: { type: 'radialBar', height: 220, fontFamily: 'Inter, sans-serif', background: 'transparent' },
        plotOptions: {
            radialBar: {
                startAngle: -135,
                endAngle: 135,
                hollow: { size: '55%' },
                track: { background: getTheme() === 'dark' ? '#374151' : '#e5e7eb', strokeWidth: '100%' },
                dataLabels: {
                    name: { show: true, fontSize: '12px', color: getTextColor(), offsetY: -8 },
                    value: { fontSize: '26px', fontWeight: 'bold', color: getTextColor(), offsetY: 4, formatter: (val) => val + '%' }
                }
            }
        },
        fill: {
            type: 'gradient',
            gradient: { shade: 'dark', type: 'horizontal', shadeIntensity: 0.5, gradientToColors: ['#10b981'], stops: [0, 100] }
        },
        stroke: { lineCap: 'round' },
        labels: ['da Meta'],
        colors: perc < 30 ? ['#f43f5e'] : perc < 70 ? ['#f59e0b'] : ['#0097A7']
    };

    if (!charts.gauge) {
        charts.gauge = new ApexCharts(document.querySelector("#chartGauge"), opts);
        charts.gauge.render();
    } else {
        charts.gauge.updateOptions(opts, false, false);
    }
}

// --- Donut: Recebimento por Esfera ---
function renderChartEsfera() {
    const group = {};
    filteredData.forEach(t => {
        const e = (t.esfera || 'N/I').trim();
        if (e === 'N/I' || e === '-') return;
        const val = parseFloat(t.valor_deposito) || 0;
        if (val > 0) group[e] = (group[e] || 0) + val;
    });

    const labels = Object.keys(group);
    const seriesData = Object.values(group).map(v => parseFloat(v.toFixed(2)));

    const opts = {
        series: seriesData.length ? seriesData : [1],
        labels: labels.length ? labels : ['Sem dados'],
        chart: { type: 'donut', height: 240, fontFamily: 'Inter, sans-serif', background: 'transparent' },
        colors: ['#0097A7', '#f43f5e', '#f59e0b', '#8b5cf6', '#10b981', '#6366f1'],
        stroke: { show: false },
        legend: { position: 'bottom', fontSize: '11px', labels: { colors: getTextColor() } },
        dataLabels: { enabled: true, style: { fontSize: '11px' }, dropShadow: { enabled: false } },
        tooltip: { y: { formatter: (val) => fmt(val) }, theme: getTheme() },
        plotOptions: {
            pie: {
                donut: {
                    size: '55%',
                    labels: {
                        show: true,
                        name: { fontSize: '12px', color: getTextColor() },
                        value: { fontSize: '16px', color: getTextColor(), formatter: (val) => fmt(val) },
                        total: {
                            show: true,
                            label: 'Total',
                            color: getTextColor(),
                            fontSize: '12px',
                            formatter: (w) => fmt(w.globals.seriesTotals.reduce((a, b) => a + b, 0))
                        }
                    }
                }
            }
        },
        theme: { mode: getTheme() }
    };

    if (!charts.esfera) {
        charts.esfera = new ApexCharts(document.querySelector("#chartEsfera"), opts);
        charts.esfera.render();
    } else {
        charts.esfera.updateOptions(opts, false, false);
    }
}

// --- Evolução Mensal (Area + Column) ---
function renderChartEvolucao() {
    const temporal = {};
    filteredData.forEach(t => {
        if (!t.data_emissao) return;
        const dt = new Date(t.data_emissao);
        const key = `${dt.getFullYear()}-${(dt.getMonth()+1).toString().padStart(2,'0')}`;

        if (!temporal[key]) temporal[key] = { recebido: 0, aberto: 0 };
        const valorNota = parseFloat(t.valor_nota) || 0;
        const valorDep = parseFloat(t.valor_deposito) || 0;

        temporal[key].recebido += valorDep;
        if ((t.status || '').toUpperCase() === 'PENDENTE' || !valorDep) {
            temporal[key].aberto += valorNota;
        }
    });

    const keys = Object.keys(temporal).sort();
    const labels = keys.map(k => {
        const [y, m] = k.split('-');
        return `${MONTH_NAMES[parseInt(m)-1]} ${y.substring(2)}`;
    });
    const dataRec = keys.map(k => parseFloat(temporal[k].recebido.toFixed(2)));
    const dataAb = keys.map(k => parseFloat(temporal[k].aberto.toFixed(2)));

    const opts = {
        series: [
            { name: 'Recebido', data: dataRec },
            { name: 'Em Aberto', data: dataAb }
        ],
        chart: { height: 240, type: 'line', fontFamily: 'Inter, sans-serif', toolbar: { show: false }, background: 'transparent' },
        stroke: { curve: 'smooth', width: 3 },
        xaxis: { categories: labels, labels: { style: { fontSize: '10px', colors: getTextColor() }, rotate: -45, rotateAlways: keys.length > 10 } },
        yaxis: { labels: { formatter: (val) => { if (val >= 1e6) return 'R$ ' + (val/1e6).toFixed(1) + 'M'; if (val >= 1e3) return 'R$ ' + (val/1e3).toFixed(0) + 'k'; return 'R$ ' + val; }, style: { colors: getTextColor() } } },
        tooltip: { y: { formatter: (val) => fmt(val) }, theme: getTheme() },
        colors: ['#0097A7', '#f43f5e'],
        legend: { position: 'top', fontSize: '12px', labels: { colors: getTextColor() } },
        theme: { mode: getTheme() }
    };

    if (!charts.evolucao) {
        charts.evolucao = new ApexCharts(document.querySelector("#chartEvolucao"), opts);
        charts.evolucao.render();
    } else {
        charts.evolucao.updateOptions(opts, false, false);
    }
}

// ═══════════ GOOGLE GEO CHART (Mapa do Brasil) ═══════════

function initMap() {
    if (typeof google === 'undefined' || !google.charts) {
        document.getElementById('brazilMapContainer').innerHTML = '<span class="text-xs text-steel-400 p-4">Mapa indisponível no momento.</span>';
        return;
    }

    google.charts.load('current', { packages: ['geochart'] });
    google.charts.setOnLoadCallback(drawMap);
}

function drawMap() {
    const ufGroup = {};
    filteredData.forEach(t => {
        if (t.uf) {
            ufGroup[t.uf] = (ufGroup[t.uf] || 0) + (parseFloat(t.valor_nota) || 0);
        }
    });

    const mapArr = [['Estado', 'Total (R$)']];
    const allUFs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
    allUFs.forEach(uf => {
        if (activeFilters.uf.length > 0 && !activeFilters.uf.includes(uf)) {
            mapArr.push([{ v: `BR-${uf}`, f: uf }, null]);
        } else {
            mapArr.push([{ v: `BR-${uf}`, f: uf }, ufGroup[uf] || 0]);
        }
    });

    const data = google.visualization.arrayToDataTable(mapArr);
    const isDark = document.documentElement.classList.contains('dark');

    const options = {
        region: 'BR',
        resolution: 'provinces',
        colorAxis: { colors: [isDark ? '#374151' : '#e0f7fa', '#0097A7', '#004D40'] },
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        datalessRegionColor: isDark ? '#4b5563' : '#e5e7eb',
        defaultColor: isDark ? '#4b5563' : '#e5e7eb',
        legend: 'none',
        tooltip: { trigger: 'focus', textStyle: { fontSize: 12 } },
        keepAspectRatio: true
    };

    const container = document.getElementById('brazilMapContainer');
    container.innerHTML = '';

    const chart = new google.visualization.GeoChart(container);

    google.visualization.events.addListener(chart, 'select', function () {
        const sel = chart.getSelection();
        if (sel.length > 0) {
            const ufIso = data.getValue(sel[0].row, 0); // BR-MG
            const uf = ufIso.replace('BR-', '');
            toggleFilter('uf', uf, 'filterUf');
        }
    });

    chart.draw(data, options);
}
