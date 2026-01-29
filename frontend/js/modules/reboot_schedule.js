// Reboot Schedule Module - Custom UI (Replaces WiFi Schedule)
const RebootScheduleModule = {
    data: null,
    
    showModal: function() {
        if(typeof Toast !== 'undefined') Toast.show("Đang tải lịch...", "info");
        fetch('/cgi-bin/reboot_schedule/get')
            .then(res => res.json())
            .then(data => {
                if(data.error) {
                    if(typeof Toast !== 'undefined') Toast.show("Lỗi: " + data.error, "error");
                    return;
                }
                this.data = data;
                this.renderModal(data);
            })
            .catch(err => {
                if(typeof Toast !== 'undefined') Toast.show("Không thể tải cấu hình.", "error");
                console.error(err);
            });
    },

    renderModal: function(data) {
        const schedules = data.schedules || [];
        
        let schedulesHtml = schedules.length === 0 
            ? '<div style="text-align:center; color:#999; padding:30px;">Chưa có lịch nào. Bấm "+ Thêm lịch" để tạo mới.</div>'
            : schedules.map(s => {
                return `
                    <div class="schedule-item" style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-radius:10px; background:var(--card-bg, #f7fafc); margin-bottom:8px;">
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:14px; color:var(--text-primary, #2d3748);">
                                ⏰ ${s.time || '--:--'}
                            </div>
                            <div style="font-size:12px; color:var(--text-secondary, #718096); margin-top:2px;">Ngày: ${s.days === '*' ? 'Mỗi ngày' : this.formatDays(s.days)}</div>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <label class="schedule-switch" style="position:relative; display:inline-block; width:44px; height:24px;">
                                <input type="checkbox" onchange="RebootScheduleModule.toggleSchedule('${s.id}')" ${s.active ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                                <span class="schedule-slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${s.active ? '#48bb78' : '#e53e3e'}; transition:.3s; border-radius:24px;"></span>
                            </label>
                            <button onclick="RebootScheduleModule.deleteSchedule('${s.id}')" style="background:none; border:none; color:#e53e3e; font-size:16px; cursor:pointer; padding:5px;">🗑</button>
                        </div>
                    </div>
                `;
            }).join('');
        
        const content = `
            <div style="text-align:left;">
                <div style="padding:12px 15px; background:linear-gradient(135deg, rgba(237,137,54,0.1), rgba(229,62,62,0.1)); border-radius:12px; margin-bottom:20px;">
                    <div style="font-weight:600; font-size:13px; color:var(--text-primary, #c05621);">Lên lịch Khởi động lại</div>
                    <div style="font-size:12px; color:var(--text-secondary, #718096);">Tự động khởi động lại thiết bị để giải phóng RAM/Cache</div>
                </div>
                
                <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
                    <button onclick="RebootScheduleModule.showAddForm()" style="background:#ed8936; color:white; border:none; border-radius:6px; padding:6px 14px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px;">
                        <span style="font-size:14px;">+</span> Thêm lịch
                    </button>
                </div>
                
                <div id="schedule-list" style="max-height:320px; overflow-y:auto;">
                    ${schedulesHtml}
                </div>
            </div>
            <style>
                .schedule-switch input:checked + .schedule-slider { background-color: #48bb78 !important; }
                .schedule-switch input:not(:checked) + .schedule-slider { background-color: #e53e3e !important; }
                .schedule-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .3s;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                .schedule-switch input:checked + .schedule-slider:before { transform: translateX(20px); }
                .schedule-item:hover { background: var(--card-hover-bg, #edf2f7) !important; }
            </style>
        `;
        
        if(typeof Modal !== 'undefined') {
            Modal.show({
                title: "Lịch Reboot",
                content: content,
                showCancel: false,
                showIcon: false,
                confirmText: "Đóng",
                onConfirm: () => {}
            });
        }
    },

    formatDays: function(daysStr) {
        if(!daysStr) return "";
        const map = { "0": "CN", "1": "T2", "2": "T3", "3": "T4", "4": "T5", "5": "T6", "6": "T7" };
        return daysStr.split(',').map(d => map[d] || d).join(', ');
    },

    showAddForm: function() {
        // SINGLETON: Clean up old modals
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

        const html = `
            <div class="modal-overlay active" id="modal-add-sch" style="z-index:9999;">
                <div class="modal-box" style="max-width:320px;">
                    <h3>Thêm lịch mới</h3>
                    <div style="text-align:left; margin-top:15px;">
                        <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:5px;">Giờ thực hiện (24h):</label>
                        <div style="display:flex; gap:10px;">
                            <select id="sch-hour" style="flex:1; padding:10px; border:1px solid #ddd; border-radius:6px; font-size:16px; appearance:none; background:#fff;">
                                ${Array.from({length:24}, (_, i) => `<option value="${i.toString().padStart(2, '0')}">${i.toString().padStart(2, '0')}</option>`).join('')}
                            </select>
                            <span style="align-self:center; font-weight:bold;">:</span>
                            <select id="sch-minute" style="flex:1; padding:10px; border:1px solid #ddd; border-radius:6px; font-size:16px; appearance:none; background:#fff;">
                                ${Array.from({length:60}, (_, i) => `<option value="${i.toString().padStart(2, '0')}">${i.toString().padStart(2, '0')}</option>`).join('')}
                            </select>
                        </div>
                        
                        <label style="display:block; font-size:12px; font-weight:bold; margin:15px 0 5px;">Lặp lại:</label>
                        <div style="display:flex; flex-wrap:wrap; gap:5px;" id="sch-days-container">
                            <label><input type="checkbox" value="1" checked> T2</label>
                            <label><input type="checkbox" value="2" checked> T3</label>
                            <label><input type="checkbox" value="3" checked> T4</label>
                            <label><input type="checkbox" value="4" checked> T5</label>
                            <label><input type="checkbox" value="5" checked> T6</label>
                            <label><input type="checkbox" value="6" checked> T7</label>
                            <label><input type="checkbox" value="0" checked> CN</label>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-modal btn-secondary" onclick="document.getElementById('modal-add-sch').remove()">Hủy</button>
                        <button class="btn-modal btn-primary" onclick="RebootScheduleModule.doAdd()">Lưu</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    doAdd: function() {
        const hour = document.getElementById('sch-hour').value;
        const minute = document.getElementById('sch-minute').value;
        const time = `${hour}:${minute}`;

        if(!time) { // Should not happen with selects
            Toast.show("Vui lòng chọn giờ!", "warning");
            return;
        }
        
        // Get days
        const checks = document.querySelectorAll('#sch-days-container input:checked');
        let days = "*";
        if(checks.length > 0 && checks.length < 7) {
            days = Array.from(checks).map(c => c.value).join(',');
        }

        const payload = {
            action: 'add',
            time: time,
            days: days
        };
        
        this.submit(payload, "modal-add-sch");
    },

    deleteSchedule: function(id) {
        // SINGLETON: Clean up old modals
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

        // Tạo popup xác nhận riêng (không dùng Modal chung để tránh conflict)
        const html = `
            <div class="modal-overlay active" id="modal-confirm-delete" style="z-index:10000;">
                <div class="modal-box" style="max-width:320px; text-align:center;">
                    <div style="font-size:40px; margin-bottom:10px;">⚠️</div>
                    <h3>Xác nhận xóa</h3>
                    <p style="color:#666; margin:15px 0;">Bạn có chắc chắn muốn xóa lịch này?</p>
                    <div class="modal-actions">
                        <button class="btn-modal btn-secondary" onclick="document.getElementById('modal-confirm-delete').remove()">Hủy bỏ</button>
                        <button class="btn-modal btn-primary" style="background:#e53e3e;" onclick="RebootScheduleModule.confirmDelete('${id}')">Xóa</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    confirmDelete: function(id) {
        document.getElementById('modal-confirm-delete').remove();
        this.submit({ action: 'delete', id: id });
    },

    toggleSchedule: function(id) {
        this.submit({ action: 'toggle', id: id }, null, true);
    },

    submit: async function(payload, closeId = null, silent = false, retryCount = 0) {
        if(!silent && typeof Toast !== 'undefined') Toast.show("Đang lưu...", "info");
        
        // Fetch fresh CSRF Token
        if(typeof VWRT_API !== 'undefined') {
            VWRT_API.csrfToken = null;
            await VWRT_API.fetchCSRFToken();
        }
        
        this.doSubmit(payload, closeId, silent, retryCount);
    },

    doSubmit: function(payload, closeId, silent, retryCount) {
        // Add CSRF token into payload (uhttpd strips custom headers)
        if(typeof VWRT_API !== 'undefined' && VWRT_API.csrfToken) {
            payload.csrf_token = VWRT_API.csrfToken;
        }

        fetch('/cgi-bin/reboot_schedule/set', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                if(!silent && typeof Toast !== 'undefined') Toast.show(data.message, "success");
                if(closeId) document.getElementById(closeId).remove();
                // Đóng modal cũ trước khi reload để tránh nhân đôi
                const oldModal = document.getElementById('custom-modal-overlay');
                if(oldModal) oldModal.remove();
                this.showModal(); // Reload list
            } else {
                // CSRF Retry Logic
                if (data.error && data.error.includes("CSRF") && retryCount < 1) {

                    if(typeof VWRT_API !== 'undefined') {
                        VWRT_API.csrfToken = null; // Clear bad token
                        VWRT_API.fetchCSRFToken().then(() => {
                            this.submit(payload, closeId, silent, retryCount + 1);
                        });
                    }
                    return;
                }

                if(typeof Toast !== 'undefined') Toast.show("Lỗi: " + data.error, "error");
            }
        })
        .catch(() => {
            if(typeof Toast !== 'undefined') Toast.show("Lỗi kết nối!", "error");
        });
    }
};

window.RebootScheduleModule = RebootScheduleModule;
