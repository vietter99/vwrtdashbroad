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

    render: function(data) {
        // --- 1. MODEL NAME ---
        const elModel = document.getElementById('sys-model');
        if (elModel && data.model) {
            elModel.innerText = data.model;
        }

        // --- 2. SYSTEM ---
        const elUptime = document.getElementById('sys-uptime');
        if(elUptime) elUptime.innerText = this.formatUptime(data.uptime);
        
        const elTemp = document.getElementById('sys-temp');
        if(elTemp) {
            const tempVal = parseFloat(data.temp);
            if (!isNaN(tempVal) && tempVal > 0) {
                elTemp.innerText = `${tempVal}°C`;
            } else {
                elTemp.innerText = "--"; 
            }
        }

        const elIp = document.getElementById('sys-public-ip');
        if (elIp) {
            const labelEl = elIp.parentElement.querySelector('.sb-label');
            if(labelEl) labelEl.innerText = "Data";

            // Hiển thị tổng dung lượng
            if (data.lan_total) {
                elIp.innerText = this.formatBytes(data.lan_total);
            } else {
                elIp.innerText = "--";
            }
        }

        // --- 3. CPU ---
        const elCpuBar = document.getElementById('cpu-bar');
        if (elCpuBar) {
            let smoothCpu = Math.round((data.cpu * 0.7) + (this.lastCpu * 0.3));
            this.lastCpu = smoothCpu;
            elCpuBar.style.width = `${smoothCpu}%`;
            document.getElementById('cpu-text').innerText = `${smoothCpu}%`;
        }

        // --- 4. RAM (Used / Total) ---
        const elRamBar = document.getElementById('ram-bar');
        if (elRamBar) {
            elRamBar.style.width = `${data.ram.percent}%`;
            const usedStr = this.formatBytes(data.ram.used);
            const totalStr = this.formatBytes(data.ram.total);
            document.getElementById('ram-text').innerText = `${usedStr} / ${totalStr}`;
        }

        // --- 5. ROM (Used / Total) ---
        const elRomBar = document.getElementById('rom-bar');
        if (elRomBar) {
            elRomBar.style.width = `${data.rom.percent}%`;
            const usedStr = this.formatBytes(data.rom.used);
            const totalStr = this.formatBytes(data.rom.total);
            document.getElementById('rom-text').innerText = `${usedStr} / ${totalStr}`;
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