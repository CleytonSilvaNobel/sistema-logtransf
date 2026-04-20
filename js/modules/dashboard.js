/**
 * LogTransf - Dashboard Module
 * Includes: KPI Cards, Occupancy Charts, Cost Analysis, Driver Ranking, Insights Box
 */

const DashboardModule = {
    filters: {
        startDate: '',
        endDate: '',
        origem: 'Todos',
        destino: 'Todos'
    },
    
    // Track chart instances to destroy them before re-rendering
    charts: {},

    // ==============================
    // CENTRALIZED COLOR MAP
    // Convencional (c1) = Azul | Double Deck (c2) = Amarelo
    // ==============================
    colorMap: {
        'c1': '#38bdf8',  // Azul
        'c2': '#fbbf24'   // Amarelo/Dourado
    },

    getColor(carretaId) {
        return this.colorMap[carretaId] || '#94a3b8';
    },

    initFilters() {
        if (!this.filters.startDate) {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            this.filters.startDate = firstDay.toISOString().split('T')[0];
            this.filters.endDate = Utils.getToday();
        }
    },

    renderView() {
        this.initFilters();
        const today = Utils.getToday();
        const allViagens = Store.get('viagens');
        const allSaldos = Store.get('saldos');
        const config = Store.get('config');
        const custosAtuais = Store.getCustosForDate(today);
        let hasCosts = Object.values(custosAtuais).some(v => v > 0);
        
        // Proteção de visibilidade financeira
        const currentRole = App.currentUser ? String(App.currentUser.grupo || '').toUpperCase() : '';
        if (!['ADM', 'SUPERVISOR'].includes(currentRole)) {
            hasCosts = false;
        }
        
        const locais = Store.get('locais') || [];
        
        // Apply Filters
        const filteredViagens = allViagens.filter(v => {
            const matchDate = v.data >= this.filters.startDate && v.data <= this.filters.endDate;
            const matchOrigem = this.filters.origem === 'Todos' || v.id_origem === this.filters.origem;
            const matchDestino = this.filters.destino === 'Todos' || v.id_destino === this.filters.destino;
            return matchDate && matchOrigem && matchDestino;
        }).sort((a,b) => new Date(a.data) - new Date(b.data));
        
        const filteredSaldos = allSaldos.filter(s => 
            s.data >= this.filters.startDate && s.data <= this.filters.endDate
        );

        // Today's Stats
        const tripsToday = allViagens.filter(v => v.data === today);
        const saldoTodayObj = allSaldos.find(s => s.data === today);
        const initialBalance = saldoTodayObj ? saldoTodayObj.saldo_inicio : 0;
        const totalSentToday = tripsToday.reduce((acc, v) => acc + (v.quantidade_paletes || 0), 0);
        const remainingToday = Math.max(0, initialBalance - totalSentToday);
        
        // Multi-day Stats
        const totalSentPeriod = filteredViagens.reduce((acc, v) => acc + (v.quantidade_paletes || 0), 0);
        const totalTripsPeriod = filteredViagens.length;
        const activeDays = Utils.getDaysWithData(filteredViagens);
        const avgTripsPerDay = activeDays > 0 ? (totalTripsPeriod / activeDays) : 0;

        const avgConv = this.calcAvgOccupancy(filteredViagens, 'c1');
        const avgDouble = this.calcAvgOccupancy(filteredViagens, 'c2');

        // Truck-specific day counts and averages
        const tripsConv = filteredViagens.filter(v => v.id_tipo_carreta === 'c1');
        const tripsDouble = filteredViagens.filter(v => v.id_tipo_carreta === 'c2');
        const daysConv = Utils.getDaysWithData(tripsConv);
        const daysDouble = Utils.getDaysWithData(tripsDouble);
        const avgTripsConv = daysConv > 0 ? (tripsConv.length / daysConv) : 0;
        const avgTripsDouble = daysDouble > 0 ? (tripsDouble.length / daysDouble) : 0;

        const content = `
            <div class="module-container">
                <div class="card filter-card" style="margin-bottom: 1.5rem;">
                    <div style="display: flex; gap: 1.5rem; align-items: flex-end; flex-wrap: wrap;">
                        <div class="form-group">
                            <label>Data Inicial</label>
                            <input type="date" id="dash-start" class="form-control" value="${this.filters.startDate}">
                        </div>
                        <div class="form-group">
                            <label>Data Final</label>
                            <input type="date" id="dash-end" class="form-control" value="${this.filters.endDate}">
                        </div>
                        <div class="form-group">
                            <label>Origem</label>
                            <select id="dash-origem" class="form-control">
                                <option value="Todos" ${this.filters.origem === 'Todos' ? 'selected' : ''}>Todas</option>
                                ${locais.map(l => `<option value="${l.id}" ${this.filters.origem === l.id ? 'selected' : ''}>${l.nome}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Destino</label>
                            <select id="dash-destino" class="form-control">
                                <option value="Todos" ${this.filters.destino === 'Todos' ? 'selected' : ''}>Todos</option>
                                ${locais.map(l => `<option value="${l.id}" ${this.filters.destino === l.id ? 'selected' : ''}>${l.nome}</option>`).join('')}
                            </select>
                        </div>
                        <button class="btn btn-primary" id="btn-apply-filters">
                            <i data-lucide="filter"></i> Filtrar
                        </button>
                    </div>
                </div>

                <div class="kpi-grid">
                    <div class="card kpi-card">
                        <div class="kpi-icon blue"><i data-lucide="calendar"></i></div>
                        <div class="kpi-info">
                            <span class="kpi-label">Média Viagens / Dia</span>
                            <h3 class="kpi-value">${Utils.formatNumber(avgTripsPerDay, 1)} <small>vgs</small></h3>
                        </div>
                    </div>
                    <div class="card kpi-card">
                        <div class="kpi-icon green"><i data-lucide="send"></i></div>
                        <div class="kpi-info">
                            <span class="kpi-label">Paletes Enviados</span>
                            <h3 class="kpi-value">${Utils.formatNumber(totalSentPeriod)} <small>plts</small></h3>
                        </div>
                    </div>
                    <div class="card kpi-card">
                        <div class="kpi-icon indigo"><i data-lucide="navigation"></i></div>
                        <div class="kpi-info">
                            <span class="kpi-label">Total Viagens</span>
                            <h3 class="kpi-value">${totalTripsPeriod} <small>vgs</small></h3>
                        </div>
                    </div>
                    <div class="card kpi-card resaltar">
                        <div class="kpi-icon yellow"><i data-lucide="package-search"></i></div>
                        <div class="kpi-info">
                            <span class="kpi-label">Saldo Hoje</span>
                            <h3 class="kpi-value">${Utils.formatNumber(remainingToday)} <small>plts</small></h3>
                        </div>
                    </div>
                </div>

                <div class="dashboard-main-grid" style="margin-top: 2rem;">
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        <div class="card truck-card">
                            <h4><i data-lucide="truck"></i> Convencional</h4>
                            ${this.renderIndicator('conv', avgConv, tripsConv.length, avgTripsConv)}
                        </div>
                        <div class="card truck-card">
                            <h4><i data-lucide="layers"></i> Double Deck</h4>
                            ${this.renderIndicator('double', avgDouble, tripsDouble.length, avgTripsDouble)}
                        </div>
                    </div>

                        <div class="card chart-card">
                            <div class="card-header">
                                <h3><i data-lucide="trending-up"></i> Ocupação por Veículo (%)</h3>
                            </div>
                            <div style="height: 180px; width: 100%;">
                                <canvas id="occ-period-chart"></canvas>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        <div class="card chart-card">
                            <div class="card-header">
                                <h3><i data-lucide="bar-chart-3"></i> Participação Temporal (%)</h3>
                                <p style="font-size: 0.75rem; color: var(--text-muted);">Composição de paletes transportados ao longo do tempo</p>
                            </div>
                            <div style="height: 250px; width: 100%;">
                                <canvas id="participation-chart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Productivity Grid -->
                <div class="dashboard-main-grid" style="margin-top: 1.5rem; grid-template-columns: 2fr 1fr;">
                    <div class="card chart-card">
                        <div class="card-header">
                            <h3><i data-lucide="medal"></i> Ranking de Motoristas (Total de Viagens)</h3>
                        </div>
                        <div style="height: 300px; width: 100%;">
                            <canvas id="drivers-chart"></canvas>
                        </div>
                    </div>
                    <div class="card chart-card">
                        <div class="card-header">
                            <h3><i data-lucide="pie-chart"></i> Viagens por Tipo</h3>
                        </div>
                        <div style="height: 300px; width: 100%;">
                            <canvas id="vehicle-type-chart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Performance Flow Chart -->
                <div class="card chart-card wide-card" style="margin-top: 1.5rem;">
                    <div class="card-header">
                        <h3><i data-lucide="activity"></i> Desempenho de Escoamento (Saldo vs. Realizado)</h3>
                        <p style="font-size: 0.75rem; color: var(--text-muted);">Acompanhamento diário da demanda (Saldo Inicial) vs. Execução (Enviados)</p>
                    </div>
                    <div style="height: 300px; width: 100%;">
                        <canvas id="performance-flow-chart"></canvas>
                    </div>
                </div>

                <!-- Insights Box -->
                <div id="insights-box" class="card insights-card" style="margin-top: 1.5rem;">
                    <div class="card-header" style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="kpi-icon" style="background: rgba(251, 191, 36, 0.15); color: #d97706; width: 36px; height: 36px; border-radius: 10px;">
                            <i data-lucide="lightbulb"></i>
                        </div>
                        <div>
                            <h3 style="margin: 0;">Insights Operacionais</h3>
                            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">Sugestões automáticas baseadas nos indicadores do período filtrado</p>
                        </div>
                    </div>
                    <div id="insights-list" style="padding: 1rem 1.5rem;">
                        <p style="color: var(--text-muted); font-size: 0.9rem;">Analisando dados...</p>
                    </div>
                </div>

                ${hasCosts ? `
                <!-- Cost Analysis Chart -->
                <div class="card chart-card wide-card" style="margin-top: 1.5rem;">
                    <div class="card-header">
                        <h3><i data-lucide="dollar-sign"></i> Custo Operacional Diário (R$)</h3>
                        <p style="font-size: 0.75rem; color: var(--text-muted);">Barras: custo total por tipo de veículo | Linha: custo médio por palete (eixo direito)</p>
                    </div>
                    <div style="height: 320px; width: 100%;">
                        <canvas id="cost-chart"></canvas>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        const container = App.contentBody || document.querySelector('.content-body');
        if (container) container.innerHTML = content;
        
        lucide.createIcons();
        this.bindEvents();
        
        // Timeout to ensure canvas is ready in DOM
        setTimeout(() => {
            try {
                this.renderCharts(filteredViagens);
                this.renderInsights(filteredViagens, allViagens);
            } catch (e) {
                console.error('Error rendering dashboard charts:', e);
            }
        }, 100);
    },

    bindEvents() {
        const btn = document.getElementById('btn-apply-filters');
        if (btn) {
            btn.addEventListener('click', () => this.applyFilters());
        }
    },

    applyFilters() {
        const btn = document.getElementById('btn-apply-filters');
        if (btn) btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Processando...';
        
        setTimeout(() => {
            this.filters.startDate = document.getElementById('dash-start').value;
            this.filters.endDate = document.getElementById('dash-end').value;
            this.filters.origem = document.getElementById('dash-origem').value;
            this.filters.destino = document.getElementById('dash-destino').value;
            this.renderView();
        }, 300);
    },

    calcAvgOccupancy(viagens, truckId) {
        const filtered = viagens.filter(v => v.id_tipo_carreta === truckId);
        if (filtered.length === 0) return 0;
        const sum = filtered.reduce((acc, v) => acc + (v.ocupacao || 0), 0);
        return sum / filtered.length;
    },

    renderIndicator(type, percent, totalTrips, avgPerDay) {
        const color = UI.getOccColor(percent);
        return `
            <div class="truck-box">
                <div class="indicator-area">
                    <div class="bar-label">
                        <span>Ocupação Média</span>
                        <strong>${Utils.formatNumber(percent, 1)}%</strong>
                    </div>
                    <div class="progress-bar-full">
                        <div class="progress-bar-fill" style="width: ${percent}%; background-color: ${color}"></div>
                    </div>
                </div>
                <div class="truck-meta" style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                        <span class="badge-blue">Total: ${totalTrips} vgs</span>
                        <span class="badge-blue" style="background: rgba(99, 102, 241, 0.1); color: #6366f1;">Média: ${Utils.formatNumber(avgPerDay, 1)} vgs/dia</span>
                    </div>
                    <span style="font-weight: 700; color: ${color}; font-size: 0.8rem;">${percent >= 90 ? 'EXCELENTE' : (percent >= 70 ? 'BOM' : 'BAIXA')}</span>
                </div>
            </div>
        `;
    },

    // ==============================
    // CHART RENDERING
    // ==============================
    renderCharts(viagens) {
        // Register the Datalabels plugin globally for this render
        Chart.register(ChartDataLabels);

        // Destroy existing instances if any
        Object.values(this.charts).forEach(c => { if (c) c.destroy(); });
        this.charts = {};

        const dates = Utils.getDateRange(this.filters.startDate, this.filters.endDate);
        const allSaldos = Store.get('saldos');
        const carretas = Store.get('carretas');
        const config = Store.get('config');
        const custos = config.custos_palete || { 'c1': 0, 'c2': 0 };

        // ---- 1. Driver Ranking (Horizontal Bar) ----
        const driverCtx = document.getElementById('drivers-chart');
        if (driverCtx) {
            const driverCounts = {};
            const driversList = Store.get('motoristas');
            const driverMap = {};
            driversList.forEach(m => { driverMap[m.id] = m.nome; });

            viagens.forEach(v => {
                const name = driverMap[v.id_motorista] || v.motorista || 'Indefinido';
                driverCounts[name] = (driverCounts[name] || 0) + 1;
            });

            const sortedDrivers = Object.entries(driverCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            this.charts.drivers = new Chart(driverCtx, {
                type: 'bar',
                data: {
                    labels: sortedDrivers.map(d => d[0]),
                    datasets: [{
                        label: 'Número de Viagens',
                        data: sortedDrivers.map(d => d[1]),
                        backgroundColor: '#6366f1',
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { display: false },
                        datalabels: { color: '#fff', align: 'center', anchor: 'center', font: { weight: 'bold', size: 10 }, formatter: (v) => v > 0 ? v : '' }
                    }
                }
            });
        }

        // ---- 2. Vehicle Type Doughnut (UNIFORM COLORS) ----
        const vTypeCtx = document.getElementById('vehicle-type-chart');
        if (vTypeCtx) {
            // Build data aligned to carretas order so colors match
            const chartLabels = [];
            const chartData = [];
            const chartColors = [];

            carretas.forEach(c => {
                const count = viagens.filter(v => v.id_tipo_carreta === c.id).length;
                chartLabels.push(c.descricao);
                chartData.push(count);
                chartColors.push(this.getColor(c.id));
            });

            this.charts.vTypes = new Chart(vTypeCtx, {
                type: 'doughnut',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        data: chartData,
                        backgroundColor: chartColors
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        datalabels: {
                            color: '#fff',
                            font: { weight: 'bold', size: 12 },
                            formatter: (v) => v
                        }
                    }
                }
            });
        }

        // ---- 3. Participation Temporal (Stacked Bar, UNIFORM COLORS) ----
        const partCtx = document.getElementById('participation-chart');
        if (partCtx) {
            const datasets = carretas.map(c => ({
                label: c.descricao,
                data: dates.map(d => {
                    const dayViagens = viagens.filter(v => v.data === d);
                    const totalDay = dayViagens.reduce((acc, v) => acc + (v.quantidade_paletes || 0), 0);
                    const totalTruck = dayViagens
                        .filter(v => v.id_tipo_carreta === c.id)
                        .reduce((acc, v) => acc + (v.quantidade_paletes || 0), 0);
                    return totalDay > 0 ? (totalTruck / totalDay) * 100 : 0;
                }),
                backgroundColor: this.getColor(c.id),
                borderRadius: 4
            }));

            this.charts.participation = new Chart(partCtx, {
                type: 'bar',
                data: {
                    labels: dates.map(d => Utils.formatDate(d)),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true, max: 100, ticks: { callback: v => v + '%' } }
                    },
                    plugins: {
                        datalabels: {
                            color: '#fff',
                            font: { size: 9, weight: 'bold' },
                            formatter: (v) => v > 10 ? Math.round(v) + '%' : '',
                            display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0
                        },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: ${Utils.formatNumber(ctx.raw, 1)}%`
                            }
                        }
                    }
                }
            });
        }

        // ---- 4. Occupancy Trend (Line, UNIFORM COLORS) ----
        const trendCtx = document.getElementById('occ-period-chart');
        if (trendCtx) {
            const datasets = carretas.map(c => ({
                label: c.descricao,
                data: dates.map(d => {
                    const dayTrips = viagens.filter(v => v.data === d && v.id_tipo_carreta === c.id);
                    if (dayTrips.length === 0) return null;
                    return dayTrips.reduce((acc, v) => acc + (v.ocupacao || 0), 0) / dayTrips.length;
                }),
                borderColor: this.getColor(c.id),
                backgroundColor: this.getColor(c.id) + '22',
                fill: true,
                tension: 0.4,
                spanGaps: true
            }));

            this.charts.trend = new Chart(trendCtx, {
                type: 'line',
                data: { labels: dates.map(d => Utils.formatDate(d)), datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { 
                        y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } 
                    },
                    plugins: { datalabels: { display: false } }
                }
            });
        }

        // ---- 5. Cost Analysis (Stacked Bar + Line, UNIFORM COLORS) ----
        const costCtx = document.getElementById('cost-chart');
        if (costCtx) {
            const costConvData = [];
            const costDDData = [];
            const costUnitarioData = [];

            dates.forEach(d => {
                const dayViagens = viagens.filter(v => v.data === d);
                
                // Cost model: trip cost is FIXED = capacity × registered_cost_per_pallet
                // Effective cost/pallet = fixed_trip_cost / actual_pallets_loaded
                let custoConvTotal = 0;
                let custoDDTotal = 0;
                let totalPaletesDay = 0;

                dayViagens.forEach(v => {
                    const cap = v.capacidade_carreta || 0;
                    const plts = v.quantidade_paletes || 0;
                    const custosDia = Store.getCustosForDate(d);
                    const custoBase = custosDia[v.id_tipo_carreta] || 0;
                    // Fixed trip cost = full capacity × registered cost
                    const custoFixoViagem = cap * custoBase;
                    
                    if (v.id_tipo_carreta === 'c1') custoConvTotal += custoFixoViagem;
                    else if (v.id_tipo_carreta === 'c2') custoDDTotal += custoFixoViagem;
                    totalPaletesDay += plts;
                });

                const custoTotalDia = custoConvTotal + custoDDTotal;
                const unitario = totalPaletesDay > 0 ? custoTotalDia / totalPaletesDay : 0;

                costConvData.push(custoConvTotal);
                costDDData.push(custoDDTotal);
                costUnitarioData.push(unitario);
            });

            this.charts.cost = new Chart(costCtx, {
                type: 'bar',
                data: {
                    labels: dates.map(d => Utils.formatDate(d)),
                    datasets: [
                        {
                            label: 'Convencional (R$)',
                            data: costConvData,
                            backgroundColor: this.getColor('c1'),
                            stack: 'cost',
                            borderRadius: 4,
                            order: 2
                        },
                        {
                            label: 'Double Deck (R$)',
                            data: costDDData,
                            backgroundColor: this.getColor('c2'),
                            stack: 'cost',
                            borderRadius: 4,
                            order: 2
                        },
                        {
                            label: 'Custo/Palete (R$)',
                            type: 'line',
                            data: costUnitarioData,
                            borderColor: '#f87171',
                            backgroundColor: '#f8717133',
                            borderWidth: 3,
                            pointRadius: 4,
                            pointBackgroundColor: '#f87171',
                            tension: 0.3,
                            yAxisID: 'y1',
                            fill: false,
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { stacked: true },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            title: { display: true, text: 'Custo Total (R$)', font: { size: 11 } },
                            ticks: { callback: v => 'R$ ' + v.toFixed(0) }
                        },
                        y1: {
                            position: 'right',
                            beginAtZero: true,
                            grid: { drawOnChartArea: false },
                            title: { display: true, text: 'Custo/Palete (R$)', font: { size: 11 } },
                            ticks: { callback: v => 'R$ ' + v.toFixed(2) }
                        }
                    },
                    plugins: {
                        datalabels: {
                            color: '#fff',
                            font: { size: 9, weight: 'bold' },
                            formatter: (v, ctx) => {
                                if (ctx.dataset.type === 'line') return '';
                                return v > 0 ? 'R$' + v.toFixed(0) : '';
                            },
                            display: (ctx) => {
                                if (ctx.dataset.type === 'line') return false;
                                return ctx.dataset.data[ctx.dataIndex] > 0;
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: R$ ${ctx.raw.toFixed(2)}`
                            }
                        }
                    }
                }
            });
        }

        // ---- 6. Performance Flow (Bar + Line) ----
        const perfCtx = document.getElementById('performance-flow-chart');
        if (perfCtx) {
            const labels = dates.map(d => Utils.formatDate(d));
            const balanceData = dates.map(d => {
                const s = allSaldos.find(item => item.data === d);
                return s ? s.saldo_inicio : 0;
            });
            const realizedData = dates.map(d => {
                return viagens
                    .filter(v => v.data === d)
                    .reduce((acc, v) => acc + (v.quantidade_paletes || 0), 0);
            });

            this.charts.performance = new Chart(perfCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Transferido (Realizado)',
                            type: 'line',
                            data: realizedData,
                            borderColor: '#38bdf8',
                            backgroundColor: '#38bdf8',
                            borderWidth: 3,
                            pointRadius: 4,
                            tension: 0.3,
                            zIndex: 10
                        },
                        {
                            label: 'Saldo Inicial (Demanda)',
                            data: balanceData,
                            backgroundColor: '#cbd5e1',
                            borderRadius: 4,
                            barPercentage: 0.6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { 
                            beginAtZero: true,
                            title: { display: true, text: 'Paletes' }
                        }
                    },
                    plugins: {
                        datalabels: { display: false },
                        tooltip: {
                            callbacks: {
                                footer: (items) => {
                                    const balance = items.find(i => i.datasetIndex === 1)?.raw || 0;
                                    const realized = items.find(i => i.datasetIndex === 0)?.raw || 0;
                                    const diff = balance - realized;
                                    return diff > 0 ? `Pendente: ${diff} plts` : `Escoamento: OK`;
                                }
                            }
                        }
                    }
                }
            });
        }
    },

    // ==============================
    // INSIGHTS ENGINE
    // ==============================
    renderInsights(filteredViagens, allViagens) {
        const container = document.getElementById('insights-list');
        if (!container) return;

        const carretas = Store.get('carretas');
        const config = Store.get('config');
        const custosAtuais = Store.getCustosForDate(Utils.getToday());
        let hasCosts = Object.values(custosAtuais).some(v => v > 0);
        
        const currentRole = App.currentUser ? String(App.currentUser.grupo || '').toUpperCase() : '';
        if (!['ADM', 'SUPERVISOR'].includes(currentRole)) {
            hasCosts = false;
        }

        const insights = [];

        // Helper data
        const tripsConv = filteredViagens.filter(v => v.id_tipo_carreta === 'c1');
        const tripsDD = filteredViagens.filter(v => v.id_tipo_carreta === 'c2');
        const avgOccConv = this.calcAvgOccupancy(filteredViagens, 'c1');
        const avgOccDD = this.calcAvgOccupancy(filteredViagens, 'c2');
        const totalTrips = filteredViagens.length;
        const activeDays = Utils.getDaysWithData(filteredViagens);
        const avgTripsPerDay = activeDays > 0 ? (totalTrips / activeDays) : 0;

        const convCarreta = carretas.find(c => c.id === 'c1');
        const ddCarreta = carretas.find(c => c.id === 'c2');
        const capConv = convCarreta ? convCarreta.capacidade : 28;
        const capDD = ddCarreta ? ddCarreta.capacidade : 52;

        // ---- Rule 1: Low Occupancy Alert ----
        if (avgOccConv > 0 && avgOccConv < 70) {
            insights.push({
                type: 'warning',
                icon: 'alert-triangle',
                text: `A ocupação média da <strong>Convencional</strong> está em <strong>${Utils.formatNumber(avgOccConv, 1)}%</strong>. Considere consolidar cargas para melhorar o aproveitamento e reduzir custos por palete.`
            });
        }
        if (avgOccDD > 0 && avgOccDD < 70) {
            insights.push({
                type: 'warning',
                icon: 'alert-triangle',
                text: `A ocupação média da <strong>Double Deck</strong> está em <strong>${Utils.formatNumber(avgOccDD, 1)}%</strong>. Com capacidade de ${capDD} paletes, há espaço para otimizar a carga e reduzir o custo unitário.`
            });
        }

        // ---- Rule 2: Double Deck Opportunity ----
        if (totalTrips > 0 && tripsConv.length > tripsDD.length) {
            const convShare = (tripsConv.length / totalTrips) * 100;
            if (convShare > 55) {
                // Estimate savings: how many DD trips would replace Conv trips
                const totalPaletesConv = tripsConv.reduce((s, v) => s + (v.quantidade_paletes || 0), 0);
                const ddTripsNeeded = Math.ceil(totalPaletesConv / capDD);
                const savedTrips = tripsConv.length - ddTripsNeeded;

                if (savedTrips > 0) {
                    let msg = `A Convencional representa <strong>${Utils.formatNumber(convShare, 0)}%</strong> das viagens. Se migrar essas cargas para a Double Deck (capacidade ${capDD} plts), você poderia reduzir em até <strong>${savedTrips} viagens</strong> no período.`;
                    
                    if (hasCosts && custosAtuais['c1'] > 0 && custosAtuais['c2'] > 0) {
                        // Current: N conv trips × fixed conv trip cost
                        const custoAtualConv = tripsConv.length * (capConv * custosAtuais['c1']);
                        // Projected: fewer DD trips × fixed DD trip cost
                        const custoProjetoDD = ddTripsNeeded * (capDD * custosAtuais['c2']);
                        const economia = custoAtualConv - custoProjetoDD;
                        if (economia > 0) {
                            msg += ` Economia estimada: <strong>R$ ${economia.toFixed(2)}</strong> (Base de cálculo: custos atuais).`;
                        }
                    }
                    
                    insights.push({ type: 'tip', icon: 'zap', text: msg });
                }
            }
        }

        // ---- Rule 3: Cost Efficiency Gap ----
        if (hasCosts && custosAtuais['c1'] > 0 && custosAtuais['c2'] > 0) {
            const diff = ((custosAtuais['c1'] - custosAtuais['c2']) / custosAtuais['c2']) * 100;
            if (diff > 20) {
                insights.push({
                    type: 'success',
                    icon: 'trending-down',
                    text: `Pela tabela de custos atual, o custo fixo por palete da <strong>Convencional (R$ ${custosAtuais['c1'].toFixed(2)})</strong> é <strong>${Utils.formatNumber(diff, 0)}% maior</strong> que o da Double Deck (R$ ${custosAtuais['c2'].toFixed(2)}). Priorizar a Double Deck reduzirá o custo operacional global.`
                });
            }
        }

        // ---- Rule 4: DD Participation Trend (last 7 days vs period) ----
        if (filteredViagens.length >= 10) {
            const dates = Utils.getDateRange(this.filters.startDate, this.filters.endDate);
            const last7 = dates.slice(-7);
            const tripsLast7 = filteredViagens.filter(v => last7.includes(v.data));
            const ddLast7 = tripsLast7.filter(v => v.id_tipo_carreta === 'c2').length;
            const ddShareLast7 = tripsLast7.length > 0 ? (ddLast7 / tripsLast7.length) * 100 : 0;
            const ddSharePeriod = totalTrips > 0 ? (tripsDD.length / totalTrips) * 100 : 0;

            if (ddSharePeriod > 0 && ddShareLast7 < ddSharePeriod - 10) {
                insights.push({
                    type: 'danger',
                    icon: 'trending-down',
                    text: `A participação da <strong>Double Deck caiu</strong> nos últimos 7 dias (<strong>${Utils.formatNumber(ddShareLast7, 0)}%</strong>) comparado à média do período (<strong>${Utils.formatNumber(ddSharePeriod, 0)}%</strong>). Verifique disponibilidade ou se há preferência por Convencional.`
                });
            }
        }

        // ---- Rule 5: Low Daily Frequency ----
        if (avgTripsPerDay > 0 && avgTripsPerDay < 2) {
            insights.push({
                type: 'info',
                icon: 'clock',
                text: `A média de <strong>${Utils.formatNumber(avgTripsPerDay, 1)} viagens/dia</strong> é relativamente baixa. Considere avaliar se há capacidade de aumentar a frequência para reduzir o acúmulo de saldo.`
            });
        }

        // ---- Rule: Positive reinforcement ----
        if (avgOccConv >= 90 && avgOccDD >= 90) {
            insights.push({
                type: 'success',
                icon: 'check-circle',
                text: `Excelente! Ambos os veículos operam com ocupação média acima de 90%. A operação está otimizada! 🎯`
            });
        }

        // Render
        if (insights.length === 0) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.75rem; padding: 1rem 0;">
                    <i data-lucide="check-circle" style="color: var(--success); width: 20px; height: 20px;"></i>
                    <span style="color: var(--text-muted);">Operação saudável — nenhuma sugestão de melhoria neste período.</span>
                </div>
            `;
        } else {
            const typeStyles = {
                'success': { bg: 'rgba(16, 185, 129, 0.08)', border: '#10b981', color: '#10b981' },
                'warning': { bg: 'rgba(251, 191, 36, 0.08)', border: '#fbbf24', color: '#d97706' },
                'danger':  { bg: 'rgba(248, 113, 113, 0.08)', border: '#f87171', color: '#ef4444' },
                'info':    { bg: 'rgba(56, 189, 248, 0.08)', border: '#38bdf8', color: '#0ea5e9' },
                'tip':     { bg: 'rgba(99, 102, 241, 0.08)', border: '#6366f1', color: '#6366f1' }
            };

            container.innerHTML = insights.map(ins => {
                const s = typeStyles[ins.type] || typeStyles.info;
                return `
                    <div class="insight-item" style="
                        display: flex; align-items: flex-start; gap: 0.75rem; 
                        padding: 1rem 1.25rem; margin-bottom: 0.75rem; 
                        border-radius: 10px; border-left: 4px solid ${s.border}; 
                        background: ${s.bg}; animation: fadeIn 0.5s ease-out;
                    ">
                        <i data-lucide="${ins.icon}" style="color: ${s.color}; width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px;"></i>
                        <span style="font-size: 0.88rem; line-height: 1.5; color: var(--text-main);">${ins.text}</span>
                    </div>
                `;
            }).join('');
        }

        lucide.createIcons();
    }
};

// Dashboard Styles
const dashStyles = document.createElement('style');
dashStyles.textContent = `
    .dashboard-main-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
    .kpi-card { display: flex; align-items: center; gap: 1.25rem; padding: 1.5rem; border-bottom: 4px solid transparent; transition: transform 0.2s; }
    .kpi-card:hover { transform: translateY(-5px); }
    .kpi-card.resaltar { border-bottom-color: var(--warning); background: linear-gradient(135deg, var(--bg-surface) 0%, rgba(251, 191, 36, 0.05) 100%); }
    
    .kpi-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
    .kpi-icon.blue { background: rgba(56, 189, 248, 0.1); color: #0ea5e9; }
    .kpi-icon.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    .kpi-icon.indigo { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
    .kpi-icon.yellow { background: rgba(251, 191, 36, 0.1); color: #d97706; }
    
    .spin { animation: rotate 1s linear infinite; }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .truck-card h4 { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; color: var(--text-main); font-weight: 700; }
    
    .wide-card { grid-column: span 2; }

    .insights-card { border-top: 3px solid #fbbf24; }
    .insight-item { transition: transform 0.2s; }
    .insight-item:hover { transform: translateX(4px); }

    @media (max-width: 1024px) {
        .dashboard-main-grid { grid-template-columns: 1fr; }
        .wide-card { grid-column: span 1; }
    }
`;
document.head.appendChild(dashStyles);
