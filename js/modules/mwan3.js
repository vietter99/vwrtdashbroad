const Mwan3Module = {
    intervalId: null,
    currentTab: 'members', // 'members' or 'tracking'
    isEditing: false,
    lastData: null,

    showModal: function() {
        Modal.show({
            title: "MultiWAN (Cân bằng tải & Dự phòng)",
            content: `
                <div id="mwan3-container" style="min-height: 400px; font-family: 'Inter', sans-serif;">
                     <div style="text-align: center; padding: 60px;">
                        <div class="spinner"></div>
                        <div style="margin-top:15px; color:#a0aec0;">Đang tải cấu hình...</div>
                    </div>
                </div>
                <style>
                    /* Defaults */
                    .mw-body { padding: 20px; background: white; color: #1e293b; }
                    .mw-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); margin-bottom: 15px; }
                    .mw-status-card { background: linear-gradient(to right, #f8fafc, #ffffff); }
                    .mw-table { width: 100%; border-collapse: collapse; }
                    .mw-table th { text-align: left; padding: 12px; border-bottom: 2px solid #f1f5f9; color: #64748b; font-size: 13px; text-transform: uppercase; }
                    .mw-table td { padding: 12px; border-bottom: 1px solid #f8fafc; color: #334155; font-size: 14px; }
                    .mw-badge { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
                    .mw-guide-box { margin-top: 20px; padding: 15px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; font-size: 13px; color: #92400e; }
                    
                    /* Buttons */
                    .mw-btn { padding: 8px 15px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
                    .mw-btn-primary { background: #3b82f6; color: white; }
                    .mw-btn-primary:active { opacity: 0.8; }
                    
                    /* Tabs */
                    .mw-tabs { display: flex; gap: 10px; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; }
                    .mw-tab { padding: 10px 20px; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
                    .mw-tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }
                    
                    /* Modern Inputs */
                    .mw-input-modern { width: 100%; max-width: 120px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; color: #1e293b; transition: all 0.2s; font-family: monospace; }
                    .mw-input-full { max-width: 100%; width: 100%; }
                    .mw-input-modern:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); outline: none; }

                    /* Icon Button */
                    .mw-btn-icon { background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; display: inline-flex;  align-items: center; justify-content: center; transition: all 0.2s; }
                    
                    .mw-center { text-align: center !important; }
                    
                    /* Dark Mode */
                    [data-theme="dark"] #mwan3-container,
                    [data-theme="dark"] .mw-body { background: #1a202c !important; color: #e2e8f0 !important; }
                    [data-theme="dark"] .mw-card { background: #2d3748; border-color: #4a5568; color: #e2e8f0; }
                    [data-theme="dark"] .mw-status-card { background: #2d3748; }
                    [data-theme="dark"] .mw-table th { border-bottom-color: #4a5568; color: #a0aec0; }
                    [data-theme="dark"] .mw-table td { border-bottom-color: #4a5568; color: #e2e8f0; }
                    [data-theme="dark"] h3 { color: #e2e8f0 !important; }
                    .mw-guide-header { color: #b45309; }
                    .mw-guide-ul { color: #78350f; padding-left: 20px; margin: 4px 0 0 0; }
                    [data-theme="dark"] .mw-guide-box { background: rgba(59, 130, 246, 0.1) !important; border-color: #2b6cb0 !important; color: #e2e8f0 !important; }
                    [data-theme="dark"] .mw-guide-box strong { color: #63b3ed !important; }
                    [data-theme="dark"] .mw-guide-header { color: #f6ad55 !important; }
                    [data-theme="dark"] .mw-guide-ul { color: #cbd5e0 !important; }
                    [data-theme="dark"] .mw-status-item { background: #2d3748 !important; border-width: 2px !important; }
                    [data-theme="dark"] .mw-status-item .status-label { color: #e2e8f0 !important; }
                    [data-theme="dark"] .mw-tabs { border-bottom-color: #4a5568; }
                    [data-theme="dark"] .mw-tab { color: #a0aec0; }
                    [data-theme="dark"] .mw-tab.active { color: #63b3ed; border-bottom-color: #63b3ed; }
                    [data-theme="dark"] .mw-status-item[style*="#fef2f2"] { background: rgba(239, 68, 68, 0.1) !important; border-color: #ef4444 !important; }
                    [data-theme="dark"] .mw-status-item[style*="#ecfdf5"] { background: rgba(16, 185, 129, 0.1) !important; border-color: #10b981 !important; }
                    [data-theme="dark"] .mw-status-item[style*="#fffbeb"] { background: rgba(245, 158, 11, 0.1) !important; border-color: #f59e0b !important; }
                    [data-theme="dark"] .mw-input-modern { background: #1a202c; border-color: #4a5568; color: white; }
                    [data-theme="dark"] .mw-input-modern:focus { border-color: #63b3ed; box-shadow: 0 0 0 3px rgba(99, 179, 237, 0.2); }
                    [data-theme="dark"] .mw-btn-icon { background: #2d3748; border-color: #4a5568; color: #63b3ed; }
                    [data-theme="dark"] .mw-btn-icon:hover { background: #63b3ed; color: #1a202c; border-color: #63b3ed; }
                </style>
            `,
            showCancel: false,
            confirmText: "Đóng",
            onConfirm: () => { this.stopAutoRefresh(); }
        });

        // Customize Modal
        const mBox = document.querySelector('.modal-box');
        if(mBox) { mBox.style.maxWidth = "850px"; mBox.style.width = "95%"; }
        
        const closeBtn = document.querySelector('.modal-close');
        if(closeBtn) {
            const oldClick = closeBtn.onclick;
            closeBtn.onclick = () => { this.stopAutoRefresh(); if(oldClick) oldClick(); };
        }

        this.fetchStatus();
        this.startAutoRefresh();
    },

    startAutoRefresh: function() {
        if(this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => this.fetchStatus(true), 5000);
    },

    stopAutoRefresh: function() {
        if(this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    },
    
    switchTab: function(tab) {
        this.currentTab = tab;
        this.render(this.lastData);
    },

    fetchStatus: function(isRefresh = false) {
        if(isRefresh && this.isEditing) return;

        fetch('/cgi-bin/mwan3/status')
            .then(res => res.json())
            .then(data => {
                this.lastData = data;
                this.render(data);
            })
            .catch(err => {
                console.error(err);
                if(!isRefresh) document.getElementById('mwan3-container').innerHTML = `<div style="text-align:center; padding:40px; color:red;">Lỗi kết nối: ${err.message}</div>`;
            });
    },

    render: function(data) {
        const container = document.getElementById('mwan3-container');
        if(!container) return;

        const members = data.members || [];
        const interfaces = data.interfaces || {};
        const tracking = data.tracking || {};
        
        let html = `
            <div class="mw-body">
                <!-- Status Card -->
                <div class="mw-card mw-status-card">
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
        `;
        
        // Render Status
        Object.keys(interfaces).forEach(name => {
            const iface = interfaces[name];
            const isOnline = ['online', 'active'].includes(iface.status);
            
            let color = '#ef4444'; // Red (Offline)
            let bgColor = '#fef2f2';
            let statusText = 'Mất kết nối';

            if(isOnline) {
                const hasLoad = iface.load && iface.load !== '0%';
                if(hasLoad) {
                    color = '#10b981'; // Green
                    bgColor = '#ecfdf5'; 
                    statusText = 'Đang hoạt động';
                } else {
                    color = '#f59e0b'; // Yellow (Waiting/Backup)
                    bgColor = '#fffbeb';
                    statusText = 'Đang chờ (Backup)';
                }
            }

            html += `
                <div class="mw-status-item" style="flex: 1; min-width: 140px; background: ${bgColor}; border: 2px solid ${color}; padding: 15px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 15px; transition: all 0.2s;">
                    <div>
                        <div class="status-label" style="font-weight: 800; color: #1e293b; text-transform: uppercase; font-size: 18px; line-height: 1.2;">
                            ${name}
                        </div>
                        <div class="status-text" style="font-size: 13px; font-weight: 500; color: ${color}; opacity: 0.9;">
                            ${statusText}
                        </div>
                    </div>
                    ${iface.load && iface.load !== '0%' ? `
                        <div style="background: ${color}; color: white; font-size: 12px; padding: 4px 10px; border-radius: 20px; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            ${iface.load}
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        if(!Object.keys(interfaces).length) html += `<div style="color: #64748b; font-style: italic;">Đang kiểm tra kết nối...</div>`;

        html += `   </div>
                </div>

                <!-- Tabs -->
                <div class="mw-tabs">
                    <div class="mw-tab ${this.currentTab === 'members' ? 'active' : ''}" onclick="Mwan3Module.switchTab('members')">Cấu hình Tải</div>
                    <div class="mw-tab ${this.currentTab === 'tracking' ? 'active' : ''}" onclick="Mwan3Module.switchTab('tracking')">Tracking (Kiểm tra mạng)</div>
                </div>

                <!-- Content -->
                <div class="mw-card">
        `;

        if(this.currentTab === 'members') {
            html += this.renderMembersTab(members);
        } else {
            html += this.renderTrackingTab(tracking);
        }

        html += `   </div>
            </div>
        `;
        
        container.innerHTML = html;
    },

    renderMembersTab: function(members) {
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                 <h3 style="color: #1e293b; margin: 0;">Danh sách đường truyền</h3>
                 <div style="font-size: 12px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 5px 12px; border-radius: 20px;">Tự động lưu</div>
            </div>
            
            <table class="mw-table">
                <thead>
                    <tr>
                        <th style="width: 15%;">Cổng mạng</th>
                        <th style="width: 35%;" class="mw-center">Độ ưu tiên</th>
                        <th style="width: 35%;" class="mw-center">Tỷ lệ tải</th>
                        <th style="text-align: right; width: 15%;">Lưu</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if(members.length === 0) {
             html += `<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px;">Chưa có đường truyền nào.</td></tr>`;
        } else {
             members.forEach(m => {
                 html += `
                    <tr>
                        <td>
                            <div style="font-weight: 700; color: #334155;">${m.interface}</div>
                        </td>
                        <td class="mw-center">
                            <input type="number" id="metric-${m.name}" class="mw-input-modern" value="${m.metric}" onfocus="Mwan3Module.isEditing=true" onblur="Mwan3Module.isEditing=false" placeholder="VD: 1">
                        </td>
                        <td class="mw-center">
                            <input type="number" id="weight-${m.name}" class="mw-input-modern" value="${m.weight}" onfocus="Mwan3Module.isEditing=true" onblur="Mwan3Module.isEditing=false" placeholder="VD: 10">
                        </td>
                        <td style="text-align: right;">
                             <button onclick="Mwan3Module.saveMember('${m.name}', '${m.interface}')" class="mw-btn-icon" title="Lưu cấu hình">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                             </button>
                        </td>
                    </tr>
                 `;
             });
        }
        
        html += `</tbody></table>
            <div class="mw-guide-box">
                <strong>💡 Hướng dẫn cấu hình:</strong><br>
                <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr; gap: 15px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <div class="mw-guide-header" style="font-weight: 600; margin-bottom: 4px;">1. Gộp mạng (Cân bằng tải):</div>
                            <div style="margin-bottom: 6px;">Đặt <strong>Độ ưu tiên bằng nhau</strong> (vd: tất cả là 1).</div>
                            <div style="font-size: 13px;">
                                Router chia tải theo <strong>Tỷ lệ (Weight)</strong>.<br>
                                Ví dụ muốn chia <strong>Wan 60% - 5G 40%</strong>:
                                <ul class="mw-guide-ul">
                                    <li>Wan: <strong>1000</strong></li>
                                    <li>5G: <strong>700</strong></li>
                                </ul>
                            </div>
                        </div>
                        <div>
                            <div class="mw-guide-header" style="font-weight: 600; margin-bottom: 4px;">2. Chạy dự phòng (Failover):</div>
                            <div>Đặt <strong>Độ ưu tiên khác nhau</strong>.</div>
                            <div style="margin-top: 4px;">Số càng nhỏ càng ưu tiên. Ví dụ:</div>
                            <ul class="mw-guide-ul">
                                <li>Wan chính: nhập <strong>1</strong></li>
                                <li>Wan phụ: nhập <strong>2</strong> (chỉ chạy khi Wan chính mất)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return html;
    },

    renderTrackingTab: function(tracking) {
        // Use interfaces from lastData to filter
        const interfaces = this.lastData && this.lastData.interfaces ? Object.keys(this.lastData.interfaces) : [];
        
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                 <h3 style="color: #1e293b; margin: 0;">Cấu hình Tracking (Ping)</h3>
                 <div style="font-size: 13px; color: #64748b;">Giúp Router biết mạng có thực sự mất kết nối hay không.</div>
            </div>
            
            <div style="max-height: 400px; overflow-y: auto; margin: -10px; padding: 10px;">
            <table class="mw-table">
                <thead>
                    <tr>
                        <th style="width: 20%;">Cổng mạng</th>
                        <th style="width: 40%;">Ping tới IP (VD: 8.8.8.8)</th>
                        <th style="width: 25%;" class="mw-center">Mỗi (giây)</th>
                        <th style="text-align: right; width: 15%;">Lưu</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Filter: Only show sections that are actual interfaces
        const sections = Object.keys(tracking).filter(name => interfaces.includes(name));
        
        if(sections.length === 0) {
             html += `<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px;">Không tìm thấy cấu hình Tracking cho các cổng mạng hiện tại.</td></tr>`;
        } else {
             sections.forEach(name => {
                 const t = tracking[name];
                 
                 // Handle ips: Lua cjson returns {} for empty arrays, which is an object in JS
                 let ipsArray = [];
                 if (Array.isArray(t.track_ips)) {
                     ipsArray = t.track_ips;
                 } else if (typeof t.track_ips === 'string') {
                     ipsArray = [t.track_ips];
                 }
                 // If t.track_ips is {} (empty object), ipsArray remains []
                 
                 const ips = ipsArray.join(', ');
                 
                 html += `
                    <tr>
                        <td>
                            <div style="font-weight: 700; color: #334155;">${name.toUpperCase()}</div>
                        </td>
                        <td>
                            <input type="text" id="track-ip-${name}" class="mw-input-modern mw-input-full" value="${ips}" onfocus="Mwan3Module.isEditing=true" onblur="Mwan3Module.isEditing=false" placeholder="VD: 8.8.8.8, 1.1.1.1">
                        </td>
                        <td class="mw-center">
                            <input type="number" id="track-interval-${name}" class="mw-input-modern" value="${t.interval || 5}" onfocus="Mwan3Module.isEditing=true" onblur="Mwan3Module.isEditing=false">
                        </td>
                        <td style="text-align: right;">
                             <button onclick="Mwan3Module.saveTracking('${name}')" class="mw-btn-icon" title="Lưu Tracking">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                             </button>
                        </td>
                    </tr>
                 `;
             });
        }
        
        html += `</tbody></table></div>
            <div class="mw-guide-box">
                <strong>ℹ️ Lưu ý Tracking:</strong><br>
                <ul class="mw-guide-ul">
                    <li>Nhập IP ổn định (như 8.8.8.8, 1.1.1.1). Có thể nhập nhiều IP cách nhau bằng dấu phẩy.</li>
                    <li><strong>Kiểm tra mỗi (giây):</strong> Thường để 3-5 giây. Nhanh quá gây tải, chậm quá thì phát hiện lỗi lâu.</li>
                    <li>Khi Ping thất bại, Router sẽ đánh dấu cổng là <strong>Offline (Đỏ)</strong>.</li>
                </ul>
            </div>
        `;
        return html;
    },

    saveTracking: function(section) {
        const ipsStr = document.getElementById(`track-ip-${section}`).value;
        const interval = document.getElementById(`track-interval-${section}`).value;
        
        if(!ipsStr || !interval) {
            if(typeof Toast !== 'undefined') Toast.show("Vui lòng nhập IP và khoảng thời gian", "error");
            return;
        }

        const ips = ipsStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
        
        const btn = event?.currentTarget;
        if(btn) {
            btn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';
            btn.disabled = true;
        }

        fetch('/cgi-bin/mwan3/action', {
            method: 'POST',
            body: JSON.stringify({
                action: 'set_tracking',
                section: section,
                track_ips: ips,
                interval: interval
            })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                 if(typeof Toast !== 'undefined') Toast.show(`Đã lưu Tracking: ${section}`, "success");
                 this.isEditing = false;
                 setTimeout(() => this.fetchStatus(true), 1500);
            } else {
                 if(typeof Toast !== 'undefined') Toast.show("Lỗi: " + data.message, "error");
            }
        })
        .finally(() => {
             if(btn) {
                 btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>';
                 btn.disabled = false;
             }
        });
    },

    saveMember: function(name, interfaceName) {
        const metric = document.getElementById(`metric-${name}`).value;
        const weight = document.getElementById(`weight-${name}`).value;
        const displayName = interfaceName || name;
        
        if(!metric || !weight) {
            if(typeof Toast !== 'undefined') Toast.show("Vui lòng nhập đầy đủ thông tin", "error");
            return;
        }

        const btn = event?.currentTarget;
        if(btn) {
            btn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';
            btn.disabled = true;
        }

        fetch('/cgi-bin/mwan3/action', {
            method: 'POST',
            body: JSON.stringify({
                action: 'set_member',
                name: name,
                metric: metric,
                weight: weight
            })
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                 if(typeof Toast !== 'undefined') Toast.show(`Đã lưu cấu hình: ${displayName}`, "success");
                 this.isEditing = false;
                 setTimeout(() => this.fetchStatus(true), 1000);
            } else {
                 if(typeof Toast !== 'undefined') Toast.show("Lỗi: " + data.message, "error");
            }
        })
        .finally(() => {
             if(btn) {
                 btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>';
                 btn.disabled = false;
             }
        });
    }
};
