
const SSRPlusModule = {
    currentTab: 'dashboard',
    data: { global: {}, servers: [], running: 0, adv: {}, sniffing: {} },
    timeNow: '--:--:--',

    DNS_PRESETS: [
        { label: 'Google DNS (8.8.4.4)', value: '8.8.4.4:53' },
        { label: 'Cloudflare DNS (1.1.1.1)', value: '1.1.1.1:53' },
        { label: 'OpenDNS (208.67.222.222)', value: '208.67.222.222:53' }
    ],

    init: function () {
        // Nếu không có container nhúng thì coi như là chạy dạng Modal
        const c = document.getElementById('ssr-module-content');
        if (c) {
            this.fetchData();
            // Cập nhật giờ mỗi 2 giây
            setInterval(() => this.fetchTime(), 2000);
        }
    },

    showModal: function () {
        Modal.show({
            title: "🚀 SSR Plus+ Dashboard",
            content: `<div id="ssr-module-content" class="ssr-module-container" style="min-height: 500px; max-height: 85vh; overflow-y: auto; padding: 10px;">
                        <div style="text-align:center; padding:50px; color:var(--text-sub);">
                            <div class="ssr-loading-spinner" style="margin-bottom:15px;"></div>
                            Đang tải cấu hình...
                        </div>
                      </div>`,
            showConfirm: false,
            showCancel: false,
            width: '1000px'
        });
        
        // Sau khi modal hiện lên, bắt đầu lấy dữ liệu và render
        setTimeout(() => {
            this.fetchData();
            // Cập nhật giờ (chỉ khi modal còn mở)
            const timeTimer = setInterval(() => {
                if (!document.getElementById('ssr-module-content')) {
                    clearInterval(timeTimer);
                    return;
                }
                this.fetchTime();
            }, 2000);
        }, 100);
    },

    fetchData: function () {
        fetch('/cgi-bin/ssr/ssr_plus?action=get_data')
            .then(r => r.json())
            .then(d => {
                this.data = d;
                this.render();
            })
            .catch(e => Toast.show('Lỗi tải dữ liệu: ' + e.message, 'error'));
    },

    fetchTime: function () {
        fetch('/cgi-bin/ssr/ssr_plus?action=get_time')
            .then(r => r.json())
            .then(d => {
                this.timeNow = d.now;
                const el = document.getElementById('ssr-current-time');
                if (el) el.innerText = d.now;
            });
    },

    render: function () {
        const c = document.getElementById('ssr-module-content');
        if (!c) return;

        const tabs = [
            { id: 'dashboard', label: '📊 Trạng thái' },
            { id: 'settings', label: '⚙️ Cài đặt chung' },
            { id: 'sub', label: '🔄 Đăng ký' },
            { id: 'time', label: '🕒 Thời gian' },
            { id: 'advanced', label: '🚀 Nâng cao' },
            { id: 'log', label: '📋 Nhật ký' }
        ];

        let html = `
            <div class="ssr-tabs">
                ${tabs.map(t => `
                    <div class="ssr-tab ${this.currentTab === t.id ? 'active' : ''}" onclick="SSRPlusModule.switchTab('${t.id}')">
                        ${t.label}
                    </div>
                `).join('')}
            </div>
            <div id="ssr-tab-content">
        `;

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
        if (this.currentTab === 'log') this.startLogAutoRefresh(); else this.stopLogAutoRefresh();
    },

    // ═══════════════════════  TAB: DASHBOARD  ═══════════════════════
    renderDashboard: function () {
        const d = this.data;
        const g = d.global || {};
        const node = d.servers.find(s => s.id === g.main_server) || { alias: 'Chưa chọn', type: '--', address: '--', port: '--' };

        const runLabels = { 'all': 'Toàn cầu', 'gfw': 'GFW List', 'oversea': 'Bypass China', 'router': 'Chỉ Router' };
        const dnsLabels = { '1': 'PDNSD', '2': 'DNS2SOCKS', '4': 'MOSDNS', '5': 'DNSPROXY', '6': 'ChinaDNS-NG', '0': 'Local 5335' };

        const runModeDisplay = runLabels[g.run_mode] || g.run_mode || 'N/A';
        const dnsModeDisplay = dnsLabels[g.dns_mode] || g.dns_mode || 'N/A';

        const isRunning = d.running === 1;
        const statusBadge = isRunning 
            ? '<span class="ssr-status-badge ssr-status-on"><span class="ssr-status-dot on"></span> ⚡ HOẠT ĐỘNG</span>'
            : '<span class="ssr-status-badge ssr-status-off"><span class="ssr-status-dot off"></span> ❌ ĐÃ DỪNG</span>';

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

            <div class="ssr-panel">
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
                                    <span title="Xóa Node" style="cursor:pointer; font-size:14px; opacity:0.3;" onclick="event.stopPropagation(); SSRPlusModule.deleteNode('${s.id}')">🗑️</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // ═══════════════════════  TAB: SETTINGS (CÀI ĐẶT CHUNG)  ═══════════════════════
    renderSettings: function () {
        const g = this.data.global || {};
        
        const renderServerSelect = (id, current, label, icon) => `
            <div class="ssr-input-group">
                <label class="ssr-label"><i class="fas ${icon}"></i> ${label}</label>
                <select id="${id}" class="ssr-select">
                    <option value="nil">-- Không sử dụng --</option>
                    <option value="same" ${current === 'same' ? 'selected' : ''}>-- Giống máy chủ chính --</option>
                    ${this.data.servers.map(s => `
                        <option value="${s.id}" ${s.id === current ? 'selected' : ''}>
                            [${s.type}] ${s.alias}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;

        const currentDns = g.tunnel_dns_raw || '8.8.4.4:53';
        const isPreset = this.DNS_PRESETS.some(p => p.value === currentDns);

        return `
            <div class="ssr-section">
                <div class="ssr-section-header">
                    <div class="ssr-section-title">🛡️ Cấu hình Proxy</div>
                    <div class="ssr-switch-container">
                        <span style="margin-right: 10px; font-size: 14px; color: var(--ssr-text-dim);">Trạng thái</span>
                        <label class="ssr-switch">
                            <input type="checkbox" id="set-enable" ${g.enable === '1' ? 'checked' : ''}>
                            <span class="ssr-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="ssr-grid">
                    ${renderServerSelect('set-main-server', g.main_server, 'Máy chủ chính (TCP)', 'fa-server')}
                    ${renderServerSelect('set-udp-server', g.udp_server, 'Máy chủ Game (UDP)', 'fa-gamepad')}
                    ${renderServerSelect('set-netflix-server', g.netflix_server, 'Máy chủ Netflix', 'fa-film')}
                    
                    <div class="ssr-input-group">
                        <label class="ssr-label"><i class="fas fa-route"></i> Chế độ chạy</label>
                        <select id="set-run-mode" class="ssr-select">
                            <option value="gfw" ${g.run_mode === 'gfw' ? 'selected' : ''}>GFW List (Tự động)</option>
                            <option value="router" ${g.run_mode === 'router' ? 'selected' : ''}>Bypass China IP</option>
                            <option value="all" ${g.run_mode === 'all' ? 'selected' : ''}>Global (Toàn cầu)</option>
                            <option value="oversea" ${g.run_mode === 'oversea' ? 'selected' : ''}>Oversea Mode</option>
                        </select>
                    </div>

                    <div class="ssr-input-group">
                        <label class="ssr-label"><i class="fas fa-fire-alt"></i> Công cụ Firewall</label>
                        <select id="set-prefer-nft" class="ssr-select">
                            <option value="0" ${g.prefer_nft === '0' ? 'selected' : ''}>Iptables (Cũ)</option>
                            <option value="1" ${g.prefer_nft === '1' ? 'selected' : ''}>Nftables (Khuyên dùng)</option>
                        </select>
                    </div>

                    <div class="ssr-input-group">
                        <label class="ssr-label"><i class="fas fa-microchip"></i> Đa luồng (Threads)</label>
                        <select id="set-threads" class="ssr-select">
                            <option value="0" ${g.threads === '0' ? 'selected' : ''}>Tự động</option>
                            <option value="1" ${g.threads === '1' ? 'selected' : ''}>1 Luồng</option>
                            <option value="2" ${g.threads === '2' ? 'selected' : ''}>2 Luồng</option>
                            <option value="4" ${g.threads === '4' ? 'selected' : ''}>4 Luồng</option>
                            <option value="8" ${g.threads === '8' ? 'selected' : ''}>8 Luồng</option>
                            <option value="16" ${g.threads === '16' ? 'selected' : ''}>16 Luồng</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="ssr-section" style="margin-top: 25px;">
                <div class="ssr-section-header">
                    <div class="ssr-section-title">🌐 Cấu hình DNS & Cổng</div>
                </div>

                <div class="ssr-grid">
                    <div class="ssr-input-group">
                        <label class="ssr-label"><i class="fas fa-search-location"></i> Phân giải DNS</label>
                        <select id="set-dns-mode" class="ssr-select">
                            <option value="1" ${g.dns_mode === '1' ? 'selected' : ''}>DNS2TCP</option>
                            <option value="2" ${g.dns_mode === '2' ? 'selected' : ''}>DNS2SOCKS</option>
                            <option value="4" ${g.dns_mode === '4' ? 'selected' : ''}>MOSDNS</option>
                            <option value="5" ${g.dns_mode === '5' ? 'selected' : ''}>DNSPROXY</option>
                            <option value="6" ${g.dns_mode === '6' ? 'selected' : ''}>ChinaDNS-NG</option>
                            <option value="0" ${g.dns_mode === '0' ? 'selected' : ''}>Local DNS (Port 5335)</option>
                        </select>
                    </div>

                    <div class="ssr-input-group">
                        <label class="ssr-label"><i class="fas fa-shield-virus"></i> DNS chống ô nhiễm</label>
                        <div style="display: flex; gap: 8px;">
                            <select id="set-dns-preset" class="ssr-select" style="width: 40%;" onchange="SSRPlusModule.onDnsPresetChange()">
                                ${this.DNS_PRESETS.map(p => {
                                    const isMatch = (currentDns === p.value);
                                    return `<option value="${p.value}" ${isMatch ? 'selected' : ''}>${p.label}</option>`;
                                }).join('')}
                                <option value="__custom__" ${!isPreset ? 'selected' : ''}>Tùy chỉnh...</option>
                            </select>
                            <input type="text" id="set-tunnel-dns" class="ssr-input" style="flex: 1;" value="${currentDns}" placeholder="IP:Port">
                        </div>
                    </div>

                    <div class="ssr-input-group">
                        <label class="ssr-label"><i class="fas fa-home"></i> DNS trong nước (Domestic)</label>
                        <input type="text" id="set-chinadns-forward" class="ssr-input" value="${g.chinadns_forward || ''}" placeholder="Ví dụ: 114.114.114.114:53">
                    </div>

                    <div class="ssr-input-group">
                        <label class="ssr-label"><i class="fas fa-door-open"></i> Kiểm soát Cổng (Ports)</label>
                        <select id="set-dports" class="ssr-select" onchange="document.getElementById('custom-ports-box').style.display = this.value === '3' ? 'block' : 'none'">
                            <option value="1" ${g.dports === '1' ? 'selected' : ''}>Tất cả cổng</option>
                            <option value="2" ${g.dports === '2' ? 'selected' : ''}>Cổng phổ thông (80,443...)</option>
                            <option value="3" ${g.dports === '3' ? 'selected' : ''}>Cổng tùy chỉnh</option>
                        </select>
                    </div>

                    <div id="custom-ports-box" class="ssr-input-group ssr-grid-full" style="display: ${g.dports === '3' ? 'block' : 'none'};">
                        <label class="ssr-label">🔢 Nhập cổng tùy chỉnh</label>
                        <input type="text" id="set-custom-ports" class="ssr-input" value="${g.custom_ports || ''}" placeholder="Ví dụ: 80,443,8080">
                    </div>

                    <div class="ssr-input-group">
                        <label class="ssr-label"><i class="fas fa-external-link-alt"></i> Netflix Proxy Mode</label>
                        <select id="set-netflix-proxy" class="ssr-select">
                            <option value="0" ${g.netflix_proxy === '0' ? 'selected' : ''}>Tắt</option>
                            <option value="1" ${g.netflix_proxy === '1' ? 'selected' : ''}>Bật (Forward qua Proxy chính)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="ssr-actions">
                <button class="ssr-btn ssr-btn-primary" onclick="SSRPlusModule.saveConfig()">
                    💾 Lưu cài đặt & Khởi động lại
                </button>
            </div>
        `;
    },

    // ═══════════════════════  TAB: ADVANCED (NÂNG CAO)  ═══════════════════════
    renderAdvanced: function () {
        const sniff = this.data.sniffing || {};
        const rawExcluded = sniff.domains_excluded || '';
        const excludedDomains = Array.isArray(rawExcluded) ? rawExcluded.join('\n') : rawExcluded;

        return `
            <div class="ssr-panel">
                <div class="ssr-panel-title"><span class="ssr-icon">🔍</span> Sniffing Control</div>
                <div class="ssr-help-text" style="color: var(--ssr-cyan); margin-bottom: 18px; background: rgba(0,243,255,0.05); padding: 12px 14px; border-radius: 10px; font-size: 12px;">
                    <b>💡 Dành cho Hack Data:</b> Inbound Sniffing cần <b>BẬT</b>, Outbound Sniffing nên <b>TẮT</b>.
                </div>

                <div class="ssr-input-group" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <label class="ssr-label">📥 Inbound Sniffing</label>
                    <label class="ssr-switch">
                        <input type="checkbox" id="set-sniff-inbound" ${sniff.inbound !== '0' ? 'checked' : ''}>
                        <span class="ssr-slider"></span>
                    </label>
                </div>

                <div class="ssr-input-group" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <label class="ssr-label">📤 Outbound Sniffing</label>
                    <label class="ssr-switch">
                        <input type="checkbox" id="set-sniff-outbound" ${sniff.outbound === '1' ? 'checked' : ''}>
                        <span class="ssr-slider"></span>
                    </label>
                </div>

                <div class="ssr-input-group">
                    <label class="ssr-label">🚫 Tên miền Loại trừ</label>
                    <textarea id="set-sniff-excluded" class="ssr-list-editor" style="height:120px;" placeholder="Ví dụ: zalo.me">${excludedDomains}</textarea>
                </div>
            </div>

            <div class="ssr-actions">
                <button class="ssr-btn ssr-btn-primary" onclick="SSRPlusModule.saveConfig()">💾 Lưu cài đặt</button>
            </div>
        `;
    },

    // ═══════════════════════  TAB: SUBSCRIPTION (ĐĂNG KÝ)  ═══════════════════════
    renderSub: function () {
        return `
            <div class="ssr-panel">
                <div class="ssr-panel-title"><span class="ssr-icon">📥</span> Import Node Thủ Công</div>
                <div class="ssr-form-group">
                    <textarea id="import-url-input" class="ssr-list-editor" style="height:250px;" placeholder="Dán link vmess://, vless://, ss://... vào đây (Mỗi dòng một link)"></textarea>
                </div>
            </div>
            <div class="ssr-actions">
                <button class="ssr-btn ssr-btn-primary" onclick="SSRPlusModule.importNodes()">📥 Thêm Node</button>
            </div>
        `;
    },

    // ═══════════════════════  TAB: TIME (THỜI GIAN)  ═══════════════════════
    renderTimeSync: function () {
        const g = this.data.global || {};
        const isStartupActive = g.time_startup === '1';

        return `
            <div class="ssr-hero-card" style="text-align: center;">
                <div class="ssr-time-label">Thời gian hệ thống (GMT+7)</div>
                <div id="ssr-current-time" class="ssr-time-display" style="font-size: 48px; font-weight: 900; color: var(--ssr-cyan); margin: 20px 0;">${this.timeNow}</div>
                
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                     <button class="ssr-btn ssr-btn-primary" onclick="SSRPlusModule.syncTimeManual()">⚡ Cập nhật Internet</button>
                     <button id="btn-startup-toggle" class="ssr-btn ${isStartupActive ? 'ssr-btn-toggle-active' : ''}" 
                             onclick="SSRPlusModule.toggleStartupUI()">
                        🚀 Tự khởi chạy: ${isStartupActive ? 'BẬT' : 'TẮT'}
                     </button>
                     <input type="checkbox" id="set-time-startup" ${isStartupActive ? 'checked' : ''} style="display:none">
                </div>
                <input type="hidden" id="set-time-server" value="${g.time_server || ''}">
            </div>
            <div class="ssr-actions">
                <button class="ssr-btn ssr-btn-primary" onclick="SSRPlusModule.saveConfig()">💾 Lưu thay đổi</button>
            </div>
        `;
    },

    // ═══════════════════════  TAB: LOG (NHẬT KÝ)  ═══════════════════════
    renderLog: function () {
        return `
            <div class="ssr-section">
                <div class="ssr-section-header">
                    <div class="ssr-section-title">📋 Nhật ký hoạt động</div>
                </div>
                <textarea id="ssr-log-area" readonly class="ssr-log-area" style="width: 100%; height: 450px; background: #0d1117; color: #e6edf3; border-radius: 12px; padding: 15px; font-family: monospace; font-size: 12px; resize: none; outline: none;"></textarea>
            </div>
        `;
    },

    // ═══════════════════════  LOGIC HANDLERS  ═══════════════════════
    switchTab: function (tab) {
        this.currentTab = tab;
        this.render();
    },

    saveConfig: function () {
        const p = new URLSearchParams();
        p.append('action', 'save_config');
        
        const getVal = (id) => document.getElementById(id)?.value || '';
        const getCheck = (id) => document.getElementById(id)?.checked ? '1' : '0';

        // Global / Settings
        p.append('enable', getCheck('set-enable'));
        p.append('main_server', getVal('set-main-server'));
        p.append('udp_server', getVal('set-udp-server'));
        p.append('netflix_server', getVal('set-netflix-server'));
        p.append('run_mode', getVal('set-run-mode'));
        p.append('prefer_nft', getVal('set-prefer-nft'));
        p.append('threads', getVal('set-threads'));
        p.append('dns_mode', getVal('set-dns-mode'));
        p.append('tunnel_dns', getVal('set-tunnel-dns'));
        p.append('chinadns_forward', getVal('set-chinadns-forward'));
        p.append('dports', getVal('set-dports'));
        p.append('custom_ports', getVal('set-custom-ports'));
        p.append('netflix_proxy', getVal('set-netflix-proxy'));

        // Advanced / Sniffing
        if (document.getElementById('set-sniff-inbound')) {
            p.append('sniff_inbound', getCheck('set-sniff-inbound'));
            p.append('sniff_outbound', getCheck('set-sniff-outbound'));
            p.append('sniff_excluded', getVal('set-sniff-excluded'));
        }

        // Time
        if (document.getElementById('set-time-startup')) {
            p.append('time_server', getVal('set-time-server'));
            p.append('time_startup', getCheck('set-time-startup'));
        }

        Toast.show('Đang lưu cấu hình...', 'info');
        fetch('/cgi-bin/ssr/ssr_plus', { method: 'POST', body: p })
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') {
                    Toast.show('Đã lưu thành công!', 'success');
                    setTimeout(() => this.fetchData(), 1500);
                } else {
                    Toast.show('Lỗi: ' + d.message, 'error');
                }
            })
            .catch(e => Toast.show('Lỗi kết nối API', 'error'));
    },

    quickSwitch: function (id, alias) {
        if (id === this.data.global.main_server) return;
        Toast.show('Đang chuyển sang: ' + alias, 'info');
        const p = new URLSearchParams();
        p.append('action', 'save_config');
        p.append('main_server', id);
        p.append('udp_server', 'same');
        
        fetch('/cgi-bin/ssr/ssr_plus', { method: 'POST', body: p })
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') {
                    Toast.show('Đã chuyển sang ' + alias, 'success');
                    this.fetchData();
                }
            });
    },

    deleteNode: function (id) {
        if (!confirm('Bạn có chắc muốn xóa Node này?')) return;
        fetch(`/cgi-bin/ssr/ssr_plus?action=delete_node&id=${id}`)
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') {
                    Toast.show('Đã xóa thành công', 'success');
                    this.fetchData();
                }
            });
    },

    importNodes: function () {
        const urls = document.getElementById('import-url-input').value;
        if (!urls.trim()) return Toast.show('Vui lòng nhập link Node', 'warning');
        
        const p = new URLSearchParams();
        p.append('action', 'import_nodes');
        p.append('urls', urls);

        Toast.show('Đang nhập dữ liệu...', 'info');
        fetch('/cgi-bin/ssr/ssr_plus', { method: 'POST', body: p })
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') {
                    Toast.show(`Đã thêm ${d.count} Node thành công!`, 'success');
                    this.currentTab = 'dashboard';
                    this.fetchData();
                }
            });
    },

    syncTimeManual: function () {
        Toast.show('Đang đồng bộ với Internet...', 'info');
        fetch('/cgi-bin/ssr/ssr_plus?action=sync_time')
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') Toast.show('Đồng bộ thành công!', 'success');
            });
    },

    toggleStartupUI: function () {
        const cb = document.getElementById('set-time-startup');
        const btn = document.getElementById('btn-startup-toggle');
        cb.checked = !cb.checked;
        btn.innerText = '🚀 Tự khởi chạy: ' + (cb.checked ? 'BẬT' : 'TẮT');
        btn.className = 'ssr-btn ' + (cb.checked ? 'ssr-btn-toggle-active' : '');
    },

    fetchPings: function () {
        const cards = document.querySelectorAll('.ssr-node-ping');
        cards.forEach(c => {
            const host = c.dataset.host;
            c.innerText = '...';
            VWRT_API.ping(host).then(p => {
                c.innerText = p + 'ms';
                c.style.color = p < 100 ? '#48bb78' : (p < 200 ? '#ecc94b' : '#f56565');
            });
        });
    },

    initDnsCombo: function () {
        const preset = document.getElementById('set-dns-preset');
        const input = document.getElementById('set-tunnel-dns');
        if (preset && input) {
            const match = this.DNS_PRESETS.find(p => p.value === input.value);
            if (match) preset.value = match.value;
            else preset.value = '__custom__';
        }
    },

    onDnsPresetChange: function () {
        const preset = document.getElementById('set-dns-preset').value;
        const input = document.getElementById('set-tunnel-dns');
        if (preset !== '__custom__') input.value = preset;
    },

    logTimer: null,
    startLogAutoRefresh: function () {
        this.fetchLog();
        this.logTimer = setInterval(() => this.fetchLog(), 3000);
    },
    stopLogAutoRefresh: function () {
        if (this.logTimer) clearInterval(this.logTimer);
    },
    fetchLog: function () {
        fetch('/cgi-bin/ssr/ssr_plus?action=get_log')
            .then(r => r.json())
            .then(d => {
                const el = document.getElementById('ssr-log-area');
                if (el) {
                    const shouldScroll = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
                    el.value = d.log;
                    if (shouldScroll) el.scrollTop = el.scrollHeight;
                }
            });
    }
};
