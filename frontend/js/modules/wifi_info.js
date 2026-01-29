const WifiModule = {
    init: function() {
        if (document.getElementById('wifi-popup-content')) {
            this.fetchData();
            this.refreshInterval = setInterval(() => {
                if(!document.getElementById('modal-wifi-edit')) {
                    this.fetchData();
                }
            }, 10000);
        }
    },

    validateKey: function() {
        const key = document.getElementById('edit-key').value;
        const btn = document.getElementById('btn-save');
        const msg = document.getElementById('key-msg');

        if (key.length > 0 && key.length < 8) {
            btn.disabled = true; 
            btn.style.opacity = '0.5'; 
            btn.style.cursor = 'not-allowed'; 
            msg.innerText = "⚠️ Mật khẩu phải từ 8 ký tự trở lên!";
        } else {
            btn.disabled = false; 
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            msg.innerText = ""; 
        }
    },

    fetchData: function() {
        fetch('/cgi-bin/wifi/get')
            .then(res => res.json())
            .then(data => this.render(data))
            .catch(err => {
                // Keep silent on error to avoid flickering, just log it

            });
    },



    updateBadge: function(totalClients) {
        const badge = document.getElementById('wifi-badge');
        if (badge) {
            if (totalClients > 0) {
                badge.style.display = 'flex';
                badge.innerText = totalClients;
            } else {
                badge.style.display = 'none';
            }
        }
    },

    render: function(wifis) {
        const container = document.getElementById('wifi-popup-content');
        if (!container) return;

        if (!wifis || wifis.length === 0) {
            container.innerHTML = '<div class="popup-body">Wifi đang tắt</div>';
            return;
        }

        const totalAllClients = wifis.reduce((sum, w) => sum + w.clients, 0);
        this.updateBadge(totalAllClients);
        
        const grouped = {};
        wifis.forEach(w => {
            if (!grouped[w.ssid]) {
                grouped[w.ssid] = { ssid: w.ssid, key: w.key, items: [], totalClients: 0 };
            }
            grouped[w.ssid].items.push(w);
            grouped[w.ssid].totalClients += w.clients;
        });
        const wifiList = Object.values(grouped);

        let headerTitle = "Hệ thống Wifi";
        let headerSub = "";

        if (wifiList.length === 1 && wifiList[0].items.length > 1) {
            headerTitle = "Smart Dual-Band";
            headerSub = `Gộp sóng • ${totalAllClients} thiết bị`;
        } else {
            headerTitle = "Wifi Networks";
            headerSub = `${wifiList.length} mạng đang phát • ${totalAllClients} thiết bị`;
        }

        let html = `
            <div class="popup-header-modern" style="align-items: flex-start;">
                <div class="ph-icon wifi-bg" style="margin-top: 5px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
                </div>
                <div class="ph-info">
                    <h4 style="font-size: 14px; line-height: 1.4; margin-bottom: 2px;">${headerTitle}</h4>
                    <span>${headerSub}</span>
                </div>
            </div>
            <div class="popup-body">
        `;

        wifiList.forEach((group, index) => {
            const passId = `wifi-pass-${index}`;
            const clientColor = group.totalClients > 0 ? '#3182ce' : '#a0aec0';
            const fmtWidth = (ht) => (ht || '').replace(/[A-Z]+/, '') + 'MHz';
            let tagHtml = '';
            let metaInfoHtml = ''; 
            if (group.items.length > 1) {
                tagHtml = `<span class="net-tag" style="background:linear-gradient(90deg, #805ad5, #b794f4); color:white; font-size: 9px;">2.4G + 5G</span>`;
                const w24 = group.items.find(i => i.band === '2.4GHz');
                const w5 = group.items.find(i => i.band === '5GHz');
                
                metaInfoHtml = `
                    <div style="font-size: 10px; color: var(--text-sub); margin-bottom: 8px; display:flex; flex-direction:column; gap:2px;">
                        ${w5 ? `<span style="display:flex; align-items:center; gap:4px;"><span style="width:6px; height:6px; background:#3182ce; border-radius:50%;"></span> 5G: Ch ${w5.channel} (${fmtWidth(w5.conf_htmode)})</span>` : ''}
                        ${w24 ? `<span style="display:flex; align-items:center; gap:4px;"><span style="width:6px; height:6px; background:#38a169; border-radius:50%;"></span> 2.4G: Ch ${w24.channel} (${fmtWidth(w24.conf_htmode)})</span>` : ''}
                    </div>
                `;
            } else {
                const item = group.items[0];
                const colorClass = item.band === '5GHz' ? 'tag-blue' : 'tag-green';
                tagHtml = `<span class="net-tag ${colorClass}" style="font-size: 9px;">${item.band}</span>`;
                
                metaInfoHtml = `
                    <div style="font-size: 10px; color: var(--text-sub); margin-bottom: 8px; display:flex; align-items:center; gap:5px;">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        Channel ${item.channel} • ${fmtWidth(item.conf_htmode)}
                    </div>
                `;
            }
            const mainItem = group.items.find(i => i.band === '5GHz') || group.items[0];
            const dataStr = encodeURIComponent(JSON.stringify(mainItem));
            
            // Chống XSS: escape SSID và key
            const safeSSID = window.Security ? Security.escapeHtml(group.ssid) : group.ssid;
            const safeKey = window.Security ? Security.escapeHtml(group.key) : group.key;

            html += `
                <div class="wifi-item">
                    <div class="wifi-info-row" style="margin-bottom: 2px;">
                        <span style="display:flex; align-items:center; gap:6px; font-size: 13px;">
                            ${safeSSID} ${tagHtml}
                        </span>
                        
                        <button class="btn-icon-small" onclick="WifiModule.openEditModal('${dataStr}')" title="Cấu hình">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3182ce" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                    </div>

                    ${metaInfoHtml}
                    
                    <div class="wifi-pass-container">
                        <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom:5px;">
                            <label style="margin:0; font-size: 11px;">Mật khẩu:</label>
                            
                            <div style="font-size:10px; color:${clientColor}; display:flex; align-items:center; gap:3px;">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                <strong>${group.totalClients}</strong>
                            </div>
                        </div>

                        <div class="pass-input-group">
                            <input type="password" value="${safeKey}" id="${passId}" readonly style="font-size: 12px;">
                            <button class="btn-icon-small" onclick="togglePass('${passId}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `

            </div>
        `;

        container.innerHTML = html;
    },

openEditModal: function(dataStr) {
        const w = JSON.parse(decodeURIComponent(dataStr));
        const is5G = w.band === "5GHz";
        
        // Chống XSS: escape SSID và key
        const safeSSID = window.Security ? Security.escapeHtml(w.ssid) : w.ssid;
        const safeKey = window.Security ? Security.escapeHtml(w.key) : w.key;

        let channelOptions = `<option value="auto" ${w.conf_channel == 'auto' ? 'selected' : ''}>Tự động (Auto)</option>`;
        
        // Use dynamic channels from backend, fallback to defaults
        let channelList = w.channels || [];
        if (channelList.length === 0) {
            channelList = is5G ? [36, 40, 44, 48, 149, 153, 157, 161] : [1,2,3,4,5,6,7,8,9,10,11,12,13];
        }
        channelList.forEach(ch => {
            channelOptions += `<option value="${ch}" ${w.conf_channel == ch ? 'selected' : ''}>Kênh ${ch}</option>`;
        });

        let modeOptions = '';
        if (w.caps && Array.isArray(w.caps) && w.caps.length > 0) {
            w.caps.forEach(opt => {
                const isSelected = w.conf_htmode === opt.val ? 'selected' : '';
                modeOptions += `<option value="${opt.val}" ${isSelected}>${opt.label}</option>`;
            });
        } else {
            modeOptions = `<option value="HT20">HT20 (Mặc định)</option>`;
        }

        // SINGLETON: Close any existing modals first to avoid stacking
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

        const modalHtml = `
            <div class="modal-overlay active" id="modal-wifi-edit" style="z-index: 99999;">
                <div class="modal-box" style="max-width: 450px; text-align:left;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
                        <div class="modal-icon" style="margin:0; width:40px; height:40px; font-size:20px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                        <h3 id="modal-title" style="margin:0;">Cấu hình ${w.band}</h3>
                    </div>
                    
                    <div style="display:grid; gap:15px;">
                        <div>
                            <label style="font-size:12px; color:#718096; display:block; margin-bottom:5px;">Tên Wifi (SSID)</label>
                            <input type="text" id="edit-ssid" value="${safeSSID}" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:8px;">
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <div>
                                <label style="font-size:12px; color:#718096; display:block; margin-bottom:5px;">Kênh (Channel)</label>
                                <select id="edit-channel" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:8px; background:var(--bg-card); color:var(--text-main);">
                                    ${channelOptions}
                                </select>
                            </div>
                            <div>
                                <label style="font-size:12px; color:#718096; display:block; margin-bottom:5px;">Chế độ (Mode)</label>
                                <select id="edit-htmode" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:8px; background:var(--bg-card); color:var(--text-main);">
                                    ${modeOptions}
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label style="font-size:12px; color:#718096; display:block; margin-bottom:5px;">Mật khẩu (WPA2-PSK)</label>
                            <input type="text" id="edit-key" value="${safeKey}" 
                                placeholder="Để trống = Không mật khẩu" 
                                oninput="WifiModule.validateKey()"
                                style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:8px;">
                            <div id="key-msg" style="font-size:12px; color:#e53e3e; margin-top:5px; min-height:18px;"></div>
                        </div>
                    </div>

                    <div class="modal-actions" style="margin-top:20px; justify-content:flex-end;">
                        <button class="btn-modal btn-secondary" onclick="WifiModule.closeEditModal()">Hủy bỏ</button>
                        <button id="btn-save" class="btn-modal btn-primary" onclick="WifiModule.saveWifi('${w.section}', '${w.device}')">Lưu cấu hình</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },
    
    closeEditModal: function() {
        const modal = document.getElementById('modal-wifi-edit');
        if (modal) modal.remove();
    },

    saveWifi: function(section, device) {
        const ssid = document.getElementById('edit-ssid').value;
        const key = document.getElementById('edit-key').value;
        const channel = document.getElementById('edit-channel').value;
        const htmode = document.getElementById('edit-htmode').value;
        // Note: enabled is always true when saving (no toggle in modal)
        const enabled = true;
        if (ssid.length < 1) { alert("Tên Wifi không được để trống!"); return; }
        if (key.length > 0 && key.length < 8) { alert("Mật khẩu phải từ 8 ký tự trở lên!"); return; }

        if(typeof Toast !== 'undefined') Toast.show("Đang lưu & Khởi động lại Wifi...", "info");
        this.closeEditModal();

        // Prepare Payload with CSRF
        const payload = { section, device, ssid, key, channel, htmode, enabled };
        if(typeof VWRT_API !== 'undefined' && VWRT_API.csrfToken) {
            payload.csrf_token = VWRT_API.csrfToken;
        }

        // Prepare Headers with CSRF
        const headers = {'Content-Type': 'application/json'};
        if(typeof VWRT_API !== 'undefined' && VWRT_API.csrfToken) {
            headers['X-CSRF-Token'] = VWRT_API.csrfToken;
        }

        fetch('/cgi-bin/wifi/set', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if(typeof Toast !== 'undefined') Toast.show("Thành công! Hãy đợi Wifi khởi động lại.", "success");
            setTimeout(() => this.fetchData(), 8000);
        })
        .catch(err => {
            if(typeof Toast !== 'undefined') Toast.show("Lỗi khi lưu cấu hình!", "error");
        });
    }
};