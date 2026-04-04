const ChartsModule = {
    mobileChart: null,
    networkChart: null,
    maxDataPoints: 20,
    
    init: function() {
        const ctx = document.getElementById('mobileSignalChart');
        if (!ctx) return;
        
        // Setup gradient
        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 60);
        gradient.addColorStop(0, 'rgba(72, 187, 120, 0.5)'); // Green-ish top
        gradient.addColorStop(1, 'rgba(72, 187, 120, 0)');   // Transparent bottom

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
                    tension: 0.4 // Smooth curves
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
                    x: {
                        display: false // Hide x-axis
                    },
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
                            suggestedMax: 10 // Will scale up if needed
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
        
        // Dynamically adjust Y max
        const maxVal = Math.max(...dataRx.filter(n=>n!=null), ...dataTx.filter(n=>n!=null));
        this.networkChart.options.scales.y.suggestedMax = Math.max(10, maxVal * 1.2);

        this.networkChart.update('none');
    },

    updateMobileSignal: function(signalPercent) {
        if (!this.mobileChart) {
            this.init();
        }
        if (!this.mobileChart) return;

        const data = this.mobileChart.data.datasets[0].data;
        const labels = this.mobileChart.data.labels;
        
        // Add new data point
        data.push(signalPercent);
        // We just need a label for tooltip to work properly
        const now = new Date();
        labels.push(now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0'));
        
        // Remove oldest if exceeding max length
        if (data.length > this.maxDataPoints) {
            data.shift();
            labels.shift();
        }

        // Update colors based on current signal
        const ctx = this.mobileChart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 60);
        let color = '#48bb78'; // Green
        if (signalPercent < 30) color = '#e53e3e'; // Red
        else if (signalPercent < 70) color = '#ed8936'; // Orange

        gradient.addColorStop(0, color + '80'); // 50% opacity
        gradient.addColorStop(1, color + '00'); // 0% opacity
        
        this.mobileChart.data.datasets[0].borderColor = color;
        this.mobileChart.data.datasets[0].backgroundColor = gradient;

        this.mobileChart.update('none'); // Update without full animation to be smoother
    }
};

// Initialize if document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ChartsModule.init());
} else {
    // If deferred/async
    setTimeout(() => ChartsModule.init(), 500);
}

window.ChartsModule = ChartsModule;
