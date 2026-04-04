const ChartsModule = {
    mobileChart: null,
    networkChart: null,
    maxDataPoints: 20,
    
    init: function() {
        // We use the new ID from Premium 2.0 Mobile Card
        const ctx = document.getElementById('chart-mobile-canvas');
        if (!ctx) return;
        
        // Destroy existing chart instance to avoid ghosting on new canvas
        if (this.mobileChart) {
            try { this.mobileChart.destroy(); } catch(e) {}
        }

        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 45);
        gradient.addColorStop(0, 'rgba(72, 187, 120, 0.4)'); 
        gradient.addColorStop(1, 'rgba(72, 187, 120, 0)');   

        this.mobileChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(this.maxDataPoints).fill(''),
                datasets: [{
                    label: 'Tín hiệu (%)',
                    data: Array(this.maxDataPoints).fill(null),
                    borderColor: '#48bb78',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: 'start',
                    tension: 0.4 
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + '%';
                            }
                        }
                    }
                },
                scales: {
                    x: { display: false },
                    y: {
                        display: false,
                        min: 0,
                        max: 100
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });

        // Network Speed Chart
        const netCtx = document.getElementById('networkSpeedChart');
        if (netCtx) {
            this.networkChart = new Chart(netCtx, {
                type: 'line',
                data: {
                    labels: Array(this.maxDataPoints).fill(''),
                    datasets: [
                        {
                            label: 'Download (Mbps)',
                            data: Array(this.maxDataPoints).fill(null),
                            borderColor: '#3182ce',
                            borderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 4,
                            tension: 0.4
                        },
                        {
                            label: 'Upload (Mbps)',
                            data: Array(this.maxDataPoints).fill(null),
                            borderColor: '#48bb78',
                            borderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 4,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            enabled: true,
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.parsed.y + ' Mbps';
                                }
                            }
                        }
                    },
                    scales: {
                        x: { display: false },
                        y: {
                            display: false,
                            min: 0,
                            suggestedMax: 10 
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    }
                }
            });
        }
    },

    updateNetworkSpeed: function(rxMbps, txMbps) {
        if (!this.networkChart) return;
        
        const dataRx = this.networkChart.data.datasets[0].data;
        const dataTx = this.networkChart.data.datasets[1].data;
        const labels = this.networkChart.data.labels;
        
        dataRx.push(rxMbps);
        dataTx.push(txMbps);
        
        const now = new Date();
        labels.push(now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0'));
        
        if (dataRx.length > this.maxDataPoints) {
            dataRx.shift();
            dataTx.shift();
            labels.shift();
        }
        
        const maxVal = Math.max(...dataRx.filter(n=>n!=null), ...dataTx.filter(n=>n!=null));
        this.networkChart.options.scales.y.suggestedMax = Math.max(10, maxVal * 1.2);

        this.networkChart.update('none');
    },

    updateMobileSignal: function(signalPercent) {
        // If canvas was recreated (Premium Card Update), we need a new instance
        const ctx = document.getElementById('chart-mobile-canvas');
        if (!ctx) return;

        // If chart object exists but is bound to a different canvas element, recreate it
        if (!this.mobileChart || this.mobileChart.canvas !== ctx) {
            this.init(); 
        }
        
        if (!this.mobileChart) return;

        const data = this.mobileChart.data.datasets[0].data;
        const labels = this.mobileChart.data.labels;
        
        data.push(signalPercent);
        const now = new Date();
        labels.push(now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0'));
        
        if (data.length > this.maxDataPoints) {
            data.shift();
            labels.shift();
        }

        const chartCtx = this.mobileChart.ctx;
        const gradient = chartCtx.createLinearGradient(0, 0, 0, 45);
        let color = '#48bb78'; 
        if (signalPercent < 30) color = '#e53e3e'; 
        else if (signalPercent < 70) color = '#ed8936'; 

        gradient.addColorStop(0, color + '66'); 
        gradient.addColorStop(1, color + '00'); 
        
        this.mobileChart.data.datasets[0].borderColor = color;
        this.mobileChart.data.datasets[0].backgroundColor = gradient;

        this.mobileChart.update('none'); 
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ChartsModule.init());
} else {
    setTimeout(() => ChartsModule.init(), 500);
}

window.ChartsModule = ChartsModule;
