const HeaderModule = {
    template: `


        <div class="nav-item" id="nav-wifi" title="Wifi"><div class="icon-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg><span class="badge" id="wifi-badge" style="display:none; background:#3182ce; border-color:#3182ce;">0</span></div><div class="popup-box hidden" id="wifi-popup-content"><div class="popup-body" style="text-align:center; padding: 20px; color: #999;">Đang tải dữ liệu Wifi...</div></div></div>      
        <div class="nav-item" id="btn-theme-toggle" title="Giao diện"><div class="icon-btn"></div></div>
        <div class="nav-item" id="nav-settings" title="Cài đặt hệ thống"><div class="icon-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 0 2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div><div class="popup-box hidden" id="settings-popup-content" style="right: 0;"></div></div>
        <div class="nav-item" title="Đăng xuất"><div class="icon-btn btn-danger" id="btnTopLogout"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></div></div>
    `,

    init: function() {
        const container = document.getElementById('header-container');
        if (container) {
            container.innerHTML = this.template;
            this.initPopups();
            if (!document.getElementById('spinner-style')) {
                const s = document.createElement('style');
                s.id = 'spinner-style';
                s.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
                document.head.appendChild(s);
            }
        }
    },

    initPopups: function() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const btn = item.querySelector('.icon-btn');
            const popup = item.querySelector('.popup-box');
            if (!popup) return;
            
            btn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                navItems.forEach(other => { if (other !== item && other.querySelector('.popup-box')) other.querySelector('.popup-box').classList.add('hidden'); });
                popup.classList.toggle('hidden');
                
                if(item.id === 'nav-modem' && !popup.classList.contains('hidden')) {
                    this.updateModemInfo();
                }
            });
        });
        document.addEventListener('click', (e) => {
            navItems.forEach(item => {
                const popup = item.querySelector('.popup-box');
                if (popup && !popup.classList.contains('hidden') && !item.contains(e.target)) popup.classList.add('hidden');
            });
        });
    },

toggleExtra: function() {
    const el = document.getElementById('modem-extra-details');
    if(el) el.classList.toggle('hidden');
},

updateModemInfo: function() {
        fetch('/cgi-bin/mobile/get')
            .then(res => res.json())
            .then(res => {
                if(res.status === 'success' && res.data) {
                    const d = res.data;
                    const setTxt = (id, val) => { const e = document.getElementById(id); if(e) e.innerText = val || "--"; };
                    
                    setTxt('h-modem-num', d.own_number);
                    setTxt('h-modem-imei', d.imei);
                    setTxt('h-extra-manuf', d.manufacturer);
                    setTxt('h-extra-model', d.model || d.modem);
                    setTxt('h-extra-fw', d.firmware);
                }
            })
            .catch(e => console.error("Lỗi Modem:", e));
        fetch('/cgi-bin/mobile/network')
            .then(res => res.json())
            .then(data => {
                const modemIface = data.find(iface => 
                    (iface.proto === 'modemmanager' || iface.name.includes('wwan') || iface.label === '4G') &&
                    iface.ipv4 && iface.ipv4 !== '--'
                );

                const btn = document.getElementById('btn-active-net');
                const ipLabel = document.getElementById('h-modem-ip');

                if (modemIface) {
                    if(ipLabel) ipLabel.innerText = modemIface.ipv4;
                    
                    btn.disabled = true;
                    btn.style.background = "#48bb78";
                    btn.style.opacity = "1";
                    btn.style.cursor = "default";
                    btn.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-right:6px"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Đã kết nối
                    `;
                } else {
                    if(ipLabel) ipLabel.innerText = "--";
                    
                    btn.disabled = false;
                    btn.style.background = "#3182ce";
                    btn.style.cursor = "pointer";
                    btn.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                        Kích hoạt mạng
                    `;
                }
            })
            .catch(err => console.error("Lỗi check network", err));
    },

    checkNetwork: function() {
        fetch('/cgi-bin/mobile/network')
            .then(res => res.json())
            .then(data => {
                const modemIface = data.find(iface => 
                    (iface.proto === 'modemmanager' || iface.name.includes('wwan')) && iface.ipv4 && iface.ipv4 !== '--'
                );
                const btn = document.getElementById('btn-active-net');
                const ipLabel = document.getElementById('h-modem-ip');

                if (modemIface) {
                    if(ipLabel) ipLabel.innerText = modemIface.ipv4;
                    btn.disabled = true;
                    btn.style.background = "#48bb78";
                    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-right:6px"><polyline points="20 6 9 17 4 12"></polyline></svg> Đã kết nối`;
                } else {
                    if(ipLabel) ipLabel.innerText = "--";
                    btn.disabled = false;
                    btn.style.background = "#3182ce";
                    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg> Kích hoạt mạng`;
                }
            });
    },

    triggerModemAction: function() {
        const btn = document.getElementById('btn-active-net');
        const statusDiv = document.getElementById('modem-action-status');
        
        btn.disabled = true;
        btn.style.opacity = "0.7";
        btn.innerHTML = `<span style="border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; width: 12px; height: 12px; animation: spin 1s linear infinite; display: inline-block; margin-right: 6px;"></span> Đang xử lý...`;
        
        statusDiv.style.display = 'block';
        statusDiv.style.color = 'var(--text-sub)';
        statusDiv.innerText = "Đang tìm thiết bị & Khởi động lại...";

        const payload = { action: 'restart' };
        const headers = { 'Content-Type': 'application/json' };
        if(typeof VWRT_API !== 'undefined' && VWRT_API.csrfToken) {
            payload.csrf_token = VWRT_API.csrfToken;
            headers['X-CSRF-Token'] = VWRT_API.csrfToken;
        }

        fetch('/cgi-bin/mobile/action', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    statusDiv.innerText = "Thành công! Đang lấy IP...";
                    statusDiv.style.color = "#48bb78";
                } else {
                    statusDiv.innerText = "Lỗi: " + (data.message || "Không xác định");
                    statusDiv.style.color = "#e53e3e";
                }
                setTimeout(() => {
                    this.updateModemInfo();
                }, 5000);
            })
            .catch(err => {
                statusDiv.innerText = "Lỗi kết nối!";
                statusDiv.style.color = "#e53e3e";
                btn.disabled = false;
                btn.style.opacity = "1";
                btn.innerHTML = "Thử lại";
            });
    },

    initLinks: function() {
        const luciLink = document.getElementById('luci-link');
        if (luciLink) luciLink.href = `${window.location.protocol}//${window.location.hostname}/cgi-bin/luci`;
    }
};
window.HeaderModule = HeaderModule;