const NetworkModule = {
    interval: null,

    init: function() {
        this.startLoop();
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) this.stopLoop();
            else this.startLoop();
        });
    },

    startLoop: function() {
        if (!this.interval) {
            this.fetchData();
            this.interval = setInterval(() => this.fetchData(), 5000);
        }
    },

    stopLoop: function() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    },

    formatBytes: function(bytes, decimals = 2) {
        if (!+bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },

    fetchData: function() {
        fetch('/cgi-bin/mobile/network')
            .then(response => response.json())
            .then(data => {
                this.render(data);
            })
            .catch(err => {
                const container = document.getElementById('network-list');
                // Use Skeleton if error occurs or empty
                if(container) {
                     container.innerHTML = `
                        <div class="sys-row" style="padding:10px;">
                            <div class="skeleton" style="height:40px; margin-bottom:10px;"></div>
                            <div class="skeleton" style="height:40px;"></div>
                        </div>
                     `;
                }
            });
    },

    render: function(interfaces) {
        const container = document.getElementById('network-list');
        if (!container) return;

        if (interfaces && !Array.isArray(interfaces) && Array.isArray(interfaces.data)) {
            interfaces = interfaces.data;
        }

        if (!interfaces || !Array.isArray(interfaces) || interfaces.length === 0) {
            container.innerHTML = '<div class="sys-row" style="justify-content:center; color:#999">Không có kết nối nào</div>';
            return;
        }

        let html = '';
        interfaces.forEach(net => {
            const rx = parseInt(net.rx) || 0;
            const tx = parseInt(net.tx) || 0;
            const total = rx + tx;

            let v4Display = `<span class="ip-val ip-v4">${net.ipv4}</span>`;
            
            // Allow clicking on LAN IP to edit
            if (net.name === 'br-lan' && net.ipv4 !== '--') {
                v4Display = `<span class="ip-val ip-v4">${net.ipv4}</span>`;
            }

            let v6Display = `<span class="ip-val ip-v6">${net.ipv6}</span>`;

            if (net.ipv4 === '--') v4Display = `<span style="color: #dd6b20; font-size: 12px;">Đang chờ IP...</span>`;
            if (net.ipv6 === '--') v6Display = `<span style="color: #a0aec0; font-size: 11px;">Chưa có IPv6</span>`;

            html += `
            <div class="net-item">
                <div class="net-header">
                    <div class="net-name">
                        <span class="net-tag ${net.color}">${net.label}</span> ${net.name.toUpperCase()}
                    </div>
                    <div class="net-mac">${net.mac.toUpperCase()}</div>
                </div>

                <div class="net-stats-row">
                    <div class="stat-box">
                        <span>▼ RX</span> <strong class="rx-color">${this.formatBytes(rx)}</strong>
                    </div>
                    <div class="stat-box text-center">
                        <span>▲ TX</span> <strong class="tx-color">${this.formatBytes(tx)}</strong>
                    </div>
                    <div class="stat-box text-right">
                        <span>∑ Tổng</span> <strong class="total-color">${this.formatBytes(total)}</strong>
                    </div>
                </div>

                <div class="ip-row"><span class="ip-label">IPv4</span> ${v4Display}</div>
                <div class="ip-row"><span class="ip-label">IPv6</span> ${v6Display}</div>
            </div>
            `;
        });

        container.innerHTML = html;
    }
};