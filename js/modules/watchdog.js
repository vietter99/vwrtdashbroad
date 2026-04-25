const WatchdogModule = {
    data: {},
    activeTab: 'config',
    logInterval: null,
    isUserScrolling: false,

    showModal: function() {
        if (!document.getElementById('wd-style')) {
            const style = document.createElement('style');
            style.id = 'wd-style';
            style.innerHTML = `
                /* ── WATCHDOG PREMIUM THEME ── */
                .wd-container {
                    font-family: 'Be Vietnam Pro', sans-serif;
                    color: var(--text-main);
                    --wd-cyan: #06b6d4;
                    --wd-indigo: #6366f1;
                    --wd-gradient: linear-gradient(135deg, #06b6d4, #6366f1);
                    --wd-glass: rgba(255, 255, 255, 0.03);
                    --wd-glass-border: rgba(255, 255, 255, 0.08);
                }

                .wd-tabs {
                    display: flex; gap: 8px; padding: 4px; margin-bottom: 24px;
                    background: var(--wd-glass); border: 1px solid var(--wd-glass-border);
                    border-radius: 14px; backdrop-filter: blur(12px);
                }
                .wd-tab {
                    flex: 1; text-align: center; padding: 10px 18px; font-size: 12px;
                    font-weight: 600; color: var(--text-sub); cursor: pointer;
                    border-radius: 10px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .wd-tab.active {
                    background: var(--wd-gradient); color: #fff;
                    box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3); font-weight: 700;
                }

                .wd-panel {
                    background: var(--wd-glass); backdrop-filter: blur(12px);
                    border: 1px solid var(--wd-glass-border); border-radius: 16px;
                    padding: 24px; margin-bottom: 16px;
                }
                .wd-panel-title {
                    font-size: 13px; font-weight: 800; margin-bottom: 20px;
                    text-transform: uppercase; letter-spacing: 0.1em;
                    background: var(--wd-gradient); -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent; display: flex; align-items: center; gap: 8px;
                }

                /* Cố định Flexbox để không bị lệch */
                .wd-group {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 15px 0; border-bottom: 1px solid var(--wd-glass-border);
                    width: 100%; margin: 0;
                }
                .wd-group:last-child { border-bottom: none; }
                
                .wd-info { display: flex; flex-direction: column; gap: 4px; flex: 1; text-align: left; }
                .wd-info label { font-weight: 700; font-size: 14px; color: var(--text-main); margin: 0; padding: 0; }
                .wd-info small { color: var(--text-sub); font-size: 11px; opacity: 0.8; margin: 0; padding: 0; }

                .wd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px; }
                .wd-input-group { display: flex; flex-direction: column; gap: 8px; }
                .wd-input-group label { font-size: 11px; font-weight: 700; color: var(--wd-cyan); text-transform: uppercase; }
                .wd-input {
                    width: 100%; padding: 12px 14px; border: 1px solid var(--wd-glass-border);
                    border-radius: 10px; background: var(--wd-glass); color: var(--text-main);
                    font-weight: 600; outline: none; box-sizing: border-box;
                }

                .wd-btn-primary {
                    width: 100%; padding: 16px; margin-top: 10px;
                    background: var(--wd-gradient); color: white; border: none;
                    border-radius: 14px; font-weight: 700; cursor: pointer; transition: all 0.3s;
                }

                .wd-log-viewer {
                    background: #0f172a; color: #94a3b8; padding: 20px;
                    border-radius: 16px; font-family: 'JetBrains Mono', monospace;
                    font-size: 11px; line-height: 1.7; overflow-y: auto; max-height: 380px;
                    border: 1px solid var(--wd-glass-border);
                }

                .wd-switch { position: relative; width: 48px; height: 26px; margin-left: 15px; }
                .wd-switch input { opacity: 0; width: 0; height: 0; }
                .wd-slider { position: absolute; cursor: pointer; inset: 0; background: #475569; transition: .3s; border-radius: 26px; }
                .wd-slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background: white; transition: .3s; border-radius: 50%; }
                input:checked + .wd-slider { background: var(--wd-gradient); }
                input:checked + .wd-slider:before { transform: translateX(22px); }
            `;
            document.head.appendChild(style);
        }

        Modal.show({
            title: "💎 Tự động phục hồi mạng",
            content: `
                <div id="watchdog-container" class="wd-container">
                    <div style="text-align:center; padding:60px;">
                        <div class="spinner"></div>
                    </div>
                </div>
            `,
            showCancel: false,
            confirmText: "Đóng"
        });

        this.activeTab = 'config';
        this.fetchConfig();
    },

    fetchConfig: function() {
        fetch('/cgi-bin/system/watchdog')
            .then(res => res.json())
            .then(res => {
                if(res.status === 'success') {
                    this.data = res.data;
                    this.render();
                }
            })
            .catch(err => console.error(err));
    },

    fetchLogs: function() {
        const viewer = document.getElementById('wd-log-content');
        if(!viewer) return;

        fetch('/cgi-bin/system/watchdog_logs')
            .then(res => res.text())
            .then(text => {
                if(viewer) {
                    const isAtBottom = viewer.scrollHeight - viewer.clientHeight <= viewer.scrollTop + 50;
                    viewer.innerText = text.trim() || 'Chưa có hoạt động nào.';
                    if (isAtBottom && !this.isUserScrolling) viewer.scrollTop = viewer.scrollHeight;
                }
            });
    },

    switchTab: function(tab) {
        this.activeTab = tab;
        this.render();
        if(tab === 'logs') {
            this.fetchLogs();
            if(this.logInterval) clearInterval(this.logInterval);
            this.logInterval = setInterval(() => this.fetchLogs(), 3000);
            setTimeout(() => {
                const v = document.getElementById('wd-log-content');
                if(v) v.onscroll = () => this.isUserScrolling = (v.scrollHeight - v.clientHeight > v.scrollTop + 50);
            }, 100);
        } else {
            if(this.logInterval) clearInterval(this.logInterval);
        }
    },

    render: function() {
        const container = document.getElementById('watchdog-container');
        if(!container) return;

        let innerContent = '';
        if(this.activeTab === 'config') {
            innerContent = `
                <div class="wd-panel" style="animation: ssrFadeIn 0.3s ease-out;">
                    <div class="wd-panel-title">🛡️ TRẠNG THÁI BẢO VỆ</div>
                    
                    <div class="wd-group">
                        <div class="wd-info">
                            <label>Kiểm tra Di động (4G/5G)</label>
                            <small>Giám sát kết nối hạ tầng nhà mạng.</small>
                        </div>
                        <label class="wd-switch">
                            <input type="checkbox" id="wd-mobile" ${this.data.mobile_check === '1' ? 'checked' : ''}>
                            <span class="wd-slider"></span>
                        </label>
                    </div>

                    <div class="wd-group">
                        <div class="wd-info">
                            <label>Kiểm tra kết nối Proxy</label>
                            <small>Khôi phục khi kết nối Proxy lỗi.</small>
                        </div>
                        <label class="wd-switch">
                            <input type="checkbox" id="wd-proxy" ${this.data.proxy_check === '1' ? 'checked' : ''}>
                            <span class="wd-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="wd-panel" style="animation: ssrFadeIn 0.4s ease-out;">
                    <div class="wd-panel-title">🕒 CÀI ĐẶT THỜI GIAN</div>
                    <div class="wd-grid">
                        <div class="wd-input-group">
                            <label>CHU KỲ KIỂM TRA</label>
                            <input type="number" id="wd-interval" class="wd-input" value="${this.data.interval || 30}">
                        </div>
                        <div class="wd-input-group">
                            <label>GIỚI HẠN CHỜ RỚT</label>
                            <input type="number" id="wd-dead" class="wd-input" value="${this.data.dead_period || 120}">
                        </div>
                    </div>
                </div>

                <button onclick="WatchdogModule.save()" class="wd-btn-primary">
                    Lưu & Áp dụng ngay
                </button>
            `;
        } else {
            innerContent = `
                <div class="wd-log-viewer" id="wd-log-content" style="animation: ssrFadeIn 0.3s ease-out;">Đang tải nhật ký...</div>
                <div style="font-size:10px; color:var(--text-sub); margin-top:10px; text-align:center; opacity: 0.7;">
                    • Tự động cập nhật mỗi 3s | Cuộn lên để dừng •
                </div>
            `;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; max-height: 85vh;">
                <div class="wd-tabs">
                    <div class="wd-tab ${this.activeTab === 'config' ? 'active' : ''}" onclick="WatchdogModule.switchTab('config')">Cấu hình</div>
                    <div class="wd-tab ${this.activeTab === 'logs' ? 'active' : ''}" onclick="WatchdogModule.switchTab('logs')">Nhật ký hoạt động</div>
                </div>
                ${innerContent}
            </div>
            <style>
                @keyframes ssrFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style>
        `;
    },

    save: function() {
        const mobile = document.getElementById('wd-mobile').checked ? '1' : '0';
        const proxy = document.getElementById('wd-proxy').checked ? '1' : '0';
        const interval = document.getElementById('wd-interval').value;
        const dead = document.getElementById('wd-dead').value;

        const btn = document.querySelector('.wd-btn-primary');
        if(btn) { btn.disabled = true; btn.innerHTML = 'Đang lưu...'; }

        fetch('/cgi-bin/system/watchdog', {
            method: 'POST',
            body: JSON.stringify({
                mobile_check: mobile, proxy_check: proxy,
                interval: interval, dead_period: dead,
                csrf_token: VWRT_API.csrfToken
            })
        })
        .then(res => res.json())
        .then(res => {
            if(res.status === 'success') {
                Toast.show("Đã cập nhật cấu hình!", "success");
                this.fetchConfig();
            }
        })
        .finally(() => { if(btn) { btn.disabled = false; btn.innerHTML = 'Lưu & Áp dụng ngay'; } });
    }
};
