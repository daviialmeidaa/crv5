// public/js/dashboard.js — Motor do Dashboard Reativo

let rawData = [];
let filteredData = [];
let charts = {};

// ═══════════ FILTER STATE (multi-select, pill-based) ═══════════
const activeFilters = {
    empresa: [],
    status: [],
    esfera: [],
    uf: [],
    ano: [],
    mes: []
};

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

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

        populateFilterPills();
        applyFilters();
        initMap();

        if (icon) icon.classList.remove('animate-spin');
    } catch (err) {
        console.error('Erro ao buscar dados do dashboard:', err);
        const icon = document.getElementById('refreshIcon');
        if (icon) icon.classList.remove('animate-spin');
    }
}

// ═══════════ EVENTS ═══════════
function setupEventListeners() {
    document.getElementById('btnRefresh')?.addEventListener('click', async () => {
        // Destroy all charts so they re-render cleanly
        Object.keys(charts).forEach(k => { if (charts[k]) { charts[k].destroy(); charts[k] = null; } });
        await fetchDashboardData();
    });

    document.getElementById('btnClearFilters')?.addEventListener('click', () => {
        Object.keys(activeFilters).forEach(k => activeFilters[k] = []);
        populateFilterPills(); // re-render all pills as inactive
        applyFilters();
        document.getElementById('btnClearFilters').classList.add('hidden');
    });
}

// ═══════════ PILL SYSTEM (Slicer-style toggle buttons) ═══════════

function populateFilterPills() {
    const getUnique = (key) => [...new Set(rawData.map(t => t[key]).filter(Boolean))].sort();

    renderPillGroup('filterEmpresa', getUnique('empresa'), 'empresa');
    renderPillGroup('filterStatus', getUnique('status'), 'status');
    renderPillGroup('filterEsfera', getUnique('esfera'), 'esfera');
    renderPillGroup('filterUf', getUnique('uf'), 'uf');

    // Anos extraídos da data de vencimento
    const anos = [...new Set(rawData.map(t => {
        if (!t.data_vencimento) return null;
        return new Date(t.data_vencimento).getFullYear().toString();
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
        return 'px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer transition-all duration-200 bg-nexo-500 text-white shadow-sm hover:bg-nexo-600';
    }
    return 'px-2.5 py-1 text-[11px] font-medium rounded-md cursor-pointer transition-all duration-200 bg-gray-100 dark:bg-steel-700 text-steel-600 dark:text-steel-400 hover:bg-nexo-100 dark:hover:bg-steel-600 hover:text-nexo-700 dark:hover:text-nexo-300';
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
            const dt = t.data_vencimento ? new Date(t.data_vencimento) : null;
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

    filteredData.forEach(t => {
        const valorNota = parseFloat(t.valor_nota) || 0;
        const valorDep = parseFloat(t.valor_deposito) || 0;
        totalVendido += valorNota;
        if (t.status === 'PAGO') {
            totalRecebido += (valorDep > 0 ? valorDep : valorNota);
        }
    });

    const totalAberto = totalVendido - totalRecebido;

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
    renderChartGauge(totalVendido, totalRecebido);
    renderChartEsfera();
    renderChartEvolucao();
}

// ═══════════ CHARTS ═══════════

function getTheme() {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
function getTextColor() {
    return getTheme() === 'dark' ? '#d1d5db' : '#374151';
}

// --- Recebimento por Banco (Horizontal Bar) ---
function renderChartBancos() {
    const group = {};
    filteredData.forEach(t => {
        if (t.status !== 'PAGO') return;
        const b = (t.banco || 'NÃO INFORMADO').trim();
        const val = parseFloat(t.valor_deposito) || parseFloat(t.valor_nota) || 0;
        group[b] = (group[b] || 0) + val;
    });

    const sorted = Object.entries(group).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const seriesData = sorted.map(i => parseFloat(i[1].toFixed(2)));
    const categories = sorted.map(i => i[0].length > 18 ? i[0].substring(0, 18) + '…' : i[0]);

    const opts = {
        series: [{ name: 'Recebido', data: seriesData }],
        chart: { type: 'bar', height: '100%', fontFamily: 'Inter, sans-serif', toolbar: { show: false }, background: 'transparent' },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
        dataLabels: {
            enabled: true,
            formatter: (val) => fmt(val),
            style: { fontSize: '10px', colors: [getTextColor()] },
            offsetX: 5
        },
        xaxis: { categories, labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { fontSize: '11px', colors: [getTextColor()] } } },
        grid: { show: false },
        colors: ['#0097A7'],
        tooltip: { y: { formatter: (val) => fmt(val) } },
        theme: { mode: getTheme() }
    };

    if (!charts.bancos) {
        charts.bancos = new ApexCharts(document.querySelector("#chartBancos"), opts);
        charts.bancos.render();
    } else {
        charts.bancos.updateOptions({ xaxis: { categories } });
        charts.bancos.updateSeries([{ data: seriesData }]);
    }
}

// --- Gauge (Radial Bar) ---
function renderChartGauge(vendido, recebido) {
    let perc = vendido > 0 ? Math.min((recebido / vendido) * 100, 100) : 0;

    const opts = {
        series: [parseFloat(perc.toFixed(1))],
        chart: { type: 'radialBar', height: '100%', fontFamily: 'Inter, sans-serif', background: 'transparent' },
        plotOptions: {
            radialBar: {
                startAngle: -135,
                endAngle: 135,
                hollow: { size: '60%' },
                track: { background: getTheme() === 'dark' ? '#374151' : '#e5e7eb', strokeWidth: '100%' },
                dataLabels: {
                    name: { show: true, fontSize: '13px', color: getTextColor(), offsetY: -10 },
                    value: { fontSize: '28px', fontWeight: 'bold', color: getTextColor(), offsetY: 5, formatter: (val) => val + '%' }
                }
            }
        },
        fill: {
            type: 'gradient',
            gradient: { shade: 'dark', type: 'horizontal', shadeIntensity: 0.5, gradientToColors: ['#10b981'], stops: [0, 100] }
        },
        stroke: { lineCap: 'round' },
        labels: ['Recebido'],
        colors: ['#0097A7']
    };

    if (!charts.gauge) {
        charts.gauge = new ApexCharts(document.querySelector("#chartGauge"), opts);
        charts.gauge.render();
    } else {
        charts.gauge.updateSeries([parseFloat(perc.toFixed(1))]);
    }
}

// --- Donut: Recebimento por Esfera ---
function renderChartEsfera() {
    const group = {};
    filteredData.forEach(t => {
        if (t.status !== 'PAGO') return;
        const e = (t.esfera || 'N/I').trim();
        const val = parseFloat(t.valor_deposito) || parseFloat(t.valor_nota) || 0;
        group[e] = (group[e] || 0) + val;
    });

    const labels = Object.keys(group);
    const seriesData = Object.values(group).map(v => parseFloat(v.toFixed(2)));

    const opts = {
        series: seriesData.length ? seriesData : [1],
        labels: labels.length ? labels : ['Sem dados'],
        chart: { type: 'donut', height: '100%', fontFamily: 'Inter, sans-serif', background: 'transparent' },
        colors: ['#0097A7', '#f43f5e', '#f59e0b', '#8b5cf6', '#10b981', '#6366f1'],
        legend: { position: 'bottom', fontSize: '12px', labels: { colors: getTextColor() } },
        dataLabels: { enabled: true, style: { fontSize: '11px' } },
        tooltip: { y: { formatter: (val) => fmt(val) } },
        plotOptions: { pie: { donut: { size: '55%', labels: { show: true, total: { show: true, label: 'Total', formatter: (w) => fmt(w.globals.seriesTotals.reduce((a,b) => a+b, 0)) } } } } },
        theme: { mode: getTheme() }
    };

    if (!charts.esfera) {
        charts.esfera = new ApexCharts(document.querySelector("#chartEsfera"), opts);
        charts.esfera.render();
    } else {
        charts.esfera.updateOptions({ labels: labels.length ? labels : ['Sem dados'] });
        charts.esfera.updateSeries(seriesData.length ? seriesData : [1]);
    }
}

// --- Evolução Mensal (Area + Line) ---
function renderChartEvolucao() {
    const temporal = {};
    filteredData.forEach(t => {
        if (!t.data_vencimento) return;
        const dt = new Date(t.data_vencimento);
        const key = `${dt.getFullYear()}-${(dt.getMonth()+1).toString().padStart(2,'0')}`;

        if (!temporal[key]) temporal[key] = { recebido: 0, aberto: 0 };
        const valor = parseFloat(t.valor_nota) || 0;
        const dep = parseFloat(t.valor_deposito) || 0;

        if (t.status === 'PAGO') {
            temporal[key].recebido += (dep > 0 ? dep : valor);
        } else {
            temporal[key].aberto += valor;
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
            { name: 'Recebido', type: 'area', data: dataRec },
            { name: 'Em Aberto', type: 'column', data: dataAb }
        ],
        chart: { height: '100%', type: 'line', fontFamily: 'Inter, sans-serif', toolbar: { show: false }, background: 'transparent', stacked: false },
        stroke: { curve: 'smooth', width: [3, 0] },
        fill: { type: ['gradient', 'solid'], opacity: [0.25, 0.85] },
        xaxis: { categories: labels, labels: { style: { fontSize: '10px', colors: getTextColor() }, rotate: -45, rotateAlways: keys.length > 10 } },
        yaxis: { labels: { formatter: (val) => { if (val >= 1e6) return 'R$ ' + (val/1e6).toFixed(1) + 'M'; if (val >= 1e3) return 'R$ ' + (val/1e3).toFixed(0) + 'k'; return 'R$ ' + val; }, style: { colors: [getTextColor()] } } },
        tooltip: { y: { formatter: (val) => fmt(val) } },
        colors: ['#0097A7', '#f43f5e'],
        legend: { position: 'top', fontSize: '12px', labels: { colors: getTextColor() } },
        theme: { mode: getTheme() }
    };

    if (!charts.evolucao) {
        charts.evolucao = new ApexCharts(document.querySelector("#chartEvolucao"), opts);
        charts.evolucao.render();
    } else {
        charts.evolucao.updateOptions({ xaxis: { categories: labels } });
        charts.evolucao.updateSeries([
            { name: 'Recebido', data: dataRec },
            { name: 'Em Aberto', data: dataAb }
        ]);
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
        mapArr.push([{ v: `BR-${uf}`, f: uf }, ufGroup[uf] || 0]);
    });

    const data = google.visualization.arrayToDataTable(mapArr);
    const isDark = document.documentElement.classList.contains('dark');

    const options = {
        region: 'BR',
        resolution: 'provinces',
        colorAxis: { colors: [isDark ? '#1f2937' : '#e0f7fa', '#0097A7', '#004D40'] },
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        datalessRegionColor: isDark ? '#374151' : '#f3f4f6',
        defaultColor: isDark ? '#374151' : '#f3f4f6',
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
