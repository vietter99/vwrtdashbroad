const Mwan3Module = {
    intervalId: null,
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
                    /* Modernized MultiWAN Styles */
                    #mwan3-container { font-family: 'Inter', sans-serif; text-align: left; }
                    .mw-body { padding: 10px 0; background: transparent; color: var(--text-main); text-align: left; }
                    .mw-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.03); transition: transform 0.2s, box-shadow 0.2s; }
                    .mw-card:hover { box-shadow: 0 8px 16px rgba(0,0,0,0.06); }
                    .mw-status-card { background: transparent; border: none; padding: 0; box-shadow: none; margin-bottom: 20px; }
                    
                    .mw-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
                    .mw-table th { text-align: left; padding: 12px 15px; color: var(--text-sub); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-color); }
                    .mw-table td { padding: 15px; background: var(--bg-card); color: var(--text-main); font-size: 14px; font-weight: 500; }
                    .mw-table tr td:first-child { border-top-left-radius: 12px; border-bottom-left-radius: 12px; border: 1px solid var(--border-color); border-right: none; }
                    .mw-table tr td:nth-child(n+2) { border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
                    .mw-table tr td:last-child { border-top-right-radius: 12px; border-bottom-right-radius: 12px; border-right: 1px solid var(--border-color); }
                    
                    .mw-guide-box { margin-top: 25px; padding: 20px; background: var(--bg-body); border: 1px dashed var(--border-color); border-radius: 16px; font-size: 13px; color: var(--text-main); line-height: 1.6; }
                    .mw-guide-header { font-weight: 700; color: var(--primary-color); margin-bottom: 6px; }
                    .mw-guide-ul { color: var(--text-sub); padding-left: 10px; margin: 6px 0 0 0; list-style-position: inside; }
                    
                    /* Modern Tabs */
                    .mw-tabs { display: flex; gap: 12px; margin-bottom: 20px; padding: 5px; background: var(--bg-body); border-radius: 12px; width: fit-content; border: 1px solid var(--border-color); }
                    .mw-tab { padding: 10px 20px; font-weight: 600; color: var(--text-sub); cursor: pointer; border-radius: 8px; transition: all 0.3s ease; font-size: 14px; }
                    /* Inputs & Buttons */
                    .mw-input-modern { width: 100%; max-width: 120px; margin: 0 auto; display: block; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 8px; font-weight: 600; color: var(--text-main); background: var(--bg-input); transition: all 0.3s; font-family: 'Inter', sans-serif; text-align: center; }
                    .mw-input-full { max-width: 100%; text-align: left; }
                    .mw-input-modern:focus { border-color: var(--primary-color); outline: none; box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.15); }
                    .mw-btn-icon { background: var(--bg-input); color: var(--primary-color); border: 1px solid var(--border-color); width: 36px; height: 36px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.3s; }
                    .mw-btn-icon:hover:not(:disabled) { background: var(--primary-color); color: white; border-color: var(--primary-color); transform: translateY(-2px); }
                    .mw-center { text-align: center !important; }
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
    
    // Tab removed

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
                    color = '#48bb78'; // Milder Green
                    bgColor = 'rgba(72, 187, 120, 0.1)'; 
                    statusText = 'Đang hoạt động';
                } else {
                    color = '#ed8936'; // Standard Orange
                    bgColor = 'rgba(237, 137, 54, 0.1)';
                    statusText = 'Đang chờ (Backup)';
                }
            } else {
                color = '#e53e3e'; // Milder Red
                bgColor = 'rgba(229, 62, 62, 0.1)';
            }

            html += `
                <div class="mw-status-item" style="flex: 1; min-width: 160px; background: var(--bg-card); border: 1px solid var(--border-color); padding: 20px; border-radius: 16px; display: flex; flex-direction: column; gap: 10px; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.02); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; width: 6px; height: 100%; background: ${color};"></div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-left: 10px;">
                        <div>
                            <div class="status-label" style="font-weight: 800; color: var(--text-main); text-transform: uppercase; font-size: 20px; letter-spacing: 0.5px;">
                            ${name}
                        </div>
                        <div class="status-text" style="font-size: 13px; font-weight: 600; color: ${color}; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${color}; box-shadow: 0 0 6px ${color};"></span>
                            ${statusText}
                        </div>
                    </div>
                    ${iface.load && iface.load !== '0%' ? `
                        <div style="background: ${bgColor}; color: ${color}; font-size: 14px; padding: 6px 12px; border-radius: 8px; font-weight: 700; border: 1px solid ${color}30;">
                            ${iface.load}
                        </div>
                    ` : ''}
                    </div>
                </div>
            `;
        });
        
        if(!Object.keys(interfaces).length) html += `<div style="color: #64748b; font-style: italic;">Đang kiểm tra kết nối...</div>`;

        html += `   </div>
                </div>

                <!-- Content -->
                <div class="mw-card">
                    ${this.renderMembersTab(members)}
                </div>
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
                        <th style="width: 20%; text-align: left;">Cổng mạng</th>
                        <th style="width: 30%; text-align: center;">Độ ưu tiên</th>
                        <th style="width: 30%; text-align: center;">Tỷ lệ tải</th>
                        <th style="width: 20%; text-align: right;">Lưu</th>
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
                        <td data-label="Cổng mạng" style="text-align: left; vertical-align: middle;">
                            <div style="font-weight: 700; color: var(--text-main); font-size: 15px;">${m.interface}</div>
                        </td>
                        <td data-label="Độ ưu tiên" style="text-align: center; vertical-align: middle;">
                            <input type="number" id="metric-${m.name}" class="mw-input-modern" value="${m.metric}" onfocus="Mwan3Module.isEditing=true" onblur="Mwan3Module.isEditing=false" placeholder="VD: 1">
                        </td>
                        <td data-label="Tỷ lệ tải" style="text-align: center; vertical-align: middle;">
                            <input type="number" id="weight-${m.name}" class="mw-input-modern" value="${m.weight}" onfocus="Mwan3Module.isEditing=true" onblur="Mwan3Module.isEditing=false" placeholder="VD: 10">
                        </td>
                        <td data-label="Lưu" style="text-align: right; vertical-align: middle;">
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

    // Tracking code removed

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
                weight: weight,
                csrf_token: VWRT_API.csrfToken
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
