const TailscaleModule = {
    intervalId: null,
    currentTab: 'general',

    showModal: function() {
        Modal.show({
            title: "Tailscale VPN",
            content: `
                <div id="ts-modal-container" style="min-height: 450px; display: flex; flex-direction: column; font-family: 'Inter', sans-serif;">
                     <div style="text-align: center; padding: 60px; color: #a0aec0;">
                        <div class="spinner" style="margin-bottom: 20px;"></div>
                        <div style="font-weight: 500;">Đang kết nối đến router...</div>
                    </div>
                </div>
                <!-- Premium Styles Injection -->
                <style>
                    /* Tabs */
                    .ts-tabs { display: flex; background: #f1f5f9; padding: 5px; border-radius: 12px; margin-bottom: 25px; }
                    .ts-tab { flex: 1; text-align: center; padding: 10px; cursor: pointer; border-radius: 8px; font-weight: 600; color: #64748b; transition: all 0.3s ease; font-size: 14px; }
                    .ts-tab.active { background: white; color: #3b82f6; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                    
                    /* Controls */
                    .ts-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin-bottom: 15px; }
                    
                    /* Toggle Switch */
                    .toggle-switch { position: relative; width: 50px; height: 28px; }
                    .toggle-switch input { opacity: 0; width: 0; height: 0; }
                    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
                    .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
                    input:checked + .slider { background-color: #3b82f6; }
                    input:checked + .slider:before { transform: translateX(22px); }
                    
                    /* Inputs */
                    .ts-input-group { position: relative; margin-top: 5px; }
                    .ts-input { width: 100%; padding: 12px 15px; padding-left: 45px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 15px; transition: border-color 0.2s; box-sizing: border-box; }
                    .ts-input:focus { border-color: #3b82f6; outline: none; }
                    .ts-input-icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                    
                    /* Buttons */
                    .btn-save { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 12px 0; width: 100%; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; margin-top: 10px; transition: transform 0.1s; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3); }
                    .btn-save:active { transform: scale(0.98); }

                    /* Peer Grid */
                    .peer-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
                    .peer-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; display: flex; align-items: center; gap: 15px; transition: transform 0.2s, border-color 0.2s; }
                    .peer-card:hover { transform: translateY(-2px); border-color: #cbd5e1; background: white; box-shadow: 0 4px 6px -2px rgba(0,0,0,0.05); }
                    
                    /* Spinner */
                    .spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

                    /* Theme Vars Default (Light) */
                    .ts-body { padding: 25px 30px; background: white; color: #1e293b; }
                    .ts-footer { background: #f8fafc; padding: 15px 30px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; color: #1e293b; }
                    .ts-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin-bottom: 15px; }
                    .ts-alert { display:flex; align-items:center; gap:15px; margin-bottom:25px; padding: 20px; border-radius: 12px; border: 1px solid transparent; }
                    .ts-alert-success { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
                    .ts-alert-warning { background: #fff7ed; border-color: #fed7aa; color: #9a3412; }
                    .ts-alert-error { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
                    .ts-label-main { font-weight: 700; color: #1e293b; font-size: 16px; margin-bottom: 4px; }
                    .ts-label-sub { font-size: 13px; color: #64748b; }

                    /* Dark Mode Overrides */
                    [data-theme="dark"] .ts-body { background: #1a202c; color: #e2e8f0; }
                    [data-theme="dark"] .ts-footer { background: #2d3748; border-color: #4a5568; color: #e2e8f0; }
                    [data-theme="dark"] .ts-tabs { background: #2d3748; }
                    [data-theme="dark"] .ts-tab { color: #a0aec0; }
                    [data-theme="dark"] .ts-tab.active { background: #4a5568; color: #63b3ed; }
                    [data-theme="dark"] .ts-card, 
                    [data-theme="dark"] .peer-card { background: #2d3748; border-color: #4a5568; color: #e2e8f0; }
                    [data-theme="dark"] .peer-card:hover { background: #4a5568; border-color: #cbd5e1; }
                    [data-theme="dark"] .ts-input { background: #2d3748; border-color: #4a5568; color: white; }
                    [data-theme="dark"] .slider { background-color: #4a5568; }
                    [data-theme="dark"] input:checked + .slider { background-color: #4299e1; }
                    [data-theme="dark"] #ts-modal-container { background: #1a202c; color: #e2e8f0; }
                    [data-theme="dark"] .ts-label-main { color: #e2e8f0; }
                    [data-theme="dark"] .ts-label-sub { color: #cbd5e0; }
                    [data-theme="dark"] .ts-alert-success { background: rgba(6, 95, 70, 0.4); border-color: #065f46; color: #6ee7b7; }
                    [data-theme="dark"] .ts-alert-warning { background: rgba(154, 52, 18, 0.4); border-color: #9a3412; color: #fdba74; }
                    [data-theme="dark"] .ts-alert-error { background: rgba(153, 27, 27, 0.4); border-color: #991b1b; color: #fca5a5; }
                    [data-theme="dark"] .ts-input-icon { color: #a0aec0; }
                    [data-theme="dark"] .modal-overlay { background: rgba(0,0,0,0.8); }
                    [data-theme="dark"] .spinner { border-color: #4a5568; border-top-color: #63b3ed; }

                    /* New Classes for Dark Mode Fixes */
                    .ts-card-self { background: linear-gradient(to right, #ffffff, #f8fafc); border-left: 5px solid #3b82f6; }
                    .ts-icon-box { background: #eff6ff; color: #3b82f6; }
                    .ts-text-primary { color: #1e293b; }
                    .ts-text-secondary { color: #94a3b8; }
                    
                    [data-theme="dark"] .ts-card-self { background: linear-gradient(to right, #2d3748, #232936); border-color: #4299e1; }
                    [data-theme="dark"] .ts-icon-box { background: #4a5568; color: #90cdf4; }
                    [data-theme="dark"] .ts-text-primary { color: #e2e8f0; }
                    [data-theme="dark"] .ts-text-secondary { color: #cbd5e0; }
                </style>
            `,
            showCancel: false,
            confirmText: "", // Hide default close
            onConfirm: () => { this.stopAutoRefresh(); }
        });
        
        // Custom Close Button Logic
        setTimeout(() => {
            const footer = document.querySelector('.modal-actions');
            if(footer) footer.style.display = 'none'; // Hide default footer
             
            // Add custom close X if needed, or rely on top right X
        }, 50);

        // Customize Modal Size
        const mBox = document.querySelector('.modal-box');
        if (mBox) {
            mBox.style.maxWidth = "800px";
            mBox.style.borderRadius = "20px";
            mBox.style.overflow = "hidden";
        }

        // Hook refresh stop
         const closeBtn = document.querySelector('.modal-close');
        if(closeBtn) {
            const oldClick = closeBtn.onclick;
            closeBtn.onclick = () => {
                this.stopAutoRefresh();
                if(oldClick) oldClick();
            };
        }

        this.fetchStatus();
        this.startAutoRefresh();
    },

    startAutoRefresh: function() {
        if(this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => this.fetchStatus(true), 5000);
    },

    stopAutoRefresh: function() {
        if(this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    },

    fetchStatus: function(isRefresh = false) {
        if(isRefresh && this.isEditing) return;

        fetch('/cgi-bin/tailscale/status')
            .then(res => res.json())
            .then(data => {
                this.render(data, isRefresh);
            })
            .catch(err => console.error(err));
    },

    render: function(data, isRefresh) {
        const container = document.getElementById('ts-modal-container');
        if (!container) return; // Modal closed

        if(isRefresh && document.querySelector('.ts-tabs')) {
             this.renderContent(data);
             return;
        }

        const html = `
            <div class="ts-body">
                <div class="ts-tabs">
                    <div class="ts-tab ${this.currentTab === 'general' ? 'active' : ''}" onclick="TailscaleModule.switchTab('general')">
                        <span style="margin-right:6px">⚙️</span> Cài đặt
                    </div>
                    <div class="ts-tab ${this.currentTab === 'info' ? 'active' : ''}" onclick="TailscaleModule.switchTab('info')">
                        <span style="margin-right:6px">📊</span> Thông tin
                    </div>
                </div>
                <div id="ts-tab-content"></div>
            </div>
            <div class="ts-footer">
                 <button onclick="document.querySelector('.modal-overlay').remove(); TailscaleModule.stopAutoRefresh();" style="padding: 10px 25px; background: transparent; border: 1px solid currentColor; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Đóng</button>
            </div>
        `;
        
        container.innerHTML = html;
        this.lastData = data; 
        this.renderContent(data);
    },
    
    switchTab: function(tabName) {
        this.currentTab = tabName;
        document.querySelectorAll('.ts-tab').forEach(btn => {
            if(btn.innerText.includes(tabName === 'general' ? 'Cài đặt' : 'Thông tin')) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        if(this.lastData) this.renderContent(this.lastData);
    },

    renderContent: function(data) {
        const contentDiv = document.getElementById('ts-tab-content');
        if(!contentDiv) return;

        if (this.currentTab === 'general') {
            this.renderGeneralTab(contentDiv, data);
        } else {
            this.renderInfoTab(contentDiv, data);
        }
    },

    renderGeneralTab: function(container, data) {
        const isRunning = data.running;
        const needsLogin = data.needs_login;
        const conf = data.config || {};
        
        let headerBrand = '';
        if(isRunning && !needsLogin) {
             headerBrand = `
                <div class="ts-alert ts-alert-success">
                    <div style="width:12px; height:12px; background:#10b981; border-radius:50%; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);"></div>
                    <div style="font-weight:700; font-size: 16px;">Tailscale đang hoạt động</div>
                </div>`;
        } else if (needsLogin) {
             headerBrand = `
                <div class="ts-alert ts-alert-warning">
                    <div style="width:12px; height:12px; background:#f97316; border-radius:50%; box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.2);"></div>
                    <div style="font-weight:700; font-size: 16px;">Yêu cầu đăng nhập</div>
                </div>`;
        } else {
             headerBrand = `
                <div class="ts-alert ts-alert-error">
                    <div style="width:12px; height:12px; background:#ef4444; border-radius:50%; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);"></div>
                    <div style="font-weight:700; font-size: 16px;">Dịch vụ đang tắt</div>
                </div>`;
        }

        // Prepare User Info if available
        let loginStatusHtml = '';
        if (isRunning && !needsLogin && data.status && data.status.Self && data.status.User) {
            
            // Fix: UserID from Lua/cjson might be a float (scientific notation), mismatching the String key.
            // We search by matching the ID value inside the profile instead.
            const selfUserId = data.status.Self.UserID;
            const userProfile = Object.values(data.status.User).find(u => u.ID === selfUserId);

            const displayName = userProfile ? userProfile.DisplayName : 'Unknown';
            const loginName = userProfile ? userProfile.LoginName : '';
            
            loginStatusHtml = `
                <div class="ts-card" style="margin-top: 15px; border-left: 5px solid #10b981;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div class="ts-label-main">Login Status</div>
                            <div class="ts-label-sub" style="color: #059669; font-weight: 700; font-size: 15px;">
                                ${displayName}
                            </div>
                            <div style="font-size: 12px; color: #64748b;">${loginName}</div>
                        </div>
                        <button onclick="TailscaleModule.logout()" style="color: #ef4444; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); padding: 8px 15px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; transition: all 0.2s;">
                            Log out and Unbind
                        </button>
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            ${headerBrand}
            
            <div class="ts-card">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px;">
                    <div>
                        <div class="ts-label-main">Trạng thái VPN</div>
                        <div class="ts-label-sub">Bật/Tắt kết nối Tailscale</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="ts-enable" ${conf.enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between;">
                     <div>
                        <div class="ts-label-main">Cổng kết nối (Port)</div>
                        <div class="ts-label-sub">Mặc định: 41641</div>
                    </div>
                    <div style="width: 140px;">
                        <div class="ts-input-group" style="margin-top: 0;">
                            <div class="ts-input-icon" style="left: 10px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                            </div>
                            <input type="number" id="ts-port" class="ts-input" value="${conf.port || 41641}" style="padding: 8px 10px 8px 34px; font-weight: 600; text-align: center;">
                        </div>
                    </div>
                </div>
            </div>
            
            ${loginStatusHtml}

            <button onclick="TailscaleModule.saveConfig()" class="btn-save">
                Lưu thay đổi
            </button>
            
            ${needsLogin ? `
                <div style="margin-top: 15px; text-align: center;">
                    <span style="font-size: 13px; color: #64748b;">Hoặc</span>
                    <button onclick="TailscaleModule.getAuthUrl()" style="display: block; width: 100%; margin-top: 10px; padding: 12px; background: transparent; border: 2px solid #fdba74; color: #ea580c; border-radius: 10px; font-weight: 700; cursor: pointer;">
                        🔐 Lấy link đăng nhập
                    </button>
                </div>
            ` : ''}
        `;

        // Input listeners
        const inputs = container.querySelectorAll('input');
        inputs.forEach(inp => {
            inp.addEventListener('focus', () => { this.isEditing = true; });
            inp.addEventListener('blur', () => { this.isEditing = false; });
        });
    },

    renderInfoTab: function(container, data) {
        const self = (data.status && data.status.Self) || {};
        const peers = (data.status && data.status.Peer) || {};
        const isRunning = data.running;

        if(!isRunning) {
            container.innerHTML = `
                <div style="text-align:center; padding: 60px 20px;">
                    <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;">💤</div>
                    <h3 style="color: #475569;">Dịch vụ đang ngủ</h3>
                    <p style="color: #94a3b8; margin-bottom: 20px;">Vui lòng bật VPN ở tab Cài đặt để xem thông tin mạng.</p>
                </div>`;
            return;
        }

        // Self Info Card
        let html = `
            <div class="ts-card ts-card-self">
                <div style="display: flex; gap: 20px; align-items: center;">
                     <div class="ts-icon-box" style="width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                     </div>
                     <div>
                        <div class="ts-text-secondary" style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Thiết bị này</div>
                        <div class="ts-text-primary" style="font-size: 18px; font-weight: 800;">${self.HostName || 'Unknown'}</div>
                        <div style="font-family: 'Consolas', monospace; color: #3b82f6; font-size: 14px; margin-top: 2px;">${(self.TailscaleIPs || [])[0] || '-'}</div>
                     </div>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 5px;">
                <div class="ts-text-primary" style="font-weight: 700;">Danh sách thiết bị (${Object.keys(peers).length})</div>
                <div class="ts-text-secondary" style="font-size: 12px;">Trạng thái cập nhật mỗi 5s</div>
            </div>

            <div class="peer-grid">
        `;
        
        const peerList = Object.values(peers).sort((a,b) => (a.Online === b.Online) ? 0 : a.Online ? -1 : 1);
        
        if(peerList.length === 0) {
             html += `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: #cbd5e1; border: 2px dashed #e2e8f0; border-radius: 12px;">Chưa có thiết bị nào kết nối</div>`;
        } else {
            peerList.forEach(peer => {
                html += `
                    <div class="peer-card">
                        <div style="position: relative;">
                            <div style="width: 40px; height: 40px; background: ${peer.Online ? '#dcfce7' : '#f1f5f9'}; color: ${peer.Online ? '#166534' : '#64748b'}; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                                ${peer.OS ? peer.OS.substring(0,2).toUpperCase() : '??'}
                            </div>
                            <div style="position: absolute; bottom: -2px; right: -2px; width: 12px; height: 12px; background: ${peer.Online ? '#22c55e' : '#cbd5e1'}; border: 2px solid white; border-radius: 50%;"></div>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div class="ts-text-primary" style="font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${peer.HostName}">${peer.HostName}</div>
                            <div class="ts-text-secondary" style="font-size: 11px; font-family: monospace;">${(peer.TailscaleIPs || [])[0] || ''}</div>
                        </div>
                    </div>
                `;
            });
        }

        html += `</div>`;
        container.innerHTML = html;
    },
    
    logout: function() {
        Modal.confirm({
            title: 'Gỡ tài khoản / Unbind',
            message: 'Hành động này sẽ:<br>1. Ngắt kết nối Tailscale.<br>2. Xóa VĨNH VIỄN trạng thái đăng nhập.<br>3. Xóa toàn bộ cấu hình mạng liên quan.<br><br><b>Bạn có chắc chắn muốn tiếp tục?</b>',
            type: 'warning',
            confirmText: 'Xác nhận gỡ',
            cancelText: 'Hủy bỏ',
            onConfirm: () => {
                if(typeof Toast !== 'undefined') Toast.show("Đang gỡ tài khoản và dọn dẹp...", "info");
                
                fetch('/cgi-bin/tailscale/action', {
                    method: 'POST',
                    body: JSON.stringify({ action: 'logout' })
                })
                .then(res => res.json())
                .then(data => {
                    if(data.status === 'success') {
                        if(typeof Toast !== 'undefined') Toast.show("Đã gỡ tài khoản thành công!", "success");
                        // Refresh status to update UI
                        this.fetchStatus(true);
                    } else {
                         if(typeof Toast !== 'undefined') Toast.show("Lỗi: " + data.message, "error");
                    }
                })
                .catch(err => {
                    console.error(err);
                    if(typeof Toast !== 'undefined') Toast.show("Lỗi kết nối", "error");
                });
            }
        });
    },

    saveConfig: function() {
        // ... (Keep existing logic)
        const enabled = document.getElementById('ts-enable').checked;
        const port = document.getElementById('ts-port').value;
        
        const btn = document.querySelector('.btn-save');
        if(btn) {
            btn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px; border-top-color: white; margin: 0 auto;"></div>';
            btn.disabled = true;
        }

        if(typeof Toast !== 'undefined') Toast.show("Đang lưu...", "info");
        
        fetch('/cgi-bin/tailscale/action', {
            method: 'POST',
            body: JSON.stringify({
                action: 'save_config',
                enabled: enabled,
                port: port
            })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                if(typeof Toast !== 'undefined') Toast.show("Thành công!", "success");
                this.fetchStatus(true);
            } else {
                 if(typeof Toast !== 'undefined') Toast.show("Lỗi: " + data.message, "error");
            }
        })
        .finally(() => {
             if(btn) {
                 btn.innerHTML = 'Lưu cấu hình & Áp dụng';
                 btn.disabled = false;
             }
        });
    },

    getAuthUrl: function() {
        // Check if we already have a URL in the last data
        if(this.lastData && this.lastData.status && this.lastData.status.AuthURL) {
            window.open(this.lastData.status.AuthURL, '_blank');
            return;
        }

        const btn = event?.currentTarget;
        const originalText = btn ? btn.innerHTML : '🔐 Lấy link đăng nhập';
        if(btn) {
            btn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px; border-top-color: white; margin: 0 auto;"></div>';
            btn.disabled = true;
        }

         fetch('/cgi-bin/tailscale/action', {
            method: 'POST',
            body: JSON.stringify({ action: 'get_auth_url' })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success' && data.url) {
                // Show a nice modal or open directly?
                // For now open new tab + Toast
                window.open(data.url, '_blank');
                 if(typeof Toast !== 'undefined') Toast.show("Đang mở trang đăng nhập...", "success");
            } else {
                if(typeof Toast !== 'undefined') {
                    Toast.show("Không thể lấy link. Vui lòng thử lại.", "error");
                } else {
                    alert("Không thể lấy link. Vui lòng thử lại.");
                }
            }
        })
        .finally(() => {
             if(btn) {
                 btn.innerHTML = originalText;
                 btn.disabled = false;
             }
        });
    }
};
