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

        if(featureName === 'network_status') {
            this.showNetworkStatusModal();
            return;
        }

        if(featureName === 'tailscale') {
            if(typeof TailscaleModule !== 'undefined') {
                TailscaleModule.showModal();
            }
            return;
        }

        if(featureName === 'mwan3') {
            if(typeof Mwan3Module !== 'undefined') {
                Mwan3Module.showModal();
            }
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
            content: `<div id="modal-net-status" style="min-height:200px; max-height:70vh; overflow-y:auto; display:flex; flex-direction:column; gap:12px; padding:5px;">
                        <div style="text-align:center; color:#999; padding:20px;">Đang tải dữ liệu...</div>
                      </div>`,
            showCancel: false,
            confirmText: "Đóng",
            onConfirm: () => {}
        });
        
        // Adjust modal width for more details
        const mBox = document.querySelector('.modal-box');
        if(mBox) {
            mBox.style.maxWidth = "600px";
            mBox.style.width = "95%";
            
            // Add LAN Config button next to Close button
            const actions = mBox.querySelector('.modal-actions');
            if (actions) {
                const lanBtn = document.createElement('button');
                lanBtn.className = 'btn-modal btn-secondary';
                lanBtn.style.padding = '10px 15px';
                lanBtn.style.fontSize = '13px';
                lanBtn.style.display = 'flex';
                lanBtn.style.alignItems = 'center';
                lanBtn.style.gap = '5px';
                lanBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    Cài đặt LAN
                `;
                lanBtn.onclick = () => {
                   document.querySelector('.modal-overlay').remove();
                   LanModule.showModal();
                };
                actions.insertBefore(lanBtn, actions.firstChild);
            }
        }

        this.fetchInterfacesForModal();
    },

    fetchInterfacesForModal: function() {
        fetch('/cgi-bin/mobile/network')
            .then(res => res.json())
            .then(data => {
                const container = document.getElementById('modal-net-status');
                if(!container) return; // Modal closed

                if (data && !Array.isArray(data) && Array.isArray(data.data)) {
                    data = data.data;
                }

                if (!data || !Array.isArray(data) || data.length === 0) {
                    container.innerHTML = '<div style="text-align:center; color:#999;">Không có kết nối nào</div>';
                    return;
                }

                container.innerHTML = data.map(net => {
                    const isUp = net.ipv4 && net.ipv4 !== '--';
                    const rx = parseInt(net.rx) || 0;
                    const tx = parseInt(net.tx) || 0;
                    
                    return `
                        <div class="net-modal-item" style="background:var(--bg-card); padding:18px; border-radius:12px; border:1px solid var(--border-color); box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom:12px;">
                            <!-- Header: Icon + Name + MAC -->
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <div style="width:42px; height:42px; border-radius:10px; background:${isUp ? 'rgba(72,187,120,0.1)' : 'rgba(229,62,62,0.1)'}; display:flex; align-items:center; justify-content:center; color:${isUp ? '#48bb78' : '#e53e3e'}; flex-shrink:0;">
                                        ${this.getIconForInterface(net.name, net.label)}
                                    </div>
                                    <div style="text-align: left; min-width:0;">
                                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:2px; flex-wrap:wrap;">
                                            <span style="font-weight:700; font-size:16px; color:var(--text-main); white-space:nowrap;">${net.label || net.name}</span>
                                            <span style="font-size:10px; padding:2px 6px; border-radius:4px; background:${isUp ? '#c6f6d5' : '#fed7d7'}; color:${isUp ? '#22543d' : '#822727'}; font-weight:700;">${isUp ? 'ONLINE' : 'OFFLINE'}</span>
                                        </div>
                                        <div style="font-size:11px; color:var(--text-sub); font-family:monospace; opacity:0.8; text-align: left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${(net.mac || "").toUpperCase()}</div>
                                    </div>
                                </div>
                                <div style="font-size:11px; color:var(--text-sub); background:var(--bg-body); padding:4px 8px; border-radius:6px; border:1px solid var(--border-color); font-weight:600; flex-shrink:0;">${net.name}</div>
                            </div>

                            <!-- Traffic Stats (More Modern) -->
                            <div class="net-modal-stats" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1px; margin-bottom:12px; background:var(--border-color); border-radius:10px; overflow:hidden; border:1px solid var(--border-color);">
                                <div class="net-modal-stat-box" style="background:var(--bg-card); padding:10px; text-align:center;">
                                    <div style="font-size:10px; color:#48bb78; font-weight:700; margin-bottom:4px;">▼ DOWNLOAD</div>
                                    <div style="font-size:14px; font-weight:700; color:var(--text-main);">${this.formatBytes(rx)}</div>
                                </div>
                                <div class="net-modal-stat-box" style="background:var(--bg-card); padding:10px; text-align:center;">
                                    <div style="font-size:10px; color:#3182ce; font-weight:700; margin-bottom:4px;">▲ UPLOAD</div>
                                    <div style="font-size:14px; font-weight:700; color:var(--text-main);">${this.formatBytes(tx)}</div>
                                </div>
                                <div class="net-modal-stat-box" style="background:var(--bg-card); padding:10px; text-align:center;">
                                    <div style="font-size:10px; color:var(--text-sub); font-weight:700; margin-bottom:4px;">∑ TOTAL</div>
                                    <div style="font-size:14px; font-weight:700; color:var(--text-main);">${this.formatBytes(rx+tx)}</div>
                                </div>
                            </div>

                            <!-- IP Info (Gom nhóm gọn gàng) -->
                            <div class="net-modal-ip-info" style="background:var(--bg-body); border-radius:10px; padding:10px 15px; border:1px solid var(--border-color);">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                    <span style="font-size:12px; color:var(--text-sub); font-weight:500;">IPv4:</span>
                                    <span style="font-family:monospace; font-weight:700; color:${net.ipv4 === '--' ? '#e53e3e' : '#3182ce'}; font-size:13px;">${net.ipv4}</span>
                                </div>
                                ${net.ipv6 && net.ipv6 !== '--' ? `
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:12px; color:var(--text-sub); font-weight:500;">IPv6:</span>
                                    <span style="font-family:monospace; color:#805ad5; font-size:11px; text-align:right; max-width:200px; overflow:hidden; text-overflow:ellipsis;">${net.ipv6}</span>
                                </div>
                                ` : ''}
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
