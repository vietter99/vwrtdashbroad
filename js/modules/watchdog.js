const WatchdogModule = {
    data: {},

    showModal: function() {
        // Inject Styles nếu chưa có
        if (!document.getElementById('wd-style')) {
            const style = document.createElement('style');
            style.id = 'wd-style';
            style.innerHTML = `
                .wd-modal-body { padding: 5px; color: var(--text-main); }
                .wd-group { 
                    background: var(--bg-card); 
                    padding: 16px; 
                    border-radius: 14px; 
                    margin-bottom: 12px; 
                    border: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .wd-info { display: flex; flex-direction: column; gap: 2px; }
                .wd-info label { font-weight: 700; font-size: 14px; margin: 0; color: var(--text-main); }
                .wd-info small { color: var(--text-sub); font-size: 11px; }
                
                .wd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 5px; }
                .wd-input-group { display: flex; flex-direction: column; gap: 6px; }
                .wd-input-group label { font-size: 12px; font-weight: 600; color: var(--text-sub); margin-left: 4px; }
                .wd-input-group input { 
                    width: 100%; 
                    padding: 10px 12px; 
                    border: 1px solid var(--border-color); 
                    border-radius: 10px; 
                    background: var(--bg-body); 
                    color: var(--text-main); 
                    font-weight: 600;
                    outline: none;
                    box-sizing: border-box;
                }
                .wd-input-group input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(49,130,206,0.1); }
                
                .wd-save-btn {
                    width: 100%;
                    padding: 14px;
                    margin-top: 15px;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .wd-save-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                .wd-save-btn:active { transform: translateY(0); }
                .wd-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

                /* Switch Style */
                .wd-switch { position: relative; width: 44px; height: 24px; flex-shrink: 0; }
                .wd-switch input { opacity: 0; width: 0; height: 0; }
                .wd-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e0; transition: .3s; border-radius: 34px; }
                .wd-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
                input:checked + .wd-slider { background-color: #48bb78; }
                input:checked + .wd-slider:before { transform: translateX(20px); }
                input:disabled + .wd-slider { opacity: 0.5; cursor: not-allowed; }
            `;
            document.head.appendChild(style);
        }

        Modal.show({
            title: "⚙️ Tự động phục hồi mạng",
            content: `
                <div id="watchdog-container" style="padding-bottom: 10px;">
                    <div style="text-align:center; padding:40px;">
                        <div class="spinner"></div>
                        <p style="margin-top:10px; color:var(--text-sub);">Đang tải cấu hình...</p>
                    </div>
                </div>
            `,
            showCancel: false,
            confirmText: "Đóng"
        });

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

    render: function() {
        const container = document.getElementById('watchdog-container');
        if(!container) return;

        container.innerHTML = `
            <div class="wd-modal-content" style="display: flex; flex-direction: column; max-height: 80vh;">
                <!-- Vùng cuộn cho các input -->
                <div class="wd-scroll-area" style="overflow-y: auto; padding-right: 5px; flex: 1; padding-bottom: 15px;">
                    <div class="wd-group">
                        <div class="wd-info">
                            <label>Kiểm tra Mạng Di động (4G/5G)</label>
                            <small>Tự động khôi phục kết nối khi rớt mạng.</small>
                        </div>
                        <label class="wd-switch">
                            <input type="checkbox" id="wd-mobile" ${this.data.mobile_check === '1' ? 'checked' : ''}>
                            <span class="wd-slider"></span>
                        </label>
                    </div>

                    <div class="wd-group">
                        <div class="wd-info">
                            <label>Kiểm tra kết nối Proxy</label>
                            <small>Restart Proxy khi 5G ngon mà Proxy lỗi.</small>
                        </div>
                        <label class="wd-switch">
                            <input type="checkbox" id="wd-proxy" ${this.data.proxy_check === '1' ? 'checked' : ''}>
                            <span class="wd-slider"></span>
                        </label>
                    </div>

                    <div class="wd-grid">
                        <div class="wd-input-group">
                            <label>Chu kỳ kiểm tra (s)</label>
                            <input type="number" id="wd-interval" value="${this.data.interval || 30}">
                        </div>
                        <div class="wd-input-group">
                            <label>Giới hạn rớt mạng (s)</label>
                            <input type="number" id="wd-dead" value="${this.data.dead_period || 120}">
                        </div>
                    </div>
                </div>

                <!-- Nút bấm ghim cố định ở dưới -->
                <div class="wd-footer" style="padding-top: 10px; border-top: 1px solid var(--border-color);">
                    <button onclick="WatchdogModule.save()" class="wd-save-btn" style="background: #3182ce !important; display: block !important; visibility: visible !important;">
                        Lưu & Áp dụng ngay
                    </button>
                </div>
            </div>
        `;
    },


    save: function() {
        const mobile = document.getElementById('wd-mobile').checked ? '1' : '0';
        const proxy = document.getElementById('wd-proxy').checked ? '1' : '0';
        const interval = document.getElementById('wd-interval').value;
        const dead = document.getElementById('wd-dead').value;

        const btn = document.querySelector('.wd-save-btn');
        if(btn) {
            btn.disabled = true;
            btn.innerHTML = 'Đang xử lý...';
        }

        fetch('/cgi-bin/system/watchdog', {
            method: 'POST',
            body: JSON.stringify({
                mobile_check: mobile,
                proxy_check: proxy,
                interval: interval,
                dead_period: dead,
                csrf_token: VWRT_API.csrfToken
            })
        })
        .then(res => res.json())
        .then(res => {
            if(res.status === 'success') {
                Toast.show("Đã cập nhật cấu hình Watchdog!", "success");
                this.fetchConfig();
            } else {
                Toast.show("Lỗi: " + res.message, "error");
            }
        })
        .catch(err => {
            console.error(err);
            Toast.show("Lỗi kết nối", "error");
        })
        .finally(() => {
            if(btn) {
                btn.disabled = false;
                btn.innerHTML = 'Lưu & Áp dụng ngay';
            }
        });
    }
};



