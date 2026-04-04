const SystemModule = {
    lastCpu: 0,

    init: function() {
        // Passive mode: No loop.
        // Waiting for dashboard.js to call render()
    },

    formatBytes: function(bytes, decimals = 2) {
        if (!+bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },
    
    // Format Speed (KB/s)
    formatSpeed: function(bytes, decimals = 1) {
        if (!+bytes) return '0 B/s';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },

    formatUptime: function(seconds) {
        const d = Math.floor(seconds / (3600*24));
        const h = Math.floor(seconds % (3600*24) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return (d>0 ? `${d}d ` : "") + `${h}h ${m}m`;
    },

    render: function(data, isFast = false) {
        // --- 1. SYSTEM (Only on Slow Poll) ---
        if (!isFast) {
            const elModel = document.getElementById('sys-model');
            if (elModel && data.model) elModel.innerText = data.model;

            const elUptime = document.getElementById('sys-uptime');
            if(elUptime) elUptime.innerText = this.formatUptime(data.uptime);
            
            const elTemp = document.getElementById('sys-temp');
            if(elTemp) {
                const tempVal = parseFloat(data.temp);
                elTemp.innerText = (!isNaN(tempVal) && tempVal > 0) ? `${tempVal}°C` : "--";
            }

            const elIp = document.getElementById('sys-public-ip');
            if (elIp && data.lan_total) elIp.innerText = this.formatBytes(data.lan_total);

            // --- 5. ROM (Only on Slow Poll) ---
            const elRomBar = document.getElementById('rom-bar');
            if (elRomBar && data.rom) {
                elRomBar.style.width = `${data.rom.percent}%`;
                const usedStr = this.formatBytes(data.rom.used);
                const totalStr = this.formatBytes(data.rom.total);
                const elRomText = document.getElementById('rom-text');
                if (elRomText) elRomText.innerText = `${usedStr} / ${totalStr}`;
            }
        }

        // --- 2. CPU (Real-time) ---
        const elCpuBar = document.getElementById('cpu-bar');
        if (elCpuBar) {
            let smoothCpu = Math.round((data.cpu * 0.7) + (this.lastCpu * 0.3));
            if (isNaN(smoothCpu)) smoothCpu = data.cpu;
            this.lastCpu = smoothCpu;
            elCpuBar.style.width = `${smoothCpu}%`;
            document.getElementById('cpu-text').innerText = `${smoothCpu}%`;
        }

        // --- 3. RAM (Real-time) ---
        const elRamBar = document.getElementById('ram-bar');
        if (elRamBar && data.ram) {
            elRamBar.style.width = `${data.ram.percent}%`;
            const usedStr = this.formatBytes(data.ram.used);
            const totalStr = this.formatBytes(data.ram.total);
            document.getElementById('ram-text').innerText = `${usedStr} / ${totalStr}`;
        }

        // --- 4. Network Speed (Mbps Real-time) ---
        if (data.rx_speed !== undefined && data.tx_speed !== undefined) {
             const rxMbps = (data.rx_speed * 8 / 1048576).toFixed(2);
             const txMbps = (data.tx_speed * 8 / 1048576).toFixed(2);

             // Update Speed Text in Header or Cards
             const elRx = document.getElementById('sys-rx-speed');
             const elTx = document.getElementById('sys-tx-speed');
             if (elRx) elRx.innerText = `↓ ${rxMbps} Mbps`;
             if (elTx) elTx.innerText = `↑ ${txMbps} Mbps`;

             // Update Chart if available
             if (typeof ChartsModule !== 'undefined') {
                 ChartsModule.updateNetworkSpeed(Number(rxMbps), Number(txMbps));
             }
        }
    },

    freeRam: function() {
        if(!confirm("Bạn có muốn giải phóng bộ nhớ RAM không?")) return;
        
        if(typeof Toast !== 'undefined') Toast.show("Đang dọn dẹp bộ nhớ...", "info");
        
        fetch('/cgi-bin/system/action?action=free_ram')
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    if(typeof Toast !== 'undefined') Toast.show(data.message, "success");
                    // Refresh data after 1s
                    setTimeout(() => {
                        if(typeof Dashboard !== 'undefined') Dashboard.fetchSystemInfo();
                    }, 1000);
                } else {
                    if(typeof Toast !== 'undefined') Toast.show(data.message || "Lỗi", "error");
                }
            })
            .catch(err => {
                if(typeof Toast !== 'undefined') Toast.show("Lỗi kết nối!", "error");
            });
    }
};