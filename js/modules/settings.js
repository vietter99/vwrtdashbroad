const SettingsModule = {
    confirmAction: null, 
    updateData: null,

    init: function() {
        const container = document.getElementById('settings-popup-content');
        if (container) {
            this.checkUpdateSilent(); 
            this.renderTemplate(container);
        }
    },

    checkUpdateSilent: function() {
        fetch('/cgi-bin/system/update_check')
            .then(res => res.json())
            .then(data => {
                this.updateData = data;
                const statusText = document.getElementById('update-status-text');
                const btn = document.getElementById('btn-check-update');
                
                if (data.has_update || data.has_update_fw) {
                    if(statusText) {
                        statusText.innerHTML = `<span style="width:6px; height:6px; background:#e53e3e; border-radius:50%; box-shadow:0 0 5px #e53e3e;"></span> <span style="color:#c53030; font-weight:700;">Có bản mới!</span>`;
                    }
                    if(btn) {
                        btn.style.color = "#e53e3e";
                        btn.style.animation = "pulse 1.5s infinite";
                    }
                } else {
                    // Already set to stable state by default
                }
            })
            .catch(() => {});
    },

    renderTemplate: function(container) {
        const luciPath = `${window.location.protocol}//${window.location.hostname}/cgi-bin/luci`;

        container.innerHTML = `
            <div class="settings-menu" style="background:transparent; padding:5px; gap:15px; color:var(--text-main);">
                
                <!-- 1. SYSTEM STATUS CARD (Mint accent, theme aware) -->
                <div id="sys-status-card" class="setting-card" style="background:var(--card-status-bg, linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%)); border:1px solid var(--card-status-border, #81e6d9); border-radius:12px; padding:15px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <div>
                        <div style="font-size:10px; font-weight:700; color:var(--card-status-label, #2c7a7b); text-transform:uppercase; letter-spacing:0.5px;">Hệ thống & Cập nhật</div>
                        <div style="font-size:15px; font-weight:800; color:var(--card-status-text, #234e52); margin-top:2px;" id="cur-ver-text">Đang tải...</div>
                        <div style="font-size:11px; color:var(--card-status-sub, #285e61); margin-top:2px; display:flex; align-items:center; gap:4px;" id="update-status-text">
                            <span style="width:6px; height:6px; background:#38b2ac; border-radius:50%;"></span> Hệ thống ổn định
                        </div>
                    </div>
                    <button id="btn-check-update" onclick="SettingsModule.showUpdatePopup()" style="width:40px; height:40px; border-radius:10px; background:var(--bg-card); border:none; color:#319795; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.05); transition:transform 0.2s;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
                    </button>
                </div>

                <!-- 2. QUICK ACTIONS GRID -->
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <!-- Restart Mobile -->
                    <div class="action-card" onclick="SettingsModule.restartMobileService()" style="background:var(--bg-card); padding:12px; border-radius:12px; border:1px solid var(--border-color); cursor:pointer; transition:0.2s; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center;">
                        <div style="width:36px; height:36px; background:rgba(49, 130, 206, 0.1); border-radius:10px; color:#3182ce; display:flex; align-items:center; justify-content:center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        </div>
                        <span style="font-size:11px; font-weight:600; color:var(--text-sub);">Reset Mạng</span>
                    </div>

                    <!-- Change Pass -->
                    <div class="action-card" onclick="SettingsModule.showPasswordModal()" style="background:var(--bg-card); padding:12px; border-radius:12px; border:1px solid var(--border-color); cursor:pointer; transition:0.2s; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center;">
                        <div style="width:36px; height:36px; background:rgba(128, 90, 213, 0.1); border-radius:10px; color:#805ad5; display:flex; align-items:center; justify-content:center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div>
                        <span style="font-size:11px; font-weight:600; color:var(--text-sub);">Đổi Mật Khẩu</span>
                    </div>

                    <!-- LuCI -->
                    <a href="${luciPath}" target="_blank" class="action-card" onclick="SettingsModule.closePopup()" style="text-decoration:none; background:var(--bg-card); padding:12px; border-radius:12px; border:1px solid var(--border-color); cursor:pointer; transition:0.2s; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center;">
                        <div style="width:36px; height:36px; background:rgba(74, 85, 104, 0.1); border-radius:10px; color:var(--text-sub); display:flex; align-items:center; justify-content:center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        <span style="font-size:11px; font-weight:600; color:var(--text-sub);">Cài đặt nâng cao</span>
                    </a>

                    <!-- Reboot -->
                    <div class="action-card" onclick="SettingsModule.confirmReboot()" style="background:var(--bg-card); padding:12px; border-radius:12px; border:1px solid var(--border-color); cursor:pointer; transition:0.2s; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center;">
                        <div style="width:36px; height:36px; background:rgba(237, 137, 54, 0.1); border-radius:10px; color:#ed8936; display:flex; align-items:center; justify-content:center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                        </div>
                        <span style="font-size:11px; font-weight:600; color:var(--text-sub);">Restart</span>
                    </div>
                </div>

                <!-- 3. DANGER ZONE -->
                <div onclick="SettingsModule.confirmReset()" style="margin-top:5px; background:rgba(229, 62, 62, 0.05); border:1px dashed var(--danger, #fc8181); border-radius:12px; padding:10px; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span style="font-size:11px; font-weight:700; color:#e53e3e;">Khôi phục cài đặt gốc</span>
                </div>

                <style>
                    /* Dynamic theme variables for the Status Card */
                    [data-theme="dark"] #sys-status-card {
                        --card-status-bg: linear-gradient(135deg, #1a3a3a 0%, #234e52 100%);
                        --card-status-border: #285e61;
                        --card-status-label: #81e6d9;
                        --card-status-text: #e6fffa;
                        --card-status-sub: #b2f5ea;
                    }
                </style>
            </div>
        `;
        
        fetch('/cgi-bin/system/version').then(r=>r.json()).then(v=>{
            const el = document.getElementById('cur-ver-text');
            if(el) el.innerText = `Dashboard v${v.dashboard.version}`;
        }).catch(()=>{});

        // Add hover effect via JS
        setTimeout(() => {
            document.querySelectorAll('.action-card').forEach(card => {
                card.onmouseover = () => { 
                    card.style.transform = "translateY(-2px)"; 
                    card.style.boxShadow = "var(--shadow)"; 
                    card.style.borderColor = "var(--blue-500, #3182ce)"; 
                };
                card.onmouseout = () => { 
                    card.style.transform = "none"; 
                    card.style.boxShadow = "none"; 
                    card.style.borderColor = "var(--border-color)"; 
                };
            });
        }, 100);
    },

    showUpdatePopup: function() {
        if (!this.updateData || (!this.updateData.has_update && !this.updateData.has_update_fw)) {
            if(typeof Toast !== 'undefined') Toast.show("Hệ thống đang ở phiên bản mới nhất!", "success");
            return;
        }

        const rem = this.updateData.latest;
        const cur = this.updateData.current;
        let htmlContent = `<div style="text-align:left; font-size:13px; color:var(--text-main);">`;

        if (this.updateData.has_update) {
            htmlContent += `
                <div style="background:var(--success-bg, rgba(72, 187, 120, 0.1)); padding:10px; border-radius:8px; border:1px solid var(--success-border, #48bb78); margin-bottom:10px;">
                    <div style="font-weight:bold; color:var(--success-text, #276749);">Dashboard Mới: ${rem.dashboard.version}</div>
                    <div style="color:var(--text-sub); margin-bottom:5px;">Hiện tại: ${cur.dashboard.version}</div>
                    <pre style="background:var(--bg-body); color:var(--text-main); padding:8px; font-size:11px; white-space:pre-wrap; border-radius:6px; border:1px solid var(--border-color);">${rem.dashboard.log}</pre>
                    <button onclick="SettingsModule.doUpdate('dashboard', '${rem.dashboard.url}', '${rem.dashboard.version}')" class="btn-modal btn-primary" style="width:100%; margin-top:10px;">Cập nhật Giao diện</button>
                </div>
            `;
        }

        if (this.updateData.has_update_fw) {
            htmlContent += `
                <div style="background:var(--danger-bg, rgba(229, 62, 62, 0.1)); padding:10px; border-radius:8px; border:1px solid var(--danger-border, #feb2b2);">
                    <div style="font-weight:bold; color:var(--danger-text, #c53030);">Firmware Mới: ${rem.firmware.version}</div>
                    <div style="color:var(--text-sub); margin-bottom:5px;">Hiện tại: ${cur.firmware.version}</div>
                    <pre style="background:var(--bg-body); color:var(--text-main); padding:8px; font-size:11px; white-space:pre-wrap; border-radius:6px; border:1px solid var(--border-color);">${rem.firmware.log}</pre>
                    <button onclick="SettingsModule.doUpdate('firmware', '${rem.firmware.url}', '${rem.firmware.version}')" class="btn-modal btn-primary" style="width:100%; margin-top:10px; background:#e53e3e;">Cập nhật Firmware</button>
                </div>
            `;
        }
        
        htmlContent += `</div>`;

        // SINGLETON: Clean up old modals
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

        const modalHtml = `
            <div class="modal-overlay active" id="modal-update" style="z-index:99999;">
                <div class="modal-box" style="max-width:400px; background:var(--bg-card); color:var(--text-main);">
                    <h3 style="color:var(--text-main);">Có bản cập nhật mới</h3>
                    ${htmlContent}
                    <div class="modal-actions">
                        <button class="btn-modal btn-secondary" onclick="document.getElementById('modal-update').remove()">Đóng</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    doUpdate: function(type, url, ver) {
        const updateModal = document.getElementById('modal-update');
        if(updateModal) updateModal.remove();

        if(typeof Modal !== 'undefined') {
            Modal.confirm(
                "Xác nhận Cập nhật", 
                `Bạn có chắc chắn muốn cập nhật <b>${type.toUpperCase()}</b> lên phiên bản <b>${ver}</b>?<br><br><span style="color:red; font-size:12px;">⚠ Lưu ý: Không tắt nguồn thiết bị trong quá trình cập nhật.</span>`, 
                () => {
                    this.executeUpdateFetch(type, url, ver);
                }
            );
        } else {
            if(confirm(`Cập nhật ${type} lên bản ${ver}?`)) {
                this.executeUpdateFetch(type, url, ver);
            }
        }
    },

    executeUpdateFetch: function(type, url, ver) {
        if(typeof Toast !== 'undefined') Toast.show("Đang tải và cài đặt...", "info");

        // Prepare Payload & Headers
        const payload = { type: type, url: url, version: ver };
        const headers = { 'Content-Type': 'application/json' };
        
        if(typeof VWRT_API !== 'undefined' && VWRT_API.csrfToken) {
            payload.csrf_token = VWRT_API.csrfToken;
            headers['X-CSRF-Token'] = VWRT_API.csrfToken;
        }

        fetch('/cgi-bin/system/update_run', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                if(typeof Toast !== 'undefined') Toast.show(data.message, "success");
                if (type === 'dashboard') setTimeout(() => location.reload(), 3000);
            } else {
                if(typeof Toast !== 'undefined') Toast.show("Lỗi: " + data.message, "error");
            }
        })
        .catch(() => {
            if(typeof Toast !== 'undefined') Toast.show("Lỗi kết nối Server", "error");
        });
    },

    closePopup: function() {
        const popup = document.getElementById('settings-popup-content');
        if (popup) popup.classList.add('hidden');
    },

    confirmReboot: function() {
        this.closePopup();
        if(typeof Modal !== 'undefined') {
            Modal.confirm("Khởi động lại", "Bạn có chắc chắn muốn khởi động lại Router?", () => {
                this.sendAction('reboot');
            });
        } else if(confirm("Bạn có chắc chắn muốn khởi động lại?")) {
            this.sendAction('reboot');
        }
    },

    confirmReset: function() {
        this.closePopup();
        if(typeof Modal !== 'undefined') {
            Modal.confirm("Khôi phục gốc", "CẢNH BÁO: Tất cả dữ liệu sẽ bị xóa sạch. Bạn có chắc chắn không?", () => {
                this.sendAction('reset');
            });
        } else if(confirm("CẢNH BÁO: Xóa sạch dữ liệu?")) {
            this.sendAction('reset');
        }
    },

    sendAction: function(action, param = "") {
        if (typeof Toast !== 'undefined') Toast.show("Đang xử lý...", "info");
        
        // Prepare Payload & Headers
        const payload = { action: action, param: param };
        const headers = { 'Content-Type': 'application/json' };
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
            .then(data => {
                if (data.status === 'success') {
                    if (typeof Toast !== 'undefined') Toast.show(data.message, "success");
                    if (action === 'reboot' || action === 'reset') setTimeout(() => { location.reload(); }, 25000);
                } else {
                    if (typeof Toast !== 'undefined') Toast.show("Lỗi: " + data.message, "error");
                }
            });
    },

    showPasswordModal: function() {
        this.closePopup();
        // SINGLETON: Clean up old modals
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

        const html = `
            <div class="modal-overlay active" id="modal-passwd" style="z-index:99999;">
                <div class="modal-box" style="max-width:350px; background:var(--bg-card); color:var(--text-main);">
                    <h3 style="color:var(--text-main);">Đổi mật khẩu Admin</h3>
                    <div style="text-align:left; margin:15px 0;">
                        <label style="font-size:12px; font-weight:bold; color:var(--text-sub);">Mật khẩu mới:</label>
                        <input type="password" id="new-pass" placeholder="Nhập pass mới..." style="width:100%; padding:10px; margin-top:5px; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-body); color:var(--text-main); outline:none;">
                    </div>
                    <div class="modal-actions">
                        <button class="btn-modal btn-secondary" onclick="document.getElementById('modal-passwd').remove()">Hủy</button>
                        <button class="btn-modal btn-primary" onclick="SettingsModule.doChangePassword()">Lưu thay đổi</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        setTimeout(() => document.getElementById('new-pass').focus(), 100);
    },

    restartMobileService: function() {
        // Anti-spam check (30s cooldown)
        const lastClick = localStorage.getItem('last_mobile_restart');
        const now = Date.now();
        if (lastClick && (now - lastClick < 30000)) {
            const remain = Math.ceil((30000 - (now - lastClick)) / 1000);
            if(typeof Toast !== 'undefined') Toast.show(`Vui lòng đợi ${remain}s trước khi thử lại!`, "warning");
            return;
        }

        this.closePopup();
        
        // Rate limiting: Prevent spam (minimum 60 seconds between restarts)
        const lastRestart = parseInt(localStorage.getItem('last_mobile_restart') || 0);
        const timeSinceLastRestart = Date.now() - lastRestart;
        const minInterval = 60000; // 60 seconds
        
        if (timeSinceLastRestart < minInterval) {
            const remainingSeconds = Math.ceil((minInterval - timeSinceLastRestart) / 1000);
            if(typeof Toast !== 'undefined') {
                Toast.show(`⏱️ Vui lòng đợi ${remainingSeconds} giây nữa trước khi khởi động lại.`, "warning");
            } else {
                alert(`Vui lòng đợi ${remainingSeconds} giây nữa.`);
            }
            return;
        }
        
        if(typeof Modal !== 'undefined') {
            Modal.confirm(
                "Khởi động lại kết nối 4G/5G",
                "Hành động này sẽ tạm ngắt và kết nối lại mạng di động (mất khoảng 15 giây).<br>Bạn có chắc chắn không?",
                () => {
                    this.doRestartMobile();
                }
            );
        } else if(confirm("Khởi động lại kết nối (mất 15s)?")) {
            this.doRestartMobile();
        }
    },

    doRestartMobile: function() {
        localStorage.setItem('last_mobile_restart', Date.now());
        this.sendAction('restart_mobile');
    },

    doChangePassword: function() {
        const pass = document.getElementById('new-pass').value;
        if (!pass || pass.length < 1) {
            if(typeof Toast !== 'undefined') Toast.show("Vui lòng nhập mật khẩu!", "warning");
            return;
        }

        if(typeof Toast !== 'undefined') Toast.show("Đang đổi mật khẩu...", "info");
        document.getElementById('modal-passwd').remove();

        const payload = { username: "root", password: pass };
        const headers = { 'Content-Type': 'application/json' };
        if(typeof VWRT_API !== 'undefined' && VWRT_API.csrfToken) {
            payload.csrf_token = VWRT_API.csrfToken;
            headers['X-CSRF-Token'] = VWRT_API.csrfToken;
        }

        fetch('/cgi-bin/system/passwd', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                if(typeof Toast !== 'undefined') Toast.show("Thành công! Vui lòng đăng nhập lại.", "success");
                setTimeout(() => { window.location.href = "/"; }, 2000);
            } else {
                if(typeof Toast !== 'undefined') Toast.show("Lỗi: " + data.message, "error");
            }
        })
        .catch(() => {
            if(typeof Toast !== 'undefined') Toast.show("Lỗi kết nối Server", "error");
        });
    }
};