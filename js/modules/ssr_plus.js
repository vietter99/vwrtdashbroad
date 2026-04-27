const SSRPlusModule = {
    data: null,
    clients: [],
    ac_tags: { ac: [], bp: [], fp: [], gm: [] },
    currentTab: 'dashboard',
    logInterval: null,
    autoRefreshLog: false,
    listFile: null,

    // ── DNS Presets (format matches MOSDNS: tcp://IP:53) ──
    DNS_PRESETS: [
        { label: 'Google DNS (8.8.4.4)', value: '8.8.4.4' },
        { label: 'Google DNS (8.8.8.8)', value: '8.8.8.8' },
        { label: 'Cloudflare (1.0.0.1)', value: '1.0.0.1' },
        { label: 'Cloudflare (1.1.1.1)', value: '1.1.1.1' },
        { label: 'OpenDNS', value: '208.67.222.222' },
        { label: 'Quad9', value: '9.9.9.9' },
        { label: 'AdGuard DNS', value: '94.140.14.14' },
        { label: 'Tùy chỉnh...', value: '__custom__' }
    ],

    showModal: function () {
        Modal.show({
            title: "VWRT — Quản lý Proxy",
            content: `<div id="ssr-container" class="ssr-container"><div class="spinner-container"><div class="spinner"></div></div></div>`,
            showCancel: false,
            confirmText: "Đóng",
            onConfirm: () => {
                this.stopTimeDisplay();
            }
        });

        const mBox = document.querySelector('.modal-box');
        if (mBox) {
            mBox.style.maxWidth = '920px';
            mBox.style.width = '95%';
        }
        this.fetchData();
    },

    fetchData: function () {
        const container = document.getElementById('ssr-container');
        fetch('/cgi-bin/ssr/ssr_plus?action=get_info')
            .then(r => r.json())
            .then(d => {
                if (d.status === 'uninstalled') {
                    this.renderUninstalled(container);
                    return;
                }
                this.data = d;
                if (!this.data.servers || !Array.isArray(this.data.servers)) this.data.servers = [];
                // Initialize Tags from data
                if (d.ac) {
                    this.ac_tags.ac = (d.ac.lan_ac_ips || '').split('\n').filter(i => i.trim() !== '');
                    this.ac_tags.bp = (d.ac.lan_bp_ips || '').split('\n').filter(i => i.trim() !== '');
                    this.ac_tags.fp = (d.ac.lan_fp_ips || '').split('\n').filter(i => i.trim() !== '');
                    this.ac_tags.gm = (d.ac.lan_gm_ips || '').split('\n').filter(i => i.trim() !== '');
                }
                this.render();
            })
            .catch(() => {
                if (container) container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--ssr-error);">Lỗi kết nối tới dịch vụ hệ thống</div>';
            });
    },

    renderUninstalled: function (container) {
        if (!container) return;
        container.innerHTML = `
            <div class="ssr-uninstalled-notice" style="padding: 60px 20px; text-align: center; background: rgba(255, 255, 255, 0.02); border-radius: 20px; border: 1px dashed var(--ssr-glass-border); margin: 20px;">
                <div style="font-size: 64px; margin-bottom: 25px;">🛡️</div>
                <h2 style="font-size: 24px; font-weight: 800; background: var(--ssr-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 15px;">Tính năng cao cấp chưa kích hoạt</h2>
                <p style="color: var(--text-sub); line-height: 1.6; max-width: 500px; margin: 0 auto 30px auto; font-size: 15px;">
                    Dịch vụ <b>VWRT Proxy</b> hiện chưa được cài đặt. <br><br>
                    <span style="color: #4fd1c5; font-weight: 700;">• Yêu cầu:</span> Internet ổn định & Trống 50MB ROM.<br>
                    <span style="color: #f56565; font-weight: 700;">• Cảnh báo:</span> Tuyệt đối <b style="color: #f56565;">KHÔNG RÚT NGUỒN</b> khi đang cài.<br>
                    <span style="color: #6366f1; font-weight: 700;">• Lưu ý:</span> Nhấn <b>Kích hoạt 2 lần</b> nếu thông báo thất bại.<br>
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="SSRPlusModule.confirmInstall()" class="ssr-btn ssr-btn-primary" style="display: flex; align-items: center; gap: 8px; border: none; cursor: pointer;">
                        <span>🚀 Kích hoạt ngay</span>
                    </button>
                    <a href="https://www.facebook.com/pham.viet.853811" target="_blank" class="ssr-btn" style="text-decoration: none; border: 1px solid var(--ssr-glass-border); color: var(--text-primary); padding: 10px 20px; border-radius: 12px; font-size: 14px; font-weight: 600;">💬 Hỗ trợ</a>
                </div>
            </div>
        `;
    },

    confirmInstall: function () {
        Modal.confirm({
            title: "Xác nhận Kích hoạt",
            content: `
                <div style="text-align: center;">
                    <p style="color: var(--text-sub); line-height: 1.8; font-size: 14px; margin-bottom: 20px;">
                        Hệ thống sẽ tải và cài đặt toàn bộ gói dịch vụ Proxy. <br>
                        <span style="color: #6366f1; font-weight: 700;">1. Yêu cầu ROM:</span> Trống tối thiểu <b style="color: var(--text-primary);">50 MB</b>.<br>
                        <span style="color: #4fd1c5; font-weight: 700;">2. Internet:</span> Yêu cầu kết nối ổn định để tải gói.<br>
                        <span style="color: #f56565; font-weight: 700;">3. CẢNH BÁO:</span> TUYỆT ĐỐI <b style="color: #f56565;">KHÔNG RÚT NGUỒN</b>.<br>
                        <span style="color: #6366f1; font-weight: 700;">4. THỰC HIỆN:</span> Vui lòng nhấn cài <b>2 LẦN</b> nếu cần.<br>
                        <span style="color: var(--text-sub); font-weight: 700;">5. HOÀN TẤT:</span> Thiết bị cần phải <b style="color: var(--text-primary);">REBOOT</b> lại.
                    </p>
                </div>
            `,
            onConfirm: () => this.startInstallation()
        });
    },

    startInstallation: function () {
        const overlay = document.createElement('div');
        overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0b0e14; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999999 !important; color: #fff; font-family: 'Inter', sans-serif;";
        overlay.innerHTML = `
            <div class="spinner" style="width: 60px; height: 60px; border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid #3182ce; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 30px;"></div>
            <h2 id="install-step" style="font-size: 24px; font-weight: 800; margin-bottom: 10px;">Đang khởi tạo hệ thống...</h2>
            <p style="color: rgba(255,255,255,0.6); font-size: 14px;">Vui lòng hông tắt trình duyệt hoặc rút nguồn thiết bị</p>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        `;
        document.body.appendChild(overlay);

        const stepEl = document.getElementById('install-step');

        // Immediate check if browser is offline
        if (!navigator.onLine) {
            if (overlay) overlay.remove();
            Modal.alert({
                title: "⚠️ KHÔNG CÓ INTERNET",
                message: "Trình duyệt phát hiện bạn đang ngoại tuyến. Vui lòng kết nối mạng để thực hiện kích hoạt!",
                type: "error"
            });
            return;
        }

        let pollInterval = null;

        const stopPolling = () => {
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        };

        const pollStatus = () => {
            fetch('/cgi-bin/ssr/vpn_installer?action=status')
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'running') {
                        if (stepEl) stepEl.textContent = data.progress || "Đang cài đặt...";
                    } else if (data.status === 'success') {
                        stopPolling();
                        if (stepEl) stepEl.textContent = data.message || "CÀI ĐẶT HOÀN TẤT!";
                        setTimeout(() => location.reload(), 2000);
                    } else if (data.status === 'error') {
                        stopPolling();
                        if (overlay) overlay.remove();
                        Modal.show({
                            title: "⚠️ LỖI CÀI ĐẶT",
                            content: `<div style="text-align:center; padding:10px;">
                                        <div style="font-size:50px; margin-bottom:20px;">❌</div>
                                        <p style="color:#f56565; font-weight:700;">${data.message || 'Cài đặt thất bại!'}</.p>
                                      </div>`,
                            showCancel: false,
                            confirmText: "Quay lại"
                        });
                    }
                })
                .catch(() => {
                    // Ignore transient network errors during polling (e.g. router CPU spikes)
                });
        };

        // START THE PROCESS
        fetch('/cgi-bin/ssr/vpn_installer?action=start')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'started' || data.status === 'running') {
                    // Start polling
                    pollInterval = setInterval(pollStatus, 3000);
                } else {
                    throw new Error("Không thể khởi động bộ cài");
                }
            })
            .catch(error => {
                if (overlay) overlay.remove();
                Modal.alert("Lỗi", "Không thể kết nối với bộ cài trên Router: " + error.message, "error");
            });
    },

    fetchClients: function () {
        fetch('/cgi-bin/ssr/ssr_plus?action=get_clients')
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') {
                    this.clients = d.clients;
                }
            });
    },

    // ═══════════════════════  RENDER CORE  ═══════════════════════
    render: function () {
        const c = document.getElementById('ssr-container');
        if (!c) return;

        const tabs = [
            { id: 'dashboard', label: '📊 Trạng thái' },
            { id: 'settings', label: '⚙️ Cài đặt chung' },
            { id: 'sub', label: '🔄 Đăng ký' },
            { id: 'time', label: '🕒 Thời gian' },
            { id: 'advanced', label: '🚀 Nâng cao' },
            { id: 'log', label: '📋 Nhật ký' }
        ];

        let html = `<div class="ssr-tabs">${tabs.map(t =>
            `<div class="ssr-tab ${this.currentTab === t.id ? 'active' : ''}" onclick="SSRPlusModule.switchTab('${t.id}')">${t.label}</div>`
        ).join('')}</div><div id="ssr-tab-content">`;

        switch (this.currentTab) {
            case 'dashboard': html += this.renderDashboard(); break;
            case 'settings': html += this.renderSettings(); break;
            case 'advanced': html += this.renderAdvanced(); break;
            case 'sub': html += this.renderSub(); break;
            case 'time': html += this.renderTimeSync(); break;
            case 'log': html += this.renderLog(); break;
        }
        html += '</div>';
        c.innerHTML = html;

        if (this.currentTab === 'settings') this.initDnsCombo();
        if (this.currentTab === 'dashboard') this.fetchPings();
        if (this.currentTab === 'time') this.startTimeDisplay(); else this.stopTimeDisplay();
        if (this.currentTab === 'log') this.startLogAutoRefresh(); else this.stopLogAutoRefresh();

        // Mobile: Scroll active tab into view
        setTimeout(() => {
            const activeTab = document.querySelector('.ssr-tab.active');
            if (activeTab) activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 100);
    },

    // ═══════════════════════  TAB: DASHBOARD  ═══════════════════════
    renderDashboard: function () {
        const d = this.data;
        const g = d.global;
        const node = d.servers.find(s => s.id === g.main_server) || { alias: 'Chưa chọn', type: '--', address: '--', port: '--' };

        const runLabels = { 'all': 'Toàn cầu', 'gfw': 'GFW List', 'oversea': 'Bypass China', 'router': 'Chỉ Router' };
        const dnsLabels = { '1': 'PDNSD', '2': 'DNS2SOCKS', '3': 'DoH', '4': 'MOSDNS', '6': 'ChinaDNS-NG' };

        const runModeDisplay = runLabels[g.run_mode] || g.run_mode || 'N/A';
        const dnsModeDisplay = dnsLabels[g.dns_mode] || g.dns_mode || 'N/A';

        const isRunning = d.running === 1;
        const statusBadge = isRunning 
            ? '<span class="ssr-status-badge ssr-status-on"><span class="ssr-status-dot on"></span> ⚡ HOẠT ĐỘNG</span>'
            : '<span class="ssr-status-badge ssr-status-off"><span class="ssr-status-dot off"></span> ❌ ĐÃ DỪNG</span>';

        // Re-aligned hero card with centered aesthetics
        return `
            <div class="ssr-hero-card" style="text-align: center;">
                <div style="margin-top:10px;">
                    <div style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.15em; color:var(--ssr-cyan); margin-bottom:12px;">
                        • MÁY CHỦ • ${statusBadge}
                    </div>
                    <div style="font-size:32px; font-weight:900; background:var(--ssr-gradient); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; padding:8px 0;">${node.alias}</div>
                    <div style="font-size:13px; color:var(--text-sub); font-family:'JetBrains Mono', monospace; margin-top:8px; letter-spacing:0.02em;">${node.address}:${node.port}</div>
                </div>
            </div>

            <div class="ssr-stats-row">
                <div class="ssr-stat-card">
                    <div class="ssr-stat-label">Chế độ</div>
                    <div class="ssr-stat-value">${runModeDisplay}</div>
                </div>
                <div class="ssr-stat-card">
                    <div class="ssr-stat-label">DNS</div>
                    <div class="ssr-stat-value">${dnsModeDisplay}</div>
                </div>
                <div class="ssr-stat-card">
                    <div class="ssr-stat-label">Số Node</div>
                    <div class="ssr-stat-value">${d.servers.length}</div>
                </div>
            </div>

            <div class="ssr-panel" style="margin-bottom:0;">
                <div class="ssr-panel-title" style="display:flex; justify-content:space-between; align-items:center;">
                    <span><span class="ssr-icon">📡</span> Danh sách máy chủ</span>
                    <button class="ssr-btn" onclick="SSRPlusModule.fetchPings()" style="padding:4px 12px; font-size:11px; background:rgba(0,243,255,0.1); border:1px solid rgba(0,243,255,0.2); color:var(--ssr-cyan);">
                        ⚡ Ping Tất cả
                    </button>
                </div>
                <div class="ssr-node-grid">
                    ${d.servers.map(s => `
                        <div class="ssr-node-card ${s.id === g.main_server ? 'active' : ''}" onclick="SSRPlusModule.quickSwitch('${s.id}','${s.alias}')" id="node-card-${s.id}">
                            <div class="ssr-node-header">
                                <div class="ssr-node-alias">${s.alias}</div>
                                <div class="ssr-node-type">${s.type}</div>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div class="ssr-node-meta">${s.address}</div>
                                <div style="display:flex; gap:8px; align-items:center;">
                                    <div class="ssr-node-ping" id="ping-${s.id}" data-host="${s.address}">--</div>
                                    <span title="Xóa Node này" style="cursor:pointer; font-size:14px; opacity:0.3; transition:0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.3" onclick="event.stopPropagation(); SSRPlusModule.deleteNode('${s.id}', '${s.alias}')">🗑️</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // ═══════════════════════  TAB: SETTINGS  ═══════════════════════
    renderSettings: function () {
        const g = this.data.global || {};
        const svrs = this.data.servers || [];

        const renderServerOptions = (current) => {
            return svrs.map(s => `<option value="${s.id}" ${current === s.id ? 'selected' : ''}>[${s.type.toUpperCase()}] ${s.alias}</option>`).join('');
        };

        const dnsMode = g.dns_mode || '1';
        const dports = g.dports || '1';
        const threads = g.threads || '0';
        const runMode = g.run_mode || 'gfw';

        // DNS Presets for different modes
        const tunnelPresets = [
            { v: "8.8.4.4:53", l: "Google Public DNS (8.8.4.4)" },
            { v: "8.8.8.8:53", l: "Google Public DNS (8.8.8.8)" },
            { v: "208.67.222.222:53", l: "OpenDNS (208.67.222.222)" },
            { v: "208.67.220.220:53", l: "OpenDNS (208.67.220.220)" },
            { v: "209.244.0.3:53", l: "Level 3 Public DNS (209.244.0.3)" },
            { v: "209.244.0.4:53", l: "Level 3 Public DNS (209.244.0.4)" },
            { v: "4.2.2.1:53", l: "Level 3 Public DNS (4.2.2.1)" },
            { v: "4.2.2.2:53", l: "Level 3 Public DNS (4.2.2.2)" },
            { v: "4.2.2.3:53", l: "Level 3 Public DNS (4.2.2.3)" },
            { v: "4.2.2.4:53", l: "Level 3 Public DNS (4.2.2.4)" },
            { v: "1.1.1.1:53", l: "Cloudflare DNS (1.1.1.1)" },
            { v: "114.114.114.114:53", l: "Oversea Mode DNS-1 (114.114.114.114)" },
            { v: "114.114.115.115:53", l: "Oversea Mode DNS-2 (114.114.115.115)" }
        ];

        const mosdnsPresets = [
            { v: "tcp://8.8.4.4:53,tcp://8.8.8.8:53", l: "Google Public DNS" },
            { v: "tcp://208.67.222.222:53,tcp://208.67.220.220:53", l: "OpenDNS" },
            { v: "tcp://209.244.0.3:53,tcp://209.244.0.4:53", l: "Level 3 Public DNS-1" },
            { v: "tcp://4.2.2.1:53,tcp://4.2.2.2:53", l: "Level 3 Public DNS-2" },
            { v: "tcp://4.2.2.3:53,tcp://4.2.2.4:53", l: "Level 3 Public DNS-3" },
            { v: "tcp://1.1.1.1:53,tcp://1.0.0.1:53", l: "Cloudflare DNS" }
        ];

        const chinadnsPresets = [
            { v: "8.8.4.4:53", l: "Google Public DNS" },
            { v: "114.114.114.114:53", l: "Nanjing Xinfeng 114DNS" },
            { v: "119.29.29.29:53", l: "DNSPod Public DNS" },
            { v: "223.5.5.5:53", l: "AliYun Public DNS" },
            { v: "180.76.76.76:53", l: "Baidu Public DNS" }
        ];

        const renderDnsCombo = (id, presets, current) => {
            const isMatch = presets.some(p => p.v === current);
            return `
                <select id="${id}-preset" class="ssr-select" style="margin-bottom: 8px;" onchange="SSRPlusModule.onDnsComboChange('${id}')">
                    <option value="">-- Vui lòng chọn --</option>
                    ${presets.map(p => `<option value="${p.v}" ${current === p.v ? 'selected' : ''}>${p.l}</option>`).join('')}
                    <option value="__custom__" ${!isMatch && current ? 'selected' : ''}>-- Tùy chỉnh --</option>
                </select>
                <div id="${id}-custom-box" style="display: ${isMatch ? 'none' : 'block'}">
                    <input type="text" id="${id}" class="ssr-input" value="${current}" placeholder="Nhập IP:Port hoặc tcp://IP:Port">
                </div>
            `;
        };

        return `
            <!-- ═══ CÀI ĐẶT CHUNG ═══ -->
            <div class="ssr-panel" style="margin-bottom: 20px;">
                <div class="ssr-panel-title"><span class="ssr-icon">⚙️</span> Cài đặt chung</div>

                <div class="ssr-control-grid">
                    <div class="ssr-form-group">
                        <label class="ssr-label">Máy chủ chính</label>
                        <select id="set-main-server" class="ssr-select">
                            <option value="nil" ${g.main_server === 'nil' ? 'selected' : ''}>Vô hiệu hóa</option>
                            ${renderServerOptions(g.main_server)}
                        </select>
                    </div>

                    <div class="ssr-form-group">
                        <label class="ssr-label">Máy chủ UDP (Game)</label>
                        <select id="set-udp-server" class="ssr-select">
                            <option value="" ${g.udp_server === '' ? 'selected' : ''}>Vô hiệu hóa</option>
                            <option value="same" ${g.udp_server === 'same' ? 'selected' : ''}>Giống máy chủ chính</option>
                            ${renderServerOptions(g.udp_server)}
                        </select>
                    </div>

                    <div class="ssr-form-group">
                        <label class="ssr-label">Chế độ chạy</label>
                        <select id="set-run-mode" class="ssr-select" onchange="SSRPlusModule.toggleDnsFields()">
                            <option value="gfw" ${runMode === 'gfw' ? 'selected' : ''}>GFW List</option>
                            <option value="router" ${runMode === 'router' ? 'selected' : ''}>IP Route (Bỏ qua Trung Quốc)</option>
                            <option value="all" ${runMode === 'all' ? 'selected' : ''}>Toàn cầu (Global)</option>
                            <option value="oversea" ${runMode === 'oversea' ? 'selected' : ''}>Hải ngoại (Oversea)</option>
                        </select>
                    </div>

                    <div class="ssr-form-group">
                        <label class="ssr-label">Tùy chọn đa luồng</label>
                        <select id="set-threads" class="ssr-select">
                            <option value="0" ${threads === '0' ? 'selected' : ''}>Tự động</option>
                            <option value="1" ${threads === '1' ? 'selected' : ''}>1 Luồng</option>
                            <option value="2" ${threads === '2' ? 'selected' : ''}>2 Luồng</option>
                            <option value="3" ${threads === '3' ? 'selected' : ''}>3 Luồng</option>
                            <option value="4" ${threads === '4' ? 'selected' : ''}>4 Luồng</option>
                            <option value="5" ${threads === '5' ? 'selected' : ''}>5 Luồng</option>
                            <option value="6" ${threads === '6' ? 'selected' : ''}>6 Luồng</option>
                            <option value="7" ${threads === '7' ? 'selected' : ''}>7 Luồng</option>
                            <option value="8" ${threads === '8' ? 'selected' : ''}>8 Luồng</option>
                            <option value="16" ${threads === '16' ? 'selected' : ''}>16 Luồng</option>
                            <option value="32" ${threads === '32' ? 'selected' : ''}>32 Luồng</option>
                            <option value="64" ${threads === '64' ? 'selected' : ''}>64 Luồng</option>
                            <option value="128" ${threads === '128' ? 'selected' : ''}>128 Luồng</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- ═══ CỔNG PROXY ═══ -->
            <div class="ssr-panel" style="margin-bottom: 20px;">
                <div class="ssr-panel-title"><span class="ssr-icon">⚓</span> Cổng Proxy</div>
                <div class="ssr-form-group">
                    <select id="set-dports" class="ssr-select" onchange="document.getElementById('custom-ports-box').style.display = (this.value === '3' ? 'block' : 'none')">
                        <option value="1" ${dports === '1' ? 'selected' : ''}>Tất cả các cổng</option>
                        <option value="2" ${dports === '2' ? 'selected' : ''}>Chỉ cổng phổ thông (80, 443...)</option>
                        <option value="3" ${dports === '3' ? 'selected' : ''}>Tùy chỉnh cổng...</option>
                    </select>
                </div>
                <div id="custom-ports-box" style="display: ${dports === '3' ? 'block' : 'none'}; margin-top: 15px;">
                    <div class="ssr-form-group">
                        <label class="ssr-label">Nhập cổng tùy chỉnh (cách nhau bởi dấu phẩy)</label>
                        <input type="text" id="set-custom-ports" class="ssr-input" value="${g.custom_ports || ''}" placeholder="Ví dụ: 80,443,8080">
                    </div>
                </div>
            </div>

            <!-- ═══ PHÂN GIẢI DNS ═══ -->
            <div class="ssr-panel" style="margin-bottom: 20px;">
                <div class="ssr-panel-title"><span class="ssr-icon">🔍</span> Phân giải DNS</div>
                <div class="ssr-form-group">
                    <label class="ssr-label">Chế độ phân giải</label>
                    <select id="set-dns-mode" class="ssr-select" onchange="SSRPlusModule.toggleDnsFields()">
                        <option value="1" ${dnsMode === '1' ? 'selected' : ''}>Sử dụng truy vấn DNS2TCP</option>
                        <option value="2" ${dnsMode === '2' ? 'selected' : ''}>Sử dụng truy vấn & cache DNS2SOCKS</option>
                        <option value="4" ${dnsMode === '4' ? 'selected' : ''}>Sử dụng truy vấn MOSDNS (Không hỗ trợ Oversea)</option>
                        <option value="0" ${dnsMode === '0' ? 'selected' : ''}>Dùng DNS cục bộ (Cổng 5335)</option>
                    </select>
                </div>

                <!-- Máy chủ DNS chống ô nhiễm (DNS2TCP/SOCKS) -->
                <div id="dns-field-tunnel" class="dns-input-group" style="display: ${['1','2','3'].includes(dnsMode) ? 'block' : 'none'}; margin-top:15px;">
                    <label class="ssr-label">Máy chủ DNS chống ô nhiễm</label>
                    ${renderDnsCombo('set-tunnel-dns', tunnelPresets, g.tunnel_dns_raw || '8.8.4.4:53')}
                    <div class="ssr-help-text" style="font-size:11px; color:var(--ssr-cyan); margin-top:5px;">
                        <span style="color:#3182ce;">ℹ️</span> Định dạng: <b>IP:PORT</b> (Mặc định: 8.8.4.4:53)
                    </div>
                </div>

                <!-- Máy chủ DNS chống ô nhiễm (MOSDNS) -->
                <div id="dns-field-mosdns" class="dns-input-group" style="display: ${dnsMode === '4' ? 'block' : 'none'}; margin-top:15px;">
                    <label class="ssr-label">Máy chủ DNS chống ô nhiễm</label>
                    ${renderDnsCombo('set-mosdns-dns', mosdnsPresets, g.tunnel_forward_mosdns || 'tcp://8.8.4.4:53')}
                    <div class="ssr-help-text" style="font-size:11px; color:var(--ssr-cyan); margin-top:5px;">
                        <span style="color:#3182ce;">ℹ️</span> Định dạng: <b>tcp://IP:PORT</b> hoặc <b>tls://DOMAIN:PORT</b>
                    </div>
                </div>

                <!-- Máy chủ DNS chống ô nhiễm (ChinaDNS-NG) -->
                <div id="dns-field-chinadns" class="dns-input-group" style="display: ${dnsMode === '6' ? 'block' : 'none'}; margin-top:15px;">
                    <div class="ssr-form-group">
                        <label class="ssr-label">Máy chủ DNS chống ô nhiễm</label>
                        ${renderDnsCombo('set-chinadns-dns', chinadnsPresets, g.chinadns_ng_tunnel_forward || '8.8.4.4')}
                    </div>
                    <div class="ssr-form-group" style="margin-top:10px;">
                        <label class="ssr-label">Giao thức truy vấn ChinaDNS-NG</label>
                        <select id="set-chinadns-proto" class="ssr-select">
                            <option value="none" ${g.chinadns_ng_proto === 'none' ? 'selected' : ''}>UDP/TCP</option>
                            <option value="tcp" ${g.chinadns_ng_proto === 'tcp' ? 'selected' : ''}>Chỉ TCP</option>
                            <option value="udp" ${g.chinadns_ng_proto === 'udp' ? 'selected' : ''}>Chỉ UDP</option>
                            <option value="tls" ${g.chinadns_ng_proto === 'tls' ? 'selected' : ''}>DoT (Yêu cầu wolfssl)</option>
                        </select>
                    </div>
                </div>

                <!-- Máy chủ DNS trong nước -->
                <div id="dns-field-domestic" class="dns-input-group" style="display: ${runMode === 'router' && !['4','0'].includes(dnsMode) ? 'block' : 'none'}; margin-top:15px; border-top: 1px solid var(--ssr-glass-border); padding-top: 15px;">
                    <div class="ssr-form-group">
                        <label class="ssr-label">Máy chủ DNS trong nước</label>
                        <input type="text" id="set-domestic-dns" class="ssr-input" value="${g.chinadns_forward || ''}" placeholder="Mặc định: Tự động từ WAN">
                        <div class="ssr-help-text" style="font-size:11px; color:var(--ssr-cyan); margin-top:5px;">
                            ℹ️ Định dạng: <b>IP:PORT</b> (Để trống để dùng DNS mặc định)
                        </div>
                    </div>
                </div>
            </div>

            <div class="ssr-actions">
                <button class="ssr-btn ssr-btn-primary" onclick="SSRPlusModule.saveConfig()">
                    💾 Lưu cài đặt &amp; Khởi động lại
                </button>
            </div>
        `;
    },





    // ═══════════════════════  TAB: ADVANCED  ═══════════════════════
    renderAdvanced: function () {
        const adv = this.data.adv;
        const sniff = this.data.sniffing || {};
        const rawExcluded = sniff.domains_excluded;
        let excludedDomains = '';
        if (Array.isArray(rawExcluded) && rawExcluded.length > 0) {
            excludedDomains = rawExcluded.join('\n');
        } else if (typeof rawExcluded === 'string') {
            excludedDomains = rawExcluded;
        }

        return `
            <!-- ═══ SNIFFING CONTROL ═══ -->
            <div class="ssr-panel" style="margin-bottom: 20px;">
                <div class="ssr-panel-title"><span class="ssr-icon">🔍</span> Sniffing — Kiểm soát đánh hơi gói tin</div>
                
                <div class="ssr-help-text" style="color: var(--ssr-cyan); margin-bottom: 18px; background: rgba(0,243,255,0.05); padding: 12px 14px; border-radius: 10px; line-height: 1.7; font-size: 12px;">
                    <b>💡 Dành cho Hack Data:</b><br>
                    • Inbound Sniffing cần <b style="color:#48bb78;">BẬT</b> để Proxy biết tên miền mà định tuyến.<br>
                    • Outbound Sniffing nên <b style="color:#f56565;">TẮT</b> để không ghi đè SNI giả mạo.<br>
                    • Thêm tên miền vào <b>Loại trừ</b> nếu App bị lỗi (VD: Zalo, Apple Push).
                </div>

                <div class="ssr-inline-row" style="margin-bottom: 15px;">
                    <div>
                        <div class="ssr-label">📥 Inbound Sniffing (Dokodemo-door)</div>
                        <div style="font-size:11px; color:var(--text-sub); margin-top:4px;">Cửa ngõ nhận dữ liệu từ LAN — Nên BẬT</div>
                    </div>
                    <label class="ssr-switch-toggle">
                        <input type="checkbox" id="set-sniff-inbound" ${sniff.inbound !== '0' ? 'checked' : ''}>
                        <span class="ssr-slider"></span>
                    </label>
                </div>

                <div class="ssr-inline-row" style="margin-bottom: 15px;">
                    <div>
                        <div class="ssr-label">📤 Outbound Sniffing</div>
                        <div style="font-size:11px; color:var(--text-sub); margin-top:4px;">Cửa ngõ gửi dữ liệu ra ngoài — Nên TẮT khi Hack Data</div>
                    </div>
                    <label class="ssr-switch-toggle">
                        <input type="checkbox" id="set-sniff-outbound" ${sniff.outbound === '1' ? 'checked' : ''} onchange="document.getElementById('sniff-excluded-box').style.display = this.checked ? 'block' : 'none'">
                        <span class="ssr-slider"></span>
                    </label>
                </div>

                <div id="sniff-excluded-box" style="display: ${sniff.outbound === '1' ? 'block' : 'none'}; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--ssr-glass-border);">
                    <div class="ssr-form-group">
                        <label class="ssr-label">🚫 Tên miền Loại trừ (DomainsExcluded)</label>
                        <div style="font-size:11px; color:var(--text-sub); margin-bottom:8px;">Mỗi dòng một tên miền. Các App trong danh sách này sẽ không bị Sniffing can thiệp.</div>
                        <textarea id="set-sniff-excluded" class="ssr-list-editor" style="height:150px; width:100%; background: var(--icon-bg, #0d1117); color: var(--text-main, #e6edf3); border: 1px solid var(--ssr-glass-border, #30363d); border-radius: 10px; padding: 12px; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px; line-height: 1.6; resize: vertical;" placeholder="Ví dụ:\ncourier.push.apple.com\nzalo.me\n*.zadn.vn">${excludedDomains}</textarea>
                    </div>
                </div>
            </div>

            <div class="ssr-actions">
                <button class="ssr-btn ssr-btn-primary" onclick="SSRPlusModule.saveConfig()">
                    💾 Lưu cài đặt &amp; Khởi động lại
                </button>
            </div>
        `;
    },

    // ═══════════════════════  TAB: SUBSCRIPTION & IMPORT  ═══════════════════════
    renderSub: function () {
        return `
            <div class="ssr-control-grid">
                <div class="ssr-panel ssr-grid-full">
                    <div class="ssr-panel-title"><span class="ssr-icon">📥</span> Đăng ký Node Thủ Công</div>
                    <div class="ssr-help-text" style="margin-bottom: 20px; color: var(--text-sub);">
                        Vui lòng dán danh sách máy chủ (Node) vào bên dưới (Hỗ trợ định dạng: <strong>vmess://, vless://, ss://, ssr://, trojan://</strong>). Hệ thống sẽ tự động nhận diện và thiết lập cấu hình tốt nhất.
                    </div>
                    <div class="ssr-form-group">
                        <textarea id="import-url-input" class="ssr-list-editor" style="height:250px;" placeholder="Dán link các Node vào đây (Mỗi dòng một link)..."></textarea>
                    </div>
                </div>
            </div>

            <div class="ssr-actions">
                <button class="ssr-btn ssr-btn-primary" onclick="SSRPlusModule.importNodes()">
                    📥 Thêm Node
                </button>
            </div>
        `;
    },

    // ═══════════════════════  TAB: TIME SYNC  ═══════════════════════
    renderTimeSync: function () {
        const g = this.data.global;
        const t = {
            now: this.timeNow || '--:--:--',
            startup: g.time_startup || '0'
        };
        const isStartupActive = t.startup === '1';

        return `
            <div class="ssr-hero-card ssr-time-hero">
                <div class="ssr-status-info ssr-time-container">
                    <div class="ssr-time-label">Thời gian hệ thống (GMT+7)</div>
                    <div id="ssr-current-time" class="ssr-time-display">${t.now}</div>
                    <div class="ssr-status-badge ssr-status-on ssr-time-badge">
                        <span class="ssr-status-dot on"></span> Đã kết nối TimeWrt
                    </div>
                </div>
                
                <div class="ssr-time-actions">
                     <button class="ssr-btn ssr-btn-primary" onclick="SSRPlusModule.syncTimeManual()">⚡ Cập nhật Internet</button>
                     <button class="ssr-btn ssr-btn-browser" onclick="SSRPlusModule.syncTimeBrowser()">💻 Đồng bộ Browser</button>
                     <button id="btn-startup-toggle" class="ssr-btn ${isStartupActive ? 'ssr-btn-toggle-active' : 'ssr-btn-toggle-inactive'}" 
                             onclick="SSRPlusModule.toggleStartupUI()">
                        🚀 Tự khởi chạy: ${isStartupActive ? 'BẬT' : 'TẮT'}
                     </button>
                     <input type="checkbox" id="set-time-startup" ${isStartupActive ? 'checked' : ''} style="display:none">
                </div>

                <!-- Hidden inputs to maintain compatibility with saveConfig -->
                <input type="hidden" id="set-time-server" value="${g.time_server || ''}">
                <input type="hidden" id="set-time-cron" value="${g.time_cron || '0'}">
            </div>

            <div class="ssr-actions" style="margin-top: 30px; border-top: 1px solid var(--ssr-glass-border); padding-top: 20px; display: flex; justify-content: center;">
                <button class="ssr-btn ssr-btn-primary" onclick="SSRPlusModule.saveConfig()" style="min-width: 250px;">💾 Lưu thay đổi</button>
            </div>
        `;
    },

    // ═══════════════════════  LOGIC  ═══════════════════════
    initDnsCombo: function () {
        const preset = document.getElementById('set-dns-preset');
        const input = document.getElementById('set-tunnel-dns');
        if (!preset || !input) return;
        const match = this.DNS_PRESETS.find(p => p.value === input.value);
        preset.value = match ? match.value : '__custom__';
    },

    onDnsPresetChange: function () {
        const preset = document.getElementById('set-dns-preset').value;
        const customBox = document.getElementById('dns-custom-box');
        const input = document.getElementById('set-tunnel-dns');

        if (preset === '__custom__') {
            customBox.style.display = 'block';
            input.focus();
        } else {
            customBox.style.display = 'none';
            input.value = preset;
        }
    },

    switchTab: function (tab) {
        this.currentTab = tab;
        this.render();
        if (tab === 'control') this.fetchClients();
    },

    timeTimer: null,
    startTimeDisplay: function () {
        this.stopTimeDisplay();

        const fetchTime = () => {
            fetch('/cgi-bin/ssr/ssr_plus?action=get_time')
                .then(r => r.json())
                .then(d => {
                    this.timeNow = d.now;
                    const el = document.getElementById('ssr-current-time');
                    if (el) el.innerText = d.now;
                });
        };

        // Lấy giờ ngay lập tức
        fetchTime();

        // Cập nhật mỗi 2 giây
        this.timeTimer = setInterval(fetchTime, 2000);
    },

    stopTimeDisplay: function () {
        if (this.timeTimer) clearInterval(this.timeTimer);
    },

    toggleStartupUI: function () {
        const checkbox = document.getElementById('set-time-startup');
        const btn = document.getElementById('btn-startup-toggle');
        if (!checkbox || !btn) return;

        const newState = !checkbox.checked;
        checkbox.checked = newState;

        if (newState) {
            btn.className = 'ssr-btn ssr-btn-toggle-active';
            btn.innerText = '🚀 Tự khởi chạy: ĐANG BẬT';
            Toast.show('Đã bật tự khởi chạy khi khởi động', 'success');
        } else {
            btn.className = 'ssr-btn ssr-btn-toggle-inactive';
            btn.innerText = '🚀 Tự khởi chạy: ĐANG TẮT';
            Toast.show('Đã tắt tự khởi chạy', 'warning');
        }
    },

    syncTimeManual: function () {
        Toast.show('Đang đồng bộ với máy chủ thời gian...', 'info');
        fetch(`/cgi-bin/ssr/ssr_plus?action=sync_time`)
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') {
                    Toast.show('Đồng bộ thời gian thành công!', 'success');
                    this.fetchData();
                } else {
                    Toast.show('Đồng bộ thất bại', 'error');
                }
            });
    },

    syncTimeBrowser: function () {
        // Lấy giờ hiện tại từ trình duyệt
        const now = new Date();
        // Định dạng thành: YYYY-MM-DD HH:MM:SS (Định dạng chuẩn của command date -s)
        const pad = (n) => n.toString().padStart(2, '0');
        const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        Toast.show('Đang đồng bộ giờ từ trình duyệt...', 'info');
        fetch(`/cgi-bin/ssr/ssr_plus?action=set_time&time=${encodeURIComponent(timeStr)}`)
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') {
                    Toast.show('Đã đồng bộ giờ từ trình duyệt!', 'success');
                    this.fetchData();
                } else {
                    Toast.show(d.message || 'Thất bại', 'error');
                }
            })
            .catch(() => Toast.show('Lỗi kết nối', 'error'));
    },

    fetchPings: async function () {
        if (!this.data.servers || this.data.servers.length === 0) return;
        if (this.currentTab !== 'dashboard') return;

        // Reset all ping displays
        this.data.servers.forEach(s => {
            const el = document.getElementById(`ping-${s.id}`);
            if (el) { el.innerText = '···'; el.className = 'ssr-node-ping'; }
        });

        // Batch Pinging (Parallel)
        const batchSize = 3; // Limit concurrency to avoid overloading
        for (let i = 0; i < this.data.servers.length; i += batchSize) {
            const batch = this.data.servers.slice(i, i + batchSize);
            await Promise.all(batch.map(async s => {
                const el = document.getElementById(`ping-${s.id}`);
                if (!el) return;
                try {
                    const r = await fetch(`/cgi-bin/ssr/ssr_plus?action=ping_node&host=${s.address}&port=${s.port}&type=${s.type}`);
                    const d = await r.json();
                    if (d.status === 'success' && d.time) {
                        const ms = parseInt(d.time);
                        el.innerText = `${ms} ms`;
                        if (ms < 100) el.className = 'ssr-node-ping ping-good';
                        else if (ms < 300) el.className = 'ssr-node-ping ping-medium';
                        else el.className = 'ssr-node-ping ping-bad';
                    } else {
                        el.innerText = 'Timeout';
                        el.className = 'ssr-node-ping ping-bad';
                    }
                } catch (e) {
                    el.innerText = 'Error';
                    el.className = 'ssr-node-ping ping-bad';
                }
            }));
        }
    },

    toggleService: function (checked) {
        fetch(`/cgi-bin/ssr/ssr_plus?action=toggle&value=${checked ? '1' : '0'}`)
            .then(() => {
                Toast.show('Đang khởi động lại dịch vụ...', 'warning');
                setTimeout(() => this.fetchData(), 2500);
            });
    },

    quickSwitch: function (id, alias) {
        if (id === this.data.global.global_server) return;
        
        // UI Feedback
        const cards = document.querySelectorAll('.ssr-node-card');
        cards.forEach(c => c.classList.remove('active'));
        const activeCard = document.getElementById(`node-card-${id}`);
        if (activeCard) activeCard.classList.add('active');

        Toast.show('⚡ Đang chuyển đổi Node: ' + alias + '...', 'info');
        
        fetch(`/cgi-bin/ssr/ssr_plus?action=set_server&id=${id}`)
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') {
                    Toast.show('🚀 Đã kích hoạt Node mới!', 'success');
                    setTimeout(() => this.fetchData(), 1500);
                } else {
                    Toast.show('Lỗi: ' + d.message, 'error');
                }
            })
            .catch(() => Toast.show('Lỗi kết nối bộ xử lý', 'error'));
    },

    deleteNode: function (id, alias) {
        Modal.confirm({
            title: 'Xác nhận xóa Node',
            message: `Bạn có chắc chắn muốn xóa Node <b>${alias}</b> khỏi cấu hình không?`,
            type: 'delete',
            confirmText: 'Xóa Node',
            onConfirm: () => {
                Toast.show(`Đang xóa Node ${alias}...`, 'warning');
                fetch(`/cgi-bin/ssr/ssr_plus?action=delete_node&id=${id}`)
                    .then(r => r.json())
                    .then(d => {
                        if (d.status === 'success') {
                            Toast.show(`Đã xóa Node: ${alias}`, 'success');
                            setTimeout(() => this.fetchData(), 1200);
                        } else {
                            Toast.show('Xóa thất bại: ' + (d.message || ''), 'error');
                        }
                    });
            }
        });
    },

    addTag: function (category, ip) {
        if (!ip) return;
        if (!this.ac_tags[category].includes(ip)) {
            this.ac_tags[category].push(ip);
            this.render();
            Toast.show('Đã thêm thiết bị: ' + ip, 'success');
        } else {
            Toast.show('Thiết bị này đã có trong danh sách', 'info');
        }
    },

    removeTag: function (category, ip) {
        this.ac_tags[category] = this.ac_tags[category].filter(i => i !== ip);
        this.render();
    },

    importNodes: function () {
        const urls = document.getElementById('import-url-input')?.value?.trim();
        if (!urls) { Toast.show('Vui lòng dán link cấu hình vào ô nhập liệu', 'error'); return; }

        Toast.show('Đang phân tích và Import Node...', 'info');
        const p = new URLSearchParams();
        p.append('action', 'import_nodes');
        p.append('links', urls);
        p.append('csrf_token', VWRT_API.csrfToken);

        fetch('/cgi-bin/ssr/ssr_plus', {
            method: 'POST',
            body: p
        })
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') {
                    Toast.show(d.message, 'success');
                    document.getElementById('import-url-input').value = '';
                    setTimeout(() => this.fetchData(), 1000);
                } else {
                    Toast.show(d.message, 'error');
                }
            })
            .catch(() => Toast.show('Lỗi kết nối Server', 'error'));
    },

    updateSubscription: function () {
        Toast.show('Đang gửi lệnh cập nhật Subscription...', 'info');
        fetch('/cgi-bin/ssr/ssr_plus?action=update_sub')
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') {
                    Toast.show(d.message, 'success');
                    // Tự động làm mới dữ liệu sau 5s vì script chạy ngầm
                    setTimeout(() => this.fetchData(), 5000);
                }
            })
            .catch(() => Toast.show('Lỗi kết nối Server', 'error'));
    },

    deleteSubServers: function () {
        Modal.confirm({
            title: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa toàn bộ các Node được thêm từ Subscription không?',
            onConfirm: () => {
                Toast.show('Đang xóa...', 'info');
                fetch('/cgi-bin/ssr/ssr_plus?action=delete_sub_nodes')
                    .then(r => r.json())
                    .then(d => {
                        if (d.status === 'success') {
                            Toast.show(d.message, 'success');
                            this.fetchData();
                        }
                    });
            }
        });
    },

    onDnsComboChange: function (id) {
        const preset = document.getElementById(id + '-preset').value;
        const customBox = document.getElementById(id + '-custom-box');
        const input = document.getElementById(id);

        if (preset === "__custom__") {
            customBox.style.display = "block";
            input.focus();
        } else if (preset !== "") {
            customBox.style.display = "none";
            input.value = preset;
        } else {
            customBox.style.display = "block";
        }
    },

    toggleDnsFields: function () {
        const dnsMode = document.getElementById('set-dns-mode')?.value;
        const runMode = document.getElementById('set-run-mode')?.value;
        const dports = document.getElementById('set-dports')?.value;

        // 1. Logic ẩn hiện Cổng tùy chỉnh
        const boxCustomPorts = document.getElementById('dns-field-custom-ports');
        if (boxCustomPorts) boxCustomPorts.style.display = (dports === '3' ? 'block' : 'none');

        // 2. Logic ẩn hiện DNS Upstream (Anti-pollution)
        const boxTunnel = document.getElementById('dns-field-tunnel');
        const boxMosdns = document.getElementById('dns-field-mosdns');
        const boxChinadns = document.getElementById('dns-field-chinadns');

        if (boxTunnel) boxTunnel.style.display = 'none';
        if (boxMosdns) boxMosdns.style.display = 'none';
        if (boxChinadns) boxChinadns.style.display = 'none';

        if (['1', '2', '3'].includes(dnsMode)) {
            if (boxTunnel) boxTunnel.style.display = 'block';
        } else if (dnsMode === '4') {
            if (boxMosdns) boxMosdns.style.display = 'block';
        } else if (dnsMode === '6') {
            if (boxChinadns) boxChinadns.style.display = 'block';
        }

        // 3. Logic ẩn hiện DNS trong nước (Domestic DNS) - KHỚP 100% LUCI
        // Chỉ hiện khi Running Mode là 'router' VÀ DNS Mode KHÔNG PHẢI MOSDNS (4) hay Local DNS (0)
        const boxDomestic = document.getElementById('dns-field-domestic');
        if (boxDomestic) {
            const shouldShow = (runMode === 'router' && !['4', '0'].includes(dnsMode));
            boxDomestic.style.display = (shouldShow ? 'block' : 'none');
        }
    },

    saveConfig: function () {
        const p = new URLSearchParams();
        p.append('action', 'save_config');
        p.append('csrf_token', VWRT_API.csrfToken);

        // Enable from settings tab
        const enableEl = document.getElementById('set-enable');
        p.append('enable', enableEl ? (enableEl.checked ? '1' : '0') : this.data.global.enable);

        // Settings tab fields
        const fields = {
            'set-main-server': 'server',
            'set-udp-server': 'udp',
            'set-netflix-server': 'netflix_server',
            'set-run-mode': 'mode',
            'set-threads': 'threads',
            'set-dports': 'dports',
            'set-custom-ports': 'custom_ports',
            'set-dns-mode': 'dns_mode',
            'set-tunnel-dns': 'tunnel',
            'set-mosdns-dns': 'tunnel_mosdns',
            'set-chinadns-dns': 'tunnel_chinadns'
        };
        Object.entries(fields).forEach(([elId, param]) => {
            const el = document.getElementById(elId);
            if (el) p.append(param, el.value);
        });

        p.append('monitor', document.getElementById('set-monitor')?.checked ? '1' : '0');
        p.append('shunt_dns', document.getElementById('set-shunt-dns')?.checked ? '1' : '0');



        // Advanced tab logic removed (Fragment/Noise)

        // Sniffing Control
        const sniffIn = document.getElementById('set-sniff-inbound');
        if (sniffIn) {
            p.append('sniff_inbound', sniffIn.checked ? '1' : '0');
            p.append('sniff_outbound', document.getElementById('set-sniff-outbound')?.checked ? '1' : '0');
            const excluded = document.getElementById('set-sniff-excluded')?.value || '';
            p.append('sniff_excluded', excluded);
        }

        // Sub tab
        const subAuto = document.getElementById('set-sub-auto');
        if (subAuto) {
            p.append('sub_auto', subAuto.checked ? '1' : '0');
            p.append('sub_urls', document.getElementById('sub-url-input')?.value || '');
        }

        // Time Sync
        const tServer = document.getElementById('set-time-server');
        if (tServer) {
            p.append('time_server', tServer.value);
            p.append('time_startup', document.getElementById('set-time-startup')?.checked ? '1' : '0');
            p.append('time_cron', document.getElementById('set-time-cron')?.value || '0');
        }

        Toast.show('Đang lưu cấu hình và khởi động lại dịch vụ...', 'info');
        fetch('/cgi-bin/ssr/ssr_plus', {
            method: 'POST',
            body: p
        })
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') {
                    Toast.show(d.message || 'Đã lưu cấu hình thành công!', 'success');
                    setTimeout(() => this.fetchData(), 1500);
                } else {
                    Toast.show('Lỗi: ' + (d.message || 'Không rõ'), 'error');
                }
            })
            .catch(e => Toast.show('Lỗi kết nối API: ' + e.message, 'error'));
    },

    // ═══════════════════════  TAB: LOG  ═══════════════════════
    renderLog: function () {
        return `
            <div class="ssr-section">
                <div class="ssr-section-header" style="margin-bottom: 20px;">
                    <div class="ssr-section-title">📋 Nhật ký hoạt động</div>
                </div>
                
                <div class="ssr-log-wrapper" style="position: relative;">
                    <textarea id="ssr-log-area" readonly 
                        style="width: 100%; height: 450px; background: #0d1117; color: #e6edf3; border: 1px solid #30363d; border-radius: 12px; padding: 15px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 12px; line-height: 1.6; resize: none; outline: none;"></textarea>
                </div>
            </div>
        `;
    },

    loadLog: function () {
        const area = document.getElementById('ssr-log-area');
        if (!area) return;

        fetch('/cgi-bin/ssr/ssr_plus?action=get_log')
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') {
                    const isAtBottom = area.scrollHeight - area.clientHeight <= area.scrollTop + 50;
                    area.value = d.log;
                    if (this.autoRefreshLog || isAtBottom) {
                        area.scrollTop = area.scrollHeight;
                    }
                }
            });
    },

    clearLog: function () {
        Modal.confirm({
            title: "Xác nhận xóa",
            content: "Bạn có chắc chắn muốn xóa toàn bộ nhật ký VPN không? Hành động này sẽ xóa tệp tin trên Router.",
            onConfirm: () => {
                fetch('/cgi-bin/ssr/ssr_plus?action=clear_log')
                    .then(r => r.json())
                    .then(d => {
                        if (d.status === 'success') {
                            this.loadLog();
                            Toast.show(d.message, 'success');
                        }
                    });
            }
        });
    },

    toggleLogAutoRefresh: function (val) {
        this.autoRefreshLog = val;
        const tip = document.getElementById('log-status-tip');
        if (tip) tip.textContent = val ? '🟢 Đang theo dõi...' : '⚪ Đã tạm dừng';
        
        if (val) {
            this.startLogAutoRefresh();
        } else {
            this.stopLogAutoRefresh();
        }
    },

    startLogAutoRefresh: function () {
        this.stopLogAutoRefresh();
        this.loadLog();
        this.logInterval = setInterval(() => this.loadLog(), 5000);
    },

    stopLogAutoRefresh: function () {
        if (this.logInterval) {
            clearInterval(this.logInterval);
            this.logInterval = null;
        }
    },

    toggleDnsFields: function () {
        const mode = document.getElementById('set-dns-mode').value;
        const runMode = document.getElementById('set-run-mode').value;
        const fieldTunnel = document.getElementById('dns-field-tunnel');
        const fieldMosdns = document.getElementById('dns-field-mosdns');
        const fieldChinadns = document.getElementById('dns-field-chinadns');
        const fieldDomestic = document.getElementById('dns-field-domestic');

        // 1. Logic ẩn hiện Anti-pollution
        if (fieldTunnel) fieldTunnel.style.display = (['1', '2', '3'].includes(mode) ? 'block' : 'none');
        if (fieldMosdns) fieldMosdns.style.display = (mode === '4' ? 'block' : 'none');
        if (fieldChinadns) fieldChinadns.style.display = (mode === '6' ? 'block' : 'none');

        // 2. Logic ẩn hiện Máy chủ DNS trong nước (Y chang LuCI)
        // Hiện khi run_mode = "router" VÀ pdnsd_enable thuộc {1, 2, 3, 5, 6} (Trừ 4 và 0)
        if (fieldDomestic) {
            const shouldShowDomestic = (runMode === 'router' && !['4', '0'].includes(mode));
            fieldDomestic.style.display = shouldShowDomestic ? 'block' : 'none';
        }
    }
};

window.SSRPlusModule = SSRPlusModule;
