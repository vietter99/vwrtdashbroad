const ClientsModule = {
    clients: [],
    polling: null,

    init: function() {
        const container = document.getElementById('clients-container');
        if (container) {
            this.renderLayout(container);
            this.fetchClients();
            this.startPolling();
        }
    },

    renderLayout: function(container) {
        // Inject Custom Styles for this Module
        const styleId = 'clients-module-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .client-list { 
                    display: flex; flex-direction: column; gap: 8px; padding: 10px;
                    max-height: 300px; overflow-y: auto;
                }
                .client-list::-webkit-scrollbar { width: 4px; }
                .client-list::-webkit-scrollbar-track { background: transparent; }
                .client-list::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }

                .client-item { 
                    display: flex; align-items: center; justify-content: space-between;
                    background: var(--bg-card); border-radius: 12px; padding: 12px 15px;
                    border: 1px solid var(--border-color); transition: all 0.2s ease;
                    min-height: 70px; margin-bottom: 10px;
                    position: relative;
                }
                .client-item:hover { 
                    border-color: var(--accent-color);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    transform: translateY(-2px);
                }
                .c-icon { 
                    width: 40px; height: 40px; border-radius: 10px; 
                    background: var(--bg-body); color: var(--text-sub);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 20px; flex-shrink: 0;
                }
                .c-info { flex: 1; margin: 0 15px; min-width: 0; }
                .c-name { font-weight: 700; font-size: 14px; color: var(--text-main); margin-bottom: 2px; }
                .c-meta { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-sub); }
                .c-stats { text-align: right; min-width: 90px; }
                .c-total { font-weight: 700; font-size: 14px; color: var(--text-main); }
                .c-time { font-size: 11px; color: var(--text-sub); }
                .btn-manage {
                    color: var(--accent-color); opacity: 0.6; padding-left: 10px;
                }
                
                /* Mobile Layout Fix */
                @media (max-width: 768px) {
                    .client-item {
                        flex-wrap: wrap;
                        padding: 12px;
                        gap: 8px;
                    }
                    .c-icon {
                        width: 36px; height: 36px; font-size: 18px;
                    }
                    .c-info {
                        flex: 1 1 calc(100% - 60px);
                        margin: 0 0 0 10px;
                    }
                    .c-stats {
                        flex: 1 1 100%;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: var(--bg-body);
                        padding: 8px 12px;
                        border-radius: 8px;
                        margin-top: 4px;
                    }
                    .btn-manage {
                        display: none; /* Removed arrow on mobile as per user suggestion */
                    }
                }
            `;
            document.head.appendChild(style);
        }

        container.innerHTML = `
            <div class="card">
                <div class="card-header-compact">
                    <div class="card-icon-small" style="background: rgba(237, 137, 54, 0.15); color: #ed8936;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                    </div>
                    <div class="header-text-col">
                        <h3>Quản lý</h3>
                        <div class="model-name">Thiết bị kết nối (<span id="client-count">0</span>)</div>
                    </div>
                    <div class="header-actions">
                        <button class="icon-btn" style="width:32px; height:32px;" onclick="ClientsModule.showSettings()" title="Quản lý & Cài đặt">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </button>
                    </div>
                </div>
                
                <div id="clients-list" class="client-list">
                    <div style="text-align:center; padding:30px; color:var(--text-sub);">
                        <div class="skeleton" style="width:100%; height:60px; border-radius:12px;"></div>
                    </div>
                </div>
            </div>
        `;
    },

    startPolling: function() {
        if (this.polling) clearInterval(this.polling);
        this.polling = setInterval(() => this.fetchClients(), 3000); 
    },

    fetchClients: function() {
        fetch('/cgi-bin/clients/get')
            .then(res => res.json())
            .then(res => {
                if (res.status === 'success') {
                    // Fix: Lua cjson returns {} for empty arrays, which JS treats as object
                    this.clients = Array.isArray(res.data) ? res.data : [];
                    this.renderClients();
                }
            })
            .catch(err => console.error("Client API Error:", err));
    },

    showSettings: function() {
        Modal.show({
            title: "Quản lý thiết bị",
            maxWidth: "600px",
            showIcon: false,
            content: `
            <div style="min-height:300px;">
                <div style="margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
                    <h3 style="margin:0; font-size:16px; font-weight:700; color:var(--text-main);">Danh sách chặn</h3>
                    <p style="margin:5px 0 0; font-size:13px; color:var(--text-sub);">Quản lý quyền truy cập Internet của các thiết bị.</p>
                </div>

                <div id="blocked-list" style="display:flex; flex-direction:column; gap:10px;">
                    <div style="text-align:center; padding:20px; color:var(--text-sub);">Đang tải...</div>
                </div>
            </div>
            `,
            cancelText: "Đóng"
        });
        
        this.fetchSettings();
    },

    switchTab: function(btn, tabId) {
        document.querySelectorAll('.tab-btn').forEach(b => {
             b.style.borderBottomColor = 'transparent';
             b.style.color = 'var(--text-sub)';
             b.classList.remove('active');
        });
        btn.style.borderBottomColor = 'var(--accent-color)';
        btn.style.color = 'var(--text-main)';
        btn.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        document.getElementById(tabId).style.display = 'block';
    },

    fetchSettings: function() {
        fetch('/cgi-bin/clients/settings')
            .then(res => res.json())
            .then(res => {
                if(res.status === 'success') {
                    this.renderBlockedList(res.data.blocked);
                }
            })
            .catch(err => {
                document.getElementById('blocked-list').innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px; text-align:center; color:var(--text-sub);">
                    <div style="width:40px; height:40px; background:#fff5f5; border-radius:12px; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fc8181" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    </div>
                    <span style="font-size:13px;">Không thể tải danh sách</span>
                    <button onclick="ClientsModule.fetchSettings()" style="margin-top:10px; font-size:11px; padding:4px 10px; background:none; border:1px solid var(--border-color); border-radius:4px; cursor:pointer;">Thử lại</button>
                </div>`;
            });
    },

    renderBlockedList: function(list) {
        // Handle case where empty list returns as {} from Lua cjson
        if (!Array.isArray(list)) {
            list = [];
        }

        const container = document.getElementById('blocked-list');
        if(!container) return;

        if(!list || list.length === 0) {
            container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; text-align:center; color:var(--text-sub);">
                <div style="width:50px; height:50px; background:var(--bg-body); border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:15px; border:1px solid var(--border-color);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
                </div>
                <span style="font-weight:600; font-size:14px; color:var(--text-main); margin-bottom:4px;">Danh sách chặn trống</span>
                <span style="font-size:12px; color:var(--text-sub);">Hiện chưa có thiết bị nào bị chặn truy cập.</span>
            </div>`;
            return;
        }

        container.innerHTML = list.map(item => {
            // Handle backward compatibility (in case API returns string) for safety
            const mac = (typeof item === 'string') ? item : item.mac;
            const name = (typeof item === 'object' && item.name && item.name !== 'Unknown') ? item.name : '';
            
            return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-body); padding:10px 15px; border-radius:8px; border:1px solid transparent;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:32px; height:32px; background:#fed7d7; color:#c53030; border-radius:8px; display:flex; align-items:center; justify-content:center;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                    </div>
                    <div>
                        <div style="font-weight:700; font-size:13px; font-family:monospace;">${mac.toUpperCase()}</div>
                        ${name ? `<div style="font-size:11px; color:var(--text-main); font-weight:600;">${name}</div>` : ''}
                        <div style="font-size:10px; color:#e53e3e;">Đang bị chặn truy cập</div>
                    </div>
                </div>
                <button onclick="ClientsModule.toggleBlock('${mac}', false)" style="padding:5px 10px; background:white; border:1px solid var(--border-color); border-radius:6px; cursor:pointer; font-size:11px; font-weight:600; color:var(--text-sub);">
                    Bỏ chặn
                </button>
            </div>
            `;
        }).join('');
    },

    getDeviceIcon: function(name) {
        const n = (name || "").toLowerCase();
        // Return SVG string based on name guess
        if (n.includes('iphone') || n.includes('android') || n.includes('phone') || n.includes('mobile') || n.includes('galaxy') || n.includes('pixel') || n.includes('note') || n.includes('redmi') || n.includes('mi '))
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`;
        
        if (n.includes('macbook') || n.includes('laptop') || n.includes('win') || n.includes('desktop') || n.includes('pc') || n.includes('msi') || n.includes('asus') || n.includes('dell') || n.includes('hp'))
             return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="20" x2="22" y2="20"></line></svg>`;

        if (n.includes('tv') || n.includes('sony') || n.includes('lg') || n.includes('samsung') && !n.includes('galaxy'))
             return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>`;

        // Default generic device
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`;
    },

    formatDuration: function(seconds) {
        if (!seconds || seconds <= 0) return "Vừa xong";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}p`;
        return `${m}p`;
    },

    formatBytes: function(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const dm = 1;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    renderClients: function() {
        const list = document.getElementById('clients-list');
        const countBadge = document.getElementById('client-count');
        if (!list) return;

        countBadge.innerText = this.clients.length;

        if (this.clients.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-sub);">Không có thiết bị nào đang kết nối.</div>';
            return;
        }

        list.innerHTML = this.clients.map(c => {
            const isWifi = c.type.includes("WiFi") || c.type === "Wireless";
            
            // Signal Bars Logic
            let signalIcon = "";
            let sigColor = "#cbd5e0";
            
            if (isWifi) {
                const s = parseInt(c.signal);
                if(s >= -60) sigColor = "#48bb78"; // Good
                else if(s >= -75) sigColor = "#ecc94b"; // Fair
                else sigColor = "#e53e3e"; // Bad
                
                signalIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${sigColor}" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg> <span style="color:${sigColor}; font-weight:600;">${c.signal}dBm</span>`;
            } else {
                signalIcon = `<span style="font-size:10px; color:var(--text-sub);">LAN</span>`;
            }

            return `
            <div class="client-item" onclick="ClientsModule.showManageModal('${c.mac}')" style="cursor:pointer;">
                <div>
                    ${this.getDeviceIcon(c.name)}
                </div>
                <div class="c-info">
                    <div class="c-name">${c.name}</div>
                    <div class="c-meta">
                        <span style="font-family:monospace;">${c.ip}</span>
                        <span>•</span>
                        <span style="text-transform:uppercase;">${isWifi ? c.type.replace('WiFi ', '') : 'LAN'}</span>
                        <span>•</span>
                        ${signalIcon}
                    </div>
                </div>
                <div class="c-stats">
                    <div class="c-total">${c.total > 0 ? this.formatBytes(c.total) : '0 B'}</div>
                    <div class="c-time">${this.formatDuration(c.connected_time)}</div>
                </div>
                <div class="btn-manage">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
            `;
        }).join('');
    },

    showManageModal: function(mac) {
        const client = this.clients.find(c => c.mac === mac);
        if (!client) return;

        Modal.show({
            title: "Cấu hình thiết bị",
            maxWidth: "400px",
            showIcon: false,
            content: `
            <div style="text-align:left;">
                <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:20px;">
                    <div style="width:60px; height:60px; background:var(--bg-body); border-radius:18px; display:flex; align-items:center; justify-content:center; color:var(--accent-color); margin-bottom:10px;">
                         ${this.getDeviceIcon(client.name).replace('width="20"', 'width="32"').replace('height="20"', 'height="32"')}
                    </div>
                    <h3 style="margin:0; font-size:18px;">${client.name}</h3>
                    <p style="margin:5px 0 0 0; color:var(--text-sub); font-size:12px; font-family:monospace;">${client.mac.toUpperCase()}</p>
                </div>
                
                <div style="background:var(--bg-body); padding:15px; border-radius:12px; margin-bottom:20px; border:1px solid var(--border-color);">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                        <div>
                            <span style="font-size:11px; color:var(--text-sub); display:block; margin-bottom:2px;">IP Address</span>
                            <span style="font-weight:600; font-family:monospace; color:#3182ce;">${client.ip}</span>
                        </div>
                        <div>
                            <span style="font-size:11px; color:var(--text-sub); display:block; margin-bottom:2px;">Kết nối</span>
                            <span style="font-weight:600;">${client.type}</span>
                        </div>
                        <div>
                            <span style="font-size:11px; color:var(--text-sub); display:block; margin-bottom:2px;">Tín hiệu</span>
                            <span style="font-weight:600; color:${parseInt(client.signal) >= -60 ? '#48bb78' : '#e53e3e'}">${client.signal || '--'} dBm</span>
                        </div>
                        <div>
                            <span style="font-size:11px; color:var(--text-sub); display:block; margin-bottom:2px;">Tổng Data</span>
                            <span style="font-weight:600;">${VWRT_API.formatBytes(client.total)}</span>
                        </div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr; gap:10px;">
                    <button class="btn-modal btn-danger" onclick="ClientsModule.toggleBlock('${client.mac}', true)" style="width:100%; justify-content:center; padding:12px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                        Chặn truy cập Internet
                    </button>
                    <p style="font-size:11px; color:var(--text-sub); text-align:center;">
                        Thiết bị này sẽ bị ngắt kết nối WiFi ngay lập tức.
                    </p>
                </div>
            </div>
            `,
            cancelText: "Đóng"
        });
    },

    toggleBlock: function(mac, doBlock) {
        Modal.confirm({
            title: doBlock ? 'Chặn thiết bị' : 'Bỏ chặn thiết bị',
            message: `Bạn có chắc muốn ${doBlock ? 'chặn' : 'bỏ chặn'} thiết bị này không?`,
            type: doBlock ? 'warning' : 'question',
            confirmText: 'Xác nhận',
            onConfirm: () => {
                Toast.show("Đang áp dụng thay đổi...", "info");
                
                const payload = { 
                    action: doBlock ? 'block' : 'unblock', 
                    mac: mac,
                    csrf_token: VWRT_API.csrfToken 
                };

                fetch('/cgi-bin/clients/action', {
                    method: 'POST',
                    headers: VWRT_API.getHeaders(),
                    body: JSON.stringify(payload)
                })
                .then(res => res.json())
                .then(res => {
                    if (res.status === 'success') {
                        Toast.show("Thành công! Đang tải lại danh sách...", "success");
                        // Force close all modals
                        document.querySelectorAll('.modal-overlay').forEach(e => e.remove());
                        setTimeout(() => this.fetchClients(), 4000);
                        if(this.fetchSettings) this.fetchSettings(); // Refresh settings list if open
                    } else {
                        Toast.show("Lỗi: " + res.message, "error");
                    }
                })
                .catch(err => Toast.show("Không thể kết nối tới Router", "error"));
            }
        });
    }
};
