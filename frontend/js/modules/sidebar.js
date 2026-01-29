const SidebarModule = {
    init: function() {
        const btn = document.getElementById('menu-btn');
        const overlay = document.getElementById('overlay');
        const closeBtn = document.getElementById('close-sidebar');
        const sidebar = document.getElementById('sidebar');

        if(btn) btn.addEventListener('click', this.open);
        if(overlay) overlay.addEventListener('click', this.close);
        if(closeBtn) closeBtn.addEventListener('click', this.close);

        if(btn) btn.addEventListener('click', this.open);
        if(overlay) overlay.addEventListener('click', this.close);
        if(closeBtn) closeBtn.addEventListener('click', this.close);

        // Removed auto-fetch for sidebar inline display

        // Add swipe gesture support (Enhanced)
        let touchStartX = 0;
        let touchStartY = 0;
        
        document.addEventListener('touchstart', e => { 
            touchStartX = e.changedTouches[0].screenX; 
            touchStartY = e.changedTouches[0].screenY;
        }, {passive: true});

        document.addEventListener('touchend', e => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            
            // Check if it's a vertical scroll (ignore if Y movement > X movement)
            if (Math.abs(diffY) > Math.abs(diffX)) return;

            // Only trigger if horizontal swipe is significant (> 60px)
            if (Math.abs(diffX) < 60) return;

            // Swipe Right (Open) - Only if started from Left Edge (< 40px)
            if (diffX > 0 && touchStartX < 40) {
                this.open();
            }
            
            // Swipe Left (Close) - Only if Sidebar is open
            if (diffX < 0 && sidebar.classList.contains('active')) {
                this.close();
            }
        }, {passive: true});
    },

    open: function() {
        document.getElementById('sidebar').classList.add('active');
        document.getElementById('overlay').classList.add('active');
    },

    close: function() {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
    },

    showFeature: function(featureName) {
        this.close();
        
        let title = "";
        let desc = "Tính năng này đang được phát triển.";
        
        if(featureName === 'terminal') {
            if(typeof Modal !== 'undefined') {
                Modal.show({
                    title: "Terminal",
                    content: `<div style="width:100%; height:75vh;">
                                <iframe src="http://${window.location.hostname}:7681" style="width:100%; height:100%; border:none; background:#000;"></iframe>
                              </div>`,
                    showCancel: false,
                    showIcon: false,
                    confirmText: "Đóng",
                    onConfirm: () => {}
                });
                
                // Adjust modal styling for terminal (Dark & Compact)
                const mBox = document.querySelector('.modal-box');
                if(mBox) {
                    mBox.style.maxWidth = "900px";
                    mBox.style.width = "95%";
                    mBox.style.background = "#1a1b26";
                    mBox.style.color = "#c0caf5";
                    mBox.style.padding = "15px"; // More compact padding
                    
                    const title = mBox.querySelector('h3');
                    if(title) {
                        title.style.color = "#c0caf5";
                        title.style.marginTop = "0";
                        title.style.marginBottom = "10px";
                    }
                }
            }
            return;
        }

        if(featureName === 'adblock') {
            // Open custom AdBlock modal
            if(typeof AdBlockModule !== 'undefined') {
                AdBlockModule.showModal();
            }
            return;
        }

        if(featureName === 'led') {
            if(typeof LedModule !== 'undefined') {
                LedModule.showModal();
            }
            return;
        }

        if(featureName === 'network_status') {
            this.showNetworkStatusModal();
            return;
        }

        if(featureName === 'reboot_sch') {
            if(typeof RebootScheduleModule !== 'undefined') {
                RebootScheduleModule.showModal();
            }
            return;
        }



        // Default: Feature not implemented
        if(typeof Modal !== 'undefined') {
            Modal.show({
                title: title,
                content: `<div style="text-align:center; padding:20px;">
                            <div style="font-size:40px; margin-bottom:10px;">🚧</div>
                            <p>${desc}</p>
                            <button onclick="document.querySelector('.modal-overlay').remove()" style="margin-top:15px; padding:8px 20px; border:none; background:#3182ce; color:white; border-radius:6px; cursor:pointer;">Đóng</button>
                          </div>`,
                showCancel: false,
                confirmText: "OK"
            });
        }
    },


    doReboot: function() {
        if(typeof Toast !== 'undefined') Toast.show("Đang gửi lệnh khởi động lại...", "warning");
        
        const headers = { 'Content-Type': 'application/json' };
        const payload = { action: 'reboot' };

        if(typeof VWRT_API !== 'undefined' && VWRT_API.csrfToken) {
            payload.csrf_token = VWRT_API.csrfToken;
            headers['X-CSRF-Token'] = VWRT_API.csrfToken;
        }

        fetch('/cgi-bin/system/action', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .catch(() => {}); // Ignore error as connection will drop
    },

    formatBytes: function(bytes, decimals = 2) {
        if (!+bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },

    getIconForInterface: function(name, label) {
        const n = (name || "").toLowerCase();
        const l = (label || "").toLowerCase();
        
        // WiFi
        if(n.includes('wlan') || n.includes('ra') || n.includes('wifi')) {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>`;
        }
        // Cellular
        if(n.includes('wwan') || n.includes('modem') || n.includes('usb') || l.includes('4g') || l.includes('lte') || l.includes('5g')) {
             // Icon: Signal Bars (Rising)
             return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>`;
        }
        // Ethernet/LAN
        if(n.includes('eth') || n.includes('lan') || n.includes('br-')) {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`; 
        }
        // WAN/Global
        if(n.includes('wan') || n.includes('pppoe')) {
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
        }
        
        // Default
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`;
    },

    showNetworkStatusModal: function() {
        Modal.show({
            title: "Trạng thái mạng",
            content: `<div id="modal-net-status" style="min-height:200px; display:flex; flex-direction:column; gap:12px;">
                        <div style="text-align:center; color:#999; padding:20px;">Đang tải dữ liệu...</div>
                      </div>`,
            showCancel: false,
            confirmText: "Đóng",
            onConfirm: () => {
                // Clear interval if we were auto-refreshing inside modal (optional)
            }
        });
        
        // Adjust modal width for more details
        const mBox = document.querySelector('.modal-box');
        if(mBox) {
            mBox.style.maxWidth = "600px";
            mBox.style.width = "95%";
        }

        this.fetchInterfacesForModal();
    },

    fetchInterfacesForModal: function() {
        fetch('/cgi-bin/mobile/network')
            .then(res => res.json())
            .then(data => {
                const container = document.getElementById('modal-net-status');
                if(!container) return; // Modal closed

                if (!data || data.length === 0) {
                    container.innerHTML = '<div style="text-align:center; color:#999;">Không có kết nối nào</div>';
                    return;
                }

                container.innerHTML = data.map(net => {
                    const isUp = net.ipv4 && net.ipv4 !== '--';
                    const rx = parseInt(net.rx) || 0;
                    const tx = parseInt(net.tx) || 0;
                    
                    return `
                        <div style="background:var(--bg-body); padding:15px; border-radius:8px; border:1px solid var(--border-color);">
                            <!-- Header: Icon + Name + MAC -->
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <div style="width:40px; height:40px; border-radius:8px; background:${isUp ? 'rgba(72,187,120,0.1)' : 'rgba(229,62,62,0.1)'}; display:flex; align-items:center; justify-content:center; color:${isUp ? '#48bb78' : '#e53e3e'};">
                                        ${this.getIconForInterface(net.name, net.label)}
                                    </div>
                                    <div style="display:flex; flex-direction:column;">
                                        <div style="display:flex; align-items:center; gap:8px;">
                                            <span style="font-weight:700; font-size:15px; color:var(--text-main);">${net.label || net.name}</span>
                                            <span style="font-size:10px; padding:2px 6px; border-radius:4px; background:${isUp ? '#c6f6d5' : '#fed7d7'}; color:${isUp ? '#22543d' : '#822727'}; font-weight:600;">${isUp ? 'ONLINE' : 'OFFLINE'}</span>
                                        </div>
                                        <span style="font-size:12px; color:var(--text-sub); font-family:monospace;">${(net.mac || "").toUpperCase()}</span>
                                    </div>
                                </div>
                                <div style="text-align:right;">
                                    <!-- Use name as badge -->
                                    <span style="font-size:11px; color:var(--text-muted); background:var(--bg-card); padding:2px 5px; border-radius:4px; border:1px solid var(--border-color);">${net.name}</span>
                                </div>
                            </div>

                            <!-- Traffic Stats -->
                            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; margin-bottom:12px; background:rgba(255,255,255,0.03); padding:8px; border-radius:6px;">
                                <div style="display:flex; flex-direction:column; align-items:center;">
                                    <span style="font-size:10px; color:#68d391;">▼ RX</span>
                                    <span style="font-size:12px; font-weight:600; color:var(--text-main);">${this.formatBytes(rx)}</span>
                                </div>
                                <div style="display:flex; flex-direction:column; align-items:center; border-left:1px solid rgba(255,255,255,0.1); border-right:1px solid rgba(255,255,255,0.1);">
                                    <span style="font-size:10px; color:#63b3ed;">▲ TX</span>
                                    <span style="font-size:12px; font-weight:600; color:var(--text-main);">${this.formatBytes(tx)}</span>
                                </div>
                                <div style="display:flex; flex-direction:column; align-items:center;">
                                    <span style="font-size:10px; color:#a0aec0;">∑ Tổng</span>
                                    <span style="font-size:12px; font-weight:600; color:var(--text-main);">${this.formatBytes(rx+tx)}</span>
                                </div>
                            </div>

                            <!-- IP Info -->
                            <div style="display:grid; grid-template-columns: auto 1fr; gap:10px; align-items:center; font-size:12px;">
                                <span style="color:var(--text-sub); width:30px;">IPv4:</span>
                                <span style="font-family:monospace; font-weight:600; color:${net.ipv4 === '--' ? '#e53e3e' : '#3182ce'};">${net.ipv4}</span>
                                
                                <span style="color:var(--text-sub); width:30px;">IPv6:</span>
                                <span style="font-family:monospace; color:${net.ipv6 === '--' ? '#a0aec0' : '#805ad5'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">${net.ipv6}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            })
            .catch(() => {});
    }
};
window.SidebarModule = SidebarModule;

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
    SidebarModule.init();
});
