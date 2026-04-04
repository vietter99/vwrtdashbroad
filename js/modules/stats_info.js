const StatsModule = {
    charts: {},
    rawData: null,
    currentRange: 7,

    init: function() {
        // Module loaded
    },

    showModal: function() {
        if (!window.Chart) {
             Toast.show("Đang khởi tạo biểu đồ...", "info");
             return;
        }

        const modalId = Modal.show({
            title: "Phân tích Lưu lượng",
            maxWidth: "850px",
            showIcon: false,
            content: `
            <div class="stats-modal-body">
                <!-- Summary Section -->
                <div class="stats-grid">
                    <div class="summary-card summary-traffic">
                        <div class="st-lbl">Lưu lượng hôm nay</div>
                        <div class="st-val-big" id="st-traffic">0 B</div>
                        <div class="st-meta">Đang ghi nhận 90 ngày</div>
                    </div>
                    <div class="summary-card summary-devices">
                         <div class="st-lbl">Thiết bị Cao điểm</div>
                        <div class="st-val-big" id="st-devices">0</div>
                        <div class="st-meta">Dữ liệu thật 100%</div>
                    </div>
                </div>

                <!-- Main Analytics Grid -->
                <div class="stats-grid">
                    <!-- Donut Card -->
                    <div class="stats-card">
                        <div class="card-title-row">
                            <h4>Thiết bị Hàng đầu</h4>
                             <span class="badge-today">HÔM NAY</span>
                        </div>
                        <div class="chart-container">
                            <canvas id="appUsageChart"></canvas>
                        </div>
                    </div>

                    <!-- Area Chart Card -->
                    <div class="stats-card">
                         <div class="card-title-row">
                            <h4>Lịch sử Dung lượng</h4>
                            <div class="range-selector">
                                <button class="range-btn active" data-days="7">7 ngày</button>
                                <button class="range-btn" data-days="30">30 ngày</button>
                            </div>
                        </div>
                        <div class="chart-container">
                            <canvas id="trafficHistoryChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <div class="stats-footer-note">
                     <p>Hệ thống tự động phân tích <b>Top 5 Thiết bị</b> tiêu thụ nhiều lưu lượng nhất.</p>
                </div>
            </div>
            `,
            cancelText: "Đóng"
        });

        setTimeout(() => {
            document.querySelectorAll('.range-btn').forEach(btn => {
                btn.onclick = (e) => this.setRange(Number(e.target.dataset.days));
            });
            this.fetchStats();
        }, 100);
    },

    fetchStats: function() {
        fetch('/cgi-bin/stats/get')
            .then(res => res.json())
            .then(res => {
                if(res.status === 'success') {
                    this.rawData = res.data;
                    this.renderAll();
                }
            })
            .catch(err => Toast.show("Lỗi đồng bộ dữ liệu!", "error"));
    },

    setRange: function(days) {
        this.currentRange = days;
        document.querySelectorAll('.range-btn').forEach(btn => {
            btn.classList.toggle('active', Number(btn.dataset.days) === days);
        });
        if(this.rawData) this.renderHistoryChart();
    },

    renderAll: function() {
        const data = this.rawData;
        document.getElementById('st-traffic').innerText = this.formatBytes(data.today.traffic);
        document.getElementById('st-devices').innerText = data.today.devices;
        this.renderAppChart();
        this.renderHistoryChart();
    },

    getServiceColors: function(name) {
        // Pre-defined colors for common device types or random
        const colors = {
            'iPhone': '#3182ce',
            'SAMSUNG': '#1158ff',
            'Laptop': '#4a5568',
            'Desktop': '#2d3748',
            'Tivi': '#e53e3e',
            'Khác': '#a0aec0'
        };
        for(let key in colors) {
            if(name.toLowerCase().includes(key.toLowerCase())) return colors[key];
        }
        return '#' + Math.floor(Math.random()*16777215).toString(16);
    },

    renderAppChart: function() {
        const ctx = document.getElementById('appUsageChart');
        if(!ctx) return;
        
        const devData = this.rawData.today.services;
        
        // 1. Convert to List & Sort by Value
        let items = [];
        for (let name in devData) {
            items.push({ name: name, value: devData[name] });
        }
        items.sort((a, b) => b.value - a.value);

        // 2. Take Top 5
        let top5 = items.slice(0, 5);
        if (items.length > 5) {
            let othersValue = 0;
            for(let i = 5; i < items.length; i++) {
                othersValue += items[i].value;
            }
            top5.push({ name: 'Thiết bị khác', value: othersValue });
        }

        const labels = top5.map(i => i.name);
        const values = top5.map(i => i.value);
        const colors = top5.map(i => this.getServiceColors(i.name));
        
        const total = values.reduce((a, b) => a + b, 0);

        if(this.charts.app) this.charts.app.destroy();

        this.charts.app = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 15,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: { family: 'Inter', weight: 600, size: 10 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                let pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                                return `${ctx.label}: ${this.formatBytes(ctx.parsed)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    renderHistoryChart: function() {
        const ctx = document.getElementById('trafficHistoryChart');
        if (!ctx) return;
        if (!this.rawData.history) this.rawData.history = [];
        const histRaw = Array.isArray(this.rawData.history) ? this.rawData.history : [];
        const history = histRaw.slice(-this.currentRange);
        
        const labels = history.map(h => h.date.split('-').slice(1).reverse().join('/'));
        const trafficGB = history.map(h => (h.traffic / (1024*1024*1024)).toFixed(2));

        if(this.charts.history) this.charts.history.destroy();

        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, 'rgba(49, 130, 206, 0.4)');
        gradient.addColorStop(1, 'rgba(49, 130, 206, 0.01)');

        this.charts.history = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Traffic (GB)',
                    data: trafficGB,
                    fill: true,
                    backgroundColor: gradient,
                    borderColor: '#3182ce',
                    borderWidth: 3,
                    pointRadius: 3,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { font: { size: 9 } } },
                    x: { grid: { display: false }, ticks: { font: { size: 9 } } }
                }
            }
        });
    },

    formatBytes: function(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const dm = 1;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
};

window.StatsModule = StatsModule;
