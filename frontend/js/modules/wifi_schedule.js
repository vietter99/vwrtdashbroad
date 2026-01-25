// Wifi Schedule Module - Custom UI
const WifiScheduleModule = {
    data: null,
    
    showModal: function() {
        fetch('/cgi-bin/wifi_schedule/get')
            .then(res => res.json())
            .then(data => {
                if(data.error) {
                    Toast.show("Lỗi: " + data.error, "error");
                    return;
                }
                this.data = data;
                this.renderModal(data);
            })
            .catch(err => {
                Toast.show("Không thể tải cấu hình lịch WiFi.", "error");
                console.error(err);
            });
    },

    renderModal: function(data) {
        const schedules = data.schedules || [];
        const interfaces = data.wifi_interfaces || [];
        
        let schedulesHtml = schedules.length === 0 
            ? '<div style="text-align:center; color:#999; padding:30px;">Chưa có lịch nào. Bấm "+ Thêm lịch" để tạo mới.</div>'
            : schedules.map(s => {
                const wifiName = interfaces.find(i => i.name === s.wifi)?.ssid || s.wifi;
                return `
                    <div class="schedule-item" style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-radius:10px; background:var(--card-bg, #f7fafc); margin-bottom:8px;">
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:13px; color:var(--text-primary, #2d3748);">
                                📶 ${wifiName}
                            </div>
                            <div style="font-size:12px; color:var(--text-secondary, #718096); margin-top:4px;">
                                🌙 Tắt: <strong>${s.time_off || '--:--'}</strong> | ☀️ Bật: <strong>${s.time_on || '--:--'}</strong>
                            </div>
                            <div style="font-size:11px; color:#a0aec0; margin-top:2px;">Ngày: ${s.days === '*' ? 'Mỗi ngày' : s.days}</div>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <label class="schedule-switch" style="position:relative; display:inline-block; width:44px; height:24px;">
                                <input type="checkbox" data-id="${s.id}" ${s.active ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                                <span class="schedule-slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${s.active ? '#48bb78' : '#e53e3e'}; transition:.3s; border-radius:24px;"></span>
                            </label>
                            <button onclick="WifiScheduleModule.deleteSchedule('${s.id}')" style="background:none; border:none; color:#e53e3e; font-size:16px; cursor:pointer; padding:5px;">🗑</button>
                        </div>
                    </div>
                `;
            }).join('');
        
        const content = `
            <div style="text-align:left;">
                <div style="padding:12px 15px; background:linear-gradient(135deg, rgba(49,130,206,0.1), rgba(128,90,213,0.1)); border-radius:12px; margin-bottom:20px;">
                    <div style="font-weight:600; font-size:13px; color:var(--text-primary, #2d3748);">Lên lịch Tắt/Bật WiFi</div>
                    <div style="font-size:12px; color:var(--text-secondary, #718096);">Tự động tắt WiFi theo giờ định trước</div>
                </div>
                
                <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
                    <button id="wifi-sch-add-btn" style="background:#3182ce; color:white; border:none; border-radius:6px; padding:6px 14px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px;">
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
                title: "Lịch WiFi",
                content: content,
                showCancel: false,
                showIcon: false,
                confirmText: "Đóng",
                onConfirm: () => {}
            });
            
            const mBox = document.querySelector('.modal-box');
            if(mBox) {
                mBox.style.maxWidth = "450px";
                mBox.style.width = "95%";
            }
            
            setTimeout(() => {
                // Add button handler
                const addBtn = document.getElementById('wifi-sch-add-btn');
                if(addBtn) {
                    addBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.showAddModal();
                    });
                }
                
                // Toggle handlers
                const checkboxes = document.querySelectorAll('#schedule-list input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        e.stopPropagation();
                        const id = cb.getAttribute('data-id');
                        this.toggleSchedule(id);
                    });
                });
            }, 100);
        }
    },
    
    showAddModal: function() {
        const interfaces = this.data?.wifi_interfaces || [];
        const wifiOptions = interfaces.map(i => 
            `<option value="${i.name}">${i.ssid} (${i.device.includes('1_2') ? '5G' : '2.4G'})</option>`
        ).join('');
        
        // Generate hour options (00-23)
        let hourOptions = '';
        for(let h = 0; h < 24; h++) {
            const hStr = h.toString().padStart(2, '0');
            hourOptions += `<option value="${hStr}">${hStr}</option>`;
        }
        
        // Generate minute options (00, 15, 30, 45)
        const minuteOptions = '<option value="00">00</option><option value="15">15</option><option value="30">30</option><option value="45">45</option>';
        
        const addContent = `
            <div style="text-align:left;">
                <div style="margin-bottom:15px;">
                    <label style="display:block; font-weight:600; font-size:13px; color:var(--text-secondary, #718096); margin-bottom:6px;">Chọn WiFi</label>
                    <select id="wifi-sch-wifi" style="width:100%; padding:10px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; box-sizing:border-box;">
                        ${wifiOptions}
                    </select>
                </div>
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <div style="flex:1;">
                        <label style="display:block; font-weight:600; font-size:13px; color:var(--text-secondary, #718096); margin-bottom:6px;">🌙 Giờ tắt</label>
                        <div style="display:flex; gap:5px;">
                            <select id="wifi-sch-off-h" style="flex:1; padding:10px 8px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px;">${hourOptions.replace('value="22"', 'value="22" selected')}</select>
                            <span style="line-height:42px;">:</span>
                            <select id="wifi-sch-off-m" style="flex:1; padding:10px 8px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px;">${minuteOptions}</select>
                        </div>
                    </div>
                    <div style="flex:1;">
                        <label style="display:block; font-weight:600; font-size:13px; color:var(--text-secondary, #718096); margin-bottom:6px;">☀️ Giờ bật</label>
                        <div style="display:flex; gap:5px;">
                            <select id="wifi-sch-on-h" style="flex:1; padding:10px 8px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px;">${hourOptions.replace('value="06"', 'value="06" selected')}</select>
                            <span style="line-height:42px;">:</span>
                            <select id="wifi-sch-on-m" style="flex:1; padding:10px 8px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px;">${minuteOptions}</select>
                        </div>
                    </div>
                </div>
                <div style="margin-bottom:20px;">
                    <label style="display:block; font-weight:600; font-size:13px; color:var(--text-secondary, #718096); margin-bottom:6px;">Ngày áp dụng</label>
                    <select id="wifi-sch-days" style="width:100%; padding:10px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; box-sizing:border-box;">
                        <option value="*">Mỗi ngày</option>
                        <option value="1-5">Thứ 2 - Thứ 6 (Ngày thường)</option>
                        <option value="0,6">Thứ 7 & Chủ nhật (Cuối tuần)</option>
                        <option value="1">Thứ 2</option>
                        <option value="2">Thứ 3</option>
                        <option value="3">Thứ 4</option>
                        <option value="4">Thứ 5</option>
                        <option value="5">Thứ 6</option>
                        <option value="6">Thứ 7</option>
                        <option value="0">Chủ nhật</option>
                    </select>
                </div>
                <div style="display:flex; gap:10px;">
                    <button id="wifi-sch-cancel" style="flex:1; padding:12px; background:#e2e8f0; color:#4a5568; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Hủy</button>
                    <button id="wifi-sch-confirm" style="flex:1; padding:12px; background:#3182ce; color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Thêm</button>
                </div>
            </div>
        `;
        
        const overlay = document.createElement('div');
        overlay.id = 'wifi-sch-add-overlay';
        overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:99999;';
        
        const box = document.createElement('div');
        box.style.cssText = 'background:var(--card-bg, white); border-radius:16px; padding:24px; max-width:400px; width:90%; box-shadow:0 20px 40px rgba(0,0,0,0.3); animation: popIn 0.2s ease-out;';
        box.innerHTML = `<style>@keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }</style><h3 style="margin:0 0 20px 0; font-size:18px; color:var(--text-primary, #2d3748);">Thêm lịch mới</h3>${addContent}`;
        
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', (e) => {
            if(e.target === overlay) overlay.remove();
        });
        box.addEventListener('click', (e) => e.stopPropagation());
        
        document.getElementById('wifi-sch-cancel').addEventListener('click', (e) => {
            e.stopPropagation();
            overlay.remove();
        });
        document.getElementById('wifi-sch-confirm').addEventListener('click', (e) => {
            e.stopPropagation();
            const wifi = document.getElementById('wifi-sch-wifi').value;
            const time_off = document.getElementById('wifi-sch-off-h').value + ':' + document.getElementById('wifi-sch-off-m').value;
            const time_on = document.getElementById('wifi-sch-on-h').value + ':' + document.getElementById('wifi-sch-on-m').value;
            const days = document.getElementById('wifi-sch-days').value;
            
            this.addSchedule(wifi, time_off, time_on, days, overlay);
        });
    },
    
    addSchedule: function(wifi, time_off, time_on, days, overlay) {
        const btn = document.getElementById('wifi-sch-confirm');
        if(btn) { btn.disabled = true; btn.innerHTML = '⏳ Đang thêm...'; }
        
        fetch('/cgi-bin/wifi_schedule/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add', wifi, time_off, time_on, days })
        })
        .then(res => res.json())
        .then(data => {
            overlay.remove();
            if(data.success) {
                Toast.show("Đã thêm lịch mới!", "success");
                Modal.close();
                this.showModal();
            } else {
                Toast.show("Lỗi: " + (data.error || "Không thể thêm."), "error");
            }
        })
        .catch(err => { overlay.remove(); Toast.show("Lỗi kết nối.", "error"); });
    },
    
    toggleSchedule: function(id) {
        fetch('/cgi-bin/wifi_schedule/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle', id })
        })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                Toast.show("Đã cập nhật!", "success");
            } else {
                Toast.show("Lỗi: " + (data.error || "Không thể cập nhật."), "error");
            }
        })
        .catch(err => Toast.show("Lỗi kết nối.", "error"));
    },
    
    deleteSchedule: function(id) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:99999;';
        
        const box = document.createElement('div');
        box.style.cssText = 'background:var(--card-bg, white); border-radius:16px; padding:24px; max-width:320px; width:90%; text-align:center;';
        box.innerHTML = `
            <div style="font-size:40px; margin-bottom:15px;">⚠️</div>
            <h3 style="margin:0 0 10px; font-size:16px;">Xác nhận xóa</h3>
            <p style="color:#718096; font-size:14px; margin-bottom:20px;">Bạn có chắc muốn xóa lịch này?</p>
            <div style="display:flex; gap:10px;">
                <button id="wifisch-del-cancel" style="flex:1; padding:12px; background:#e2e8f0; color:#4a5568; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Hủy</button>
                <button id="wifisch-del-confirm" style="flex:1; padding:12px; background:#e53e3e; color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Xóa</button>
            </div>
        `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        // Prevent overlay clicks from propagating
        overlay.addEventListener('click', (e) => {
            if(e.target === overlay) overlay.remove();
        });
        box.addEventListener('click', (e) => e.stopPropagation());
        
        document.getElementById('wifisch-del-cancel').addEventListener('click', (e) => {
            e.stopPropagation();
            overlay.remove();
        });
        document.getElementById('wifisch-del-confirm').addEventListener('click', (e) => {
            e.stopPropagation();
            const btn = document.getElementById('wifisch-del-confirm');
            btn.disabled = true;
            btn.innerHTML = '⏳ Đang xóa...';
            
            fetch('/cgi-bin/wifi_schedule/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id })
            })
            .then(res => res.json())
            .then(data => {
                overlay.remove();
                if(data.success) {
                    Toast.show("Đã xóa lịch!", "success");
                    Modal.close();
                    this.showModal();
                } else {
                    Toast.show("Lỗi: " + (data.error || "Không thể xóa."), "error");
                }
            })
            .catch(err => { overlay.remove(); Toast.show("Lỗi kết nối.", "error"); });
        });
    }
};

window.WifiScheduleModule = WifiScheduleModule;
