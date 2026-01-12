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
        fetch('/cgi-bin/update_check')
            .then(res => res.json())
            .then(data => {
                this.updateData = data;
                const btn = document.getElementById('btn-check-update');
                const badge = document.getElementById('update-badge');
                
                if (data.has_update || data.has_update_fw) {
                    if(badge) badge.style.display = 'block';
                    if(btn) {
                        btn.innerHTML = `<span style="color:#e53e3e; font-weight:bold;">! Có bản mới</span>`;
                        btn.style.borderColor = "#e53e3e";
                    }
                } else {
                    if(badge) badge.style.display = 'none';
                    if(btn) btn.innerText = "Đang dùng bản mới nhất";
                }
            })
            .catch(() => {});
    },

    renderTemplate: function(container) {
        const luciPath = `${window.location.protocol}//${window.location.hostname}/cgi-bin/luci`;

        container.innerHTML = `
            <div class="settings-menu">
                
                <div class="setting-group" style="background:#fffaf0; border:1px dashed #ed8936;">
                    <div class="group-label" style="color:#c05621;">Hệ thống & Cập nhật</div>
                    <div class="group-control" style="justify-content:space-between; align-items:center;">
                        <span style="font-size:11px; color:#718096;" id="cur-ver-text">Ver: ...</span>
                        <button id="btn-check-update" onclick="SettingsModule.showUpdatePopup()" style="padding:5px 10px; font-size:11px; border-radius:15px; border:1px solid #cbd5e0; background:white; cursor:pointer;">
                            Kiểm tra
                        </button>
                    </div>
                </div>
                
                <div class="separator"></div>

                <a href="${luciPath}" target="_blank" class="setting-item" onclick="SettingsModule.closePopup()">
                    <div class="si-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></div>
                    <span>Cấu hình LuCI</span>
                </a>
                
                <div class="separator"></div>

                <div class="setting-item" onclick="SettingsModule.confirmReboot()">
                    <div class="si-icon warning"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg></div>
                    <span>Khởi động lại</span>
                </div>

                <div class="setting-item danger" onclick="SettingsModule.confirmReset()">
                    <div class="si-icon danger"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></div>
                    <span>Khôi phục gốc</span>
                </div>
            </div>
        `;
        
        fetch('/cgi-bin/get_version').then(r=>r.json()).then(v=>{
            const el = document.getElementById('cur-ver-text');
            if(el) el.innerText = `Dashboard: ${v.dashboard.version}`;
        }).catch(()=>{});
    },

    showUpdatePopup: function() {
        if (!this.updateData || (!this.updateData.has_update && !this.updateData.has_update_fw)) {
            if(typeof Toast !== 'undefined') Toast.show("Hệ thống đang ở phiên bản mới nhất!", "success");
            return;
        }

        const rem = this.updateData.latest;
        const cur = this.updateData.current;
        let htmlContent = `<div style="text-align:left; font-size:13px;">`;

        if (this.updateData.has_update) {
            htmlContent += `
                <div style="background:#f0fff4; padding:10px; border-radius:8px; border:1px solid #9ae6b4; margin-bottom:10px;">
                    <div style="font-weight:bold; color:#276749;">Dashboard Mới: ${rem.dashboard.version}</div>
                    <div style="color:#718096; margin-bottom:5px;">Hiện tại: ${cur.dashboard.version}</div>
                    <pre style="background:rgba(255,255,255,0.5); padding:5px; font-size:11px; white-space:pre-wrap;">${rem.dashboard.log}</pre>
                    <button onclick="SettingsModule.doUpdate('dashboard', '${rem.dashboard.url}', '${rem.dashboard.version}')" class="btn-modal btn-primary" style="width:100%; margin-top:5px;">Cập nhật Giao diện</button>
                </div>
            `;
        }

        if (this.updateData.has_update_fw) {
            htmlContent += `
                <div style="background:#fff5f5; padding:10px; border-radius:8px; border:1px solid #feb2b2;">
                    <div style="font-weight:bold; color:#c53030;">Firmware Mới: ${rem.firmware.version}</div>
                    <div style="color:#718096; margin-bottom:5px;">Hiện tại: ${cur.firmware.version}</div>
                    <pre style="background:rgba(255,255,255,0.5); padding:5px; font-size:11px; white-space:pre-wrap;">${rem.firmware.log}</pre>
                    <button onclick="SettingsModule.doUpdate('firmware', '${rem.firmware.url}', '${rem.firmware.version}')" class="btn-modal btn-primary" style="width:100%; margin-top:5px; background:#e53e3e;">Cập nhật Firmware</button>
                </div>
            `;
        }
        
        htmlContent += `</div>`;

        const modalHtml = `
            <div class="modal-overlay active" id="modal-update" style="z-index:99999;">
                <div class="modal-box" style="max-width:400px;">
                    <h3>Có bản cập nhật mới</h3>
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

        fetch('/cgi-bin/update_run', {
            method: 'POST',
            body: JSON.stringify({ type: type, url: url, version: ver })
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
        fetch(`/cgi-bin/system_action?action=${action}&param=${param}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    if (typeof Toast !== 'undefined') Toast.show(data.message, "success");
                    if (action === 'reboot' || action === 'reset') setTimeout(() => { location.reload(); }, 25000);
                } else {
                    if (typeof Toast !== 'undefined') Toast.show("Lỗi: " + data.message, "error");
                }
            });
    }
};