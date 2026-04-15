const MobileModule = {
    errorCount: 0,

    init: function () {
        const container = document.getElementById('mobile-popup-content');
        if (container) this.renderTemplate(container);

        this.fetchTTL(); // Init TTL value (Keep this separate as it's one-time)
    },

    processNetworkInfo: function (data) {
        let rawMode = (data.mode || "").trim();
        let displayType = "MOBILE";

        if (rawMode.includes("NR") || rawMode.includes("5G") || rawMode.includes("ENDC")) {
            displayType = "5G";
        } else if (rawMode.includes("LTE-A")) {
            displayType = "LTE-A";
        } else if (rawMode.includes("LTE")) {
            displayType = "LTE";
        } else if (rawMode.includes("WCDMA") || rawMode.includes("3G")) {
            displayType = "3G";
        }

        let bandText = rawMode;
        if (bandText.includes('|')) {
            bandText = bandText.split('|')[1].trim();
        } else {
            bandText = bandText.replace(/^(LTE|LTE-A|5G|ENDC|NSA)\s*/i, '').trim();
        }
        if (!bandText) bandText = "--";

        return {
            type: displayType,
            bandText: bandText
        };
    },

    getTempColor: function (tempStr) {
        let t = parseFloat(tempStr);
        if (isNaN(t)) return "var(--text-sub)";
        if (t < 50) return "#48bb78";
        if (t < 65) return "#ed8936";
        return "#e53e3e";
    },

    getPingColor: function (msStr) {
        let ms = parseFloat(msStr);
        if (isNaN(ms)) return "var(--text-sub)";
        if (ms < 60) return "#48bb78"; // Good (Green)
        if (ms < 150) return "#ed8936"; // Fair (Orange)
        return "#e53e3e"; // Bad (Red)
    },



    renderTemplate: function (container) {
        container.innerHTML = `
            <div class="popup-header-modern" style="padding: 15px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 10px;">
                <div class="ph-icon mobile-bg" style="width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                </div>
                <div class="ph-info" style="flex: 1;">
                    <h4 id="mob-operator" style="margin: 0; font-size: 14px; color: var(--text-main);">Đang tải...</h4>
                    <span id="mob-mode" style="font-size: 11px; color: var(--text-sub);">Checking...</span>
                </div>
            </div>
            
            <div class="popup-body" style="padding: 15px;">
                <div style="display:flex; align-items:center; background:var(--icon-bg); padding:10px; border-radius:8px; margin-bottom:10px; border: 1px solid var(--border-color);">
                    <div class="signal-visual" id="signal-bars" style="display: flex; align-items: flex-end; gap: 3px; height: 25px;">
                        <div class="signal-bar b-1" style="height:20%;"></div>
                        <div class="signal-bar b-2" style="height:40%;"></div>
                        <div class="signal-bar b-3" style="height:60%;"></div>
                        <div class="signal-bar b-4" style="height:80%;"></div>
                        <div class="signal-bar b-5" style="height:100%;"></div>
                    </div>
                    <div class="signal-text-group" style="margin-left: 10px;">
                        <span class="signal-dbm" id="mob-signal" style="font-weight: bold; font-size: 14px; color: var(--text-main);">-- %</span>
                        <span class="signal-type" id="mob-status" style="font-size: 10px; color: var(--text-sub); display: block;">--</span>
                    </div>
                </div>

                <div style="margin-bottom: 5px; font-size: 12px; display: flex; justify-content: space-between;">
                    <span style="color: var(--text-sub);">Thiết bị</span> 
                    <span style="font-weight: 600; color: var(--text-main);" id="mob-model">--</span>
                </div>
                <div style="margin-bottom: 5px; font-size: 12px; display: flex; justify-content: space-between;">
                    <span style="color: var(--text-sub);">Firmware</span> 
                    <span style="font-weight: 600; color: var(--text-main);" id="mob-fw">--</span>
                </div>
                <div style="border-bottom: 1px dashed var(--border-color); margin: 5px 0;"></div>

                <div style="margin-bottom: 5px; font-size: 12px; display: flex; justify-content: space-between;">
                    <span style="color: var(--text-sub);">Hãng SX</span> 
                    <span style="font-weight: 600; color: var(--text-main);" id="mob-provider">--</span>
                </div>
                <div style="margin-bottom: 5px; font-size: 12px; display: flex; justify-content: space-between;">
                    <span style="color: var(--text-sub);">Băng tần chính</span> 
                    <span style="font-weight: 600; color: var(--text-main);" id="mob-band-main">--</span>
                </div>

                <div style="border-bottom: 1px dashed var(--border-color); margin: 5px 0;"></div>
                
                <div style="margin-bottom: 5px; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-sub);">TTL Custom</span> 
                    <div style="display:flex; gap:5px;">
                        <input type="number" id="inp-ttl" placeholder="IPv4 TTL" style="width:60px; padding:2px 5px; border:1px solid var(--border-color); border-radius:4px; font-size:12px;">
                        <button onclick="MobileModule.setTTL()" style="border:none; background:var(--primary-color, #3182ce); color:white; border-radius:4px; padding:2px 8px; font-size:11px; cursor:pointer;">Set</button>
                    </div>
                </div>
            </div>
        `;
    },

    // Unified Dashboard Loop handles fetching
    updateFromDashboard: function (mobData, isFast = false) {
        if (!mobData) {
            if (!isFast) this.handleError();
            return;
        }
        this.errorCount = 0;
        this.updateUI(mobData, isFast);
    },

    handleError: function () {
        this.errorCount++;
        if (this.errorCount > 3) {
            const emptyData = { operator_name: "-", signal: "0", mode: "-" };
            this.updatePopup(emptyData);
            this.updateDashboardCard(emptyData);
        }
    },

    updateUI: function (data, isFast = false) {
        if (isFast) {
            // Fast update: Only signal bars & percentage
            this.updateSignalBars(data);
            return;
        }

        if ((data.operator_name === "-" || !data.operator_name) && (data.signal === "-" || !data.signal)) {
            return;
        }

        const netInfo = this.processNetworkInfo(data);
        data.display_type = netInfo.type;
        data.display_band = netInfo.bandText;

        this.updatePopup(data);
        this.updateDashboardCard(data);
    },

    updateSignalBars: function (data) {
        let signalPercent = parseInt(data.signal);
        if (isNaN(signalPercent)) return;

        // 1. Update Card Bar
        const elSigBar = document.getElementById('mob-card-signal-bar');
        const elSigText = document.getElementById('mob-card-signal-text');
        if (elSigBar) {
            elSigBar.style.width = `${signalPercent}%`;
            if (elSigText) elSigText.innerText = `${signalPercent}%`;
            elSigBar.style.background = signalPercent > 70 ? '#48bb78' : (signalPercent > 30 ? '#ed8936' : '#e53e3e');
        }

        // 2. Update Popup Bars (if open)
        const bars = document.querySelectorAll('#signal-bars .signal-bar');
        if (bars.length > 0) {
            const elSigVal = document.getElementById('mob-signal');
            if (elSigVal) elSigVal.innerText = signalPercent + "%";

            let level = Math.ceil(signalPercent / 20);
            if (level < 1 && signalPercent > 0) level = 1;
            bars.forEach((b, index) => {
                b.classList.remove('active', 'bad', 'weak');
                if (index < level) {
                    b.classList.add('active');
                    if (level <= 2) b.classList.add('bad');
                    else if (level <= 3) b.classList.add('weak');
                }
            });
        }

        // 3. Update Chart
        if (typeof ChartsModule !== 'undefined') {
            ChartsModule.updateMobileSignal(signalPercent);
        }
    },

    updatePopup: function (data) {
        const setTxt = (id, txt) => { const e = document.getElementById(id); if (e) e.innerText = txt; };

        // Popup Title: Hardware Manufacturer (e.g., Fibocom, Dell, Sierra)
        setTxt('mob-operator', data.manufacturer || data.model || "Modem");
        setTxt('mob-mode', data.display_type || "--");

        // Popup Details Field: Hãng SX
        setTxt('mob-provider', data.manufacturer || "--");
        setTxt('mob-band-main', data.display_band);
        setTxt('mob-model', data.modem || data.model || "--");
        setTxt('mob-fw', data.firmware || "--");

        let signalPercent = parseInt(data.signal);
        if (isNaN(signalPercent)) signalPercent = 0;
        setTxt('mob-signal', signalPercent + "%");

        const isReg = data.registration === "1" || data.registration === "5";
        const elStatus = document.getElementById('mob-status');
        if (elStatus) {
            elStatus.innerText = isReg ? "Đã kết nối internet" : "Chưa đăng ký mạng";
            elStatus.style.color = isReg ? "var(--text-sub)" : "#e53e3e";
        }

        const bars = document.querySelectorAll('#signal-bars .signal-bar');
        let level = Math.ceil(signalPercent / 20);
        if (level < 1 && signalPercent > 0) level = 1;
        bars.forEach((b, index) => {
            b.className = 'signal-bar ' + (index === 0 ? 'b-1' : index === 1 ? 'b-2' : index === 2 ? 'b-3' : index === 3 ? 'b-4' : 'b-5');
            b.classList.remove('active', 'bad', 'weak');
            if (index < level) {
                b.classList.add('active');
                if (level <= 2) b.classList.add('bad');
                else if (level <= 3) b.classList.add('weak');
            }
        });
    },

    // Persistent state for expanded panel
    isModemExpanded: false,

    updateDashboardCard: function (data) {
        const card = document.getElementById('card-mobile');
        if (!card) return;

        // 1. Initial Render (Only if the modern structure doesn't exist yet)
        if (!card.querySelector('.status-card-inner')) {
            this.renderInitialCard(card, data);
        }

        // 2. Data Update (No innerHTML overwrite here to keep chart/panel state)
        const isp = (data.operator_name || "NHÀ MẠNG").toUpperCase();
        const mode = (data.display_type || "MOBILE").replace(/\(wifi\s*6\)/gi, '').trim();
        const signal = parseInt(data.signal) || 0;
        const temp = data.mtemp || "--";
        const band = (data.display_band || "--").replace(/\s*\([^)]*\)/g, '').trim();
        const ttl = data.ttl || "64";
        const ping = (data.ping || "--");

        // Update Header & Badge
        const elIsp = card.querySelector('.mob-isp-name');
        if (elIsp) elIsp.innerText = isp;
        const elMode = card.querySelector('.net-tag');
        if (elMode) elMode.innerText = mode;

        // Update Signal Bar & Text
        const elSigBar = document.getElementById('mob-card-signal-bar');
        const elSigText = document.getElementById('mob-card-signal-text');
        if (elSigBar) elSigBar.style.width = `${signal}%`;
        if (elSigText) elSigText.innerText = `${signal}%`;

        // Update Grid Values (Order: Band, Temp, TTL, Ping)
        const gridVals = card.querySelectorAll('.grid-val');
        if (gridVals.length >= 4) {
            gridVals[0].innerText = band;
            gridVals[1].innerText = temp + "°C";
            gridVals[2].innerText = ttl;
            gridVals[3].innerText = ping + "ms";
        }

        // Update Chart via ChartsModule (it won't flicker now as canvas is persistent)
        if (typeof ChartsModule !== 'undefined' && ChartsModule.updateMobileSignal) {
            ChartsModule.updateMobileSignal(signal);
        }
    },

    renderInitialCard: function (card, data) {
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.padding = '0';

        const isp = (data.operator_name || "NHÀ MẠNG").toUpperCase();
        const mode = (data.display_type || "MOBILE").replace(/\(wifi\s*6\)/gi, '').trim();
        const signal = parseInt(data.signal) || 0;

        // Show cached modem info if we have it
        const m = this.modemDetails || {};
        const modemModel = m.model || m.modem || "Modem";
        const ownNumber = m.own_number || "SIM Ready";

        card.innerHTML = `
            <div class="status-card-inner" style="padding: 18px; width: 100%; box-sizing: border-box;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div class="icon-premium icon-grad-green">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20"></path></svg>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <span class="mob-isp-name" style="font-size:14px; font-weight:800; color:var(--text-main);">${isp}</span>
                            <span class="mob-modem-sub" style="font-size:10px; color:var(--text-sub); font-family:monospace; opacity:0.8;">${modemModel} • ${ownNumber}</span>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="net-tag tag-blue" style="margin:0; padding:2px 8px; font-size:10px;">${mode}</span>
                        <button class="btn-icon-small" onclick="MobileModule.toggleModemDetails()" style="background:var(--icon-bg); border-radius:6px; border:1px solid var(--border-color); color:var(--text-sub); width:22px; height:22px; display:flex; align-items:center; justify-content:center;" title="Thông tin chi tiết">
                            <svg id="mob-chevron" class="chevron-icon ${this.isModemExpanded ? 'rotated' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>
                        </button>
                    </div>
                </div>

                <div style="margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                        <span style="font-size:10px; color:var(--text-sub); text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Tín hiệu mạng</span>
                        <span id="mob-card-signal-text" style="font-size:12px; font-weight:800; color:#48bb78;">${signal}%</span>
                    </div>
                    <div class="p-bar-bg" style="height:6px; background:var(--icon-bg); border-radius:10px; overflow:hidden;">
                        <div id="mob-card-signal-bar" style="width:${signal}%; height:100%; background:linear-gradient(90deg, #48bb78, #38a169); transition: width 0.8s ease;"></div>
                    </div>
                </div>

                <div style="height:45px; margin-bottom:12px; opacity:0.8;">
                    <canvas id="chart-mobile-canvas"></canvas>
                </div>

                <div class="mobile-info-grid">
                    <div class="grid-item" style="background:var(--icon-bg); border-radius:10px; padding:10px; border:1px solid var(--border-color);"><span class="grid-label" style="font-size:9px;">BAND</span><span class="grid-val" style="font-size:11px;">--</span></div>
                    <div class="grid-item" style="background:var(--icon-bg); border-radius:10px; padding:10px; border:1px solid var(--border-color);"><span class="grid-label" style="font-size:9px;">NHIỆT ĐỘ</span><span class="grid-val" style="color:#ed8936; font-size:11px;">--</span></div>
                    <div class="grid-item" onclick="MobileModule.showTTLEdit()" style="background:var(--icon-bg); border-radius:10px; padding:10px; border:1px solid var(--border-color); cursor:pointer; position:relative;" title="Nhấn để chỉnh sửa TTL">
                        <span class="grid-label" style="font-size:9px; display:flex; justify-content:space-between;">TTL <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></span>
                        <span class="grid-val" id="mob-card-ttl" style="font-size:11px;">--</span>
                    </div>
                    <div class="grid-item" style="background:var(--icon-bg); border-radius:10px; padding:10px; border:1px solid var(--border-color);"><span class="grid-label" style="font-size:9px;">PING</span><span class="grid-val" style="color:#3182ce; font-size:11px;">--</span></div>
                </div>

                <div id="modem-details-panel" class="modem-info-panel" style="padding:0; overflow:hidden;">
                    <div style="padding:15px; border-top:1px dashed var(--border-color); margin-top:10px;">
                        <div class="modem-detail-item"><label>IMEI:</label><span id="mob-det-imei">Đang lấy...</span></div>
                        <div class="modem-detail-item"><label>Firmware:</label><span id="mob-det-fw">Đang lấy...</span></div>
                        <div class="modem-detail-item"><label>Hãng SX:</label><span id="mob-det-manu">--</span></div>
                    </div>
                </div>
            </div>
        `;

        // Load modem details into the initial frame
        if (this.modemDetails) {
            this.updateModemDetailsUI();
        } else {
            fetch('/cgi-bin/mobile/get')
                .then(res => res.json())
                .then(res => {
                    if (res.status === 'success') {
                        this.modemDetails = res.data;
                        this.updateModemDetailsUI();
                    }
                });
        }
    },

    updateModemDetailsUI: function () {
        if (!this.modemDetails) return;
        const m = this.modemDetails;
        const setSpan = (id, val) => { const e = document.getElementById(id); if (e) e.innerText = val; };
        setSpan('mob-det-imei', m.imei || "--");
        setSpan('mob-det-fw', m.firmware || "--");
        setSpan('mob-det-manu', m.manufacturer || "--");

        const sub = document.querySelector('.mob-modem-sub');
        if (sub) sub.innerText = `${m.model || m.modem || "Modem"} • ${m.own_number || "SIM Ready"}`;
    },

    toggleModemDetails: function () {
        this.isModemExpanded = !this.isModemExpanded;
        const panel = document.getElementById('modem-details-panel');
        if (panel) panel.classList.toggle('expanded');

        const icon = document.getElementById('mob-chevron');
        if (icon) icon.classList.toggle('rotated', this.isModemExpanded);
    },

    restartModem: function () {
        if(typeof Modal !== 'undefined') {
            Modal.confirm(
                "Khởi động lại Modem",
                "Xác nhận khởi động lại kết nối Modem?",
                () => { this.executeRestartModem(); }
            );
        } else if(confirm("Xác nhận khởi động lại kết nối Modem?")) {
            this.executeRestartModem();
        }
    },

    executeRestartModem: function () {
        const btn = document.getElementById('btn-restart-modem');
        const statusDiv = document.getElementById('modem-action-status');

        btn.disabled = true;
        btn.innerHTML = `<span style="border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; width: 12px; height: 12px; animation: spin 1s linear infinite; display: inline-block; margin-right: 6px;"></span> Đang xử lý...`;

        statusDiv.style.display = 'block';
        statusDiv.style.color = 'var(--text-sub)';
        statusDiv.innerText = "Đang gửi lệnh Restart...";

        const payload = { action: 'restart' };
        fetch('/cgi-bin/mobile/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    statusDiv.innerText = "Thành công! Modem đang khởi động lại...";
                    statusDiv.style.color = "#48bb78";
                    setTimeout(() => {
                        statusDiv.style.display = 'none';
                        btn.disabled = false;
                        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px;"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> Khởi động lại Modem`;
                        this.toggleModemDetails();
                    }, 5000);
                } else {
                    statusDiv.innerText = "Lỗi: " + (data.message || "Không rõ");
                    statusDiv.style.color = "#e53e3e";
                    btn.disabled = false;
                }
            })
            .catch(() => {
                statusDiv.innerText = "Lỗi kết nối!";
                statusDiv.style.color = "#e53e3e";
                btn.disabled = false;
            });
    },

    updatePing: function (pingStr) {
        const elPing = document.getElementById('mob-card-ping');
        if (elPing) {
            if (pingStr && pingStr !== '-') {
                elPing.innerText = pingStr + " ms";
                elPing.style.color = this.getPingColor(pingStr);
            } else {
                elPing.innerText = "--";
                elPing.style.color = "var(--text-sub)";
            }
        }
    },

    fetchTTL: function () {
        fetch('/cgi-bin/ttl/index')
            .then(r => r.json())
            .then(d => {
                const el = document.getElementById('mob-card-ttl');
                if (el && d.ttl && d.ttl > 0) el.innerText = d.ttl;
                else if (el) el.innerText = "--";
            }).catch(() => { });
    },

    setTTL: function () {
        const el = document.getElementById('inp-ttl');
        if (!el) return;
        const val = parseInt(el.value);

        if (typeof Toast !== 'undefined') Toast.show("Đang áp dụng TTL...", "info");

        fetch('/cgi-bin/ttl/index', {
            method: 'POST',
            body: JSON.stringify({ ttl: val || 0 })
        })
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') {
                    if (typeof Toast !== 'undefined') Toast.show("Đã set TTL: " + (val || "Disabled"), "success");
                } else {
                    if (typeof Toast !== 'undefined') Toast.show("Lỗi: " + d.message, "error");
                }
            })
            .catch(() => {
                if (typeof Toast !== 'undefined') Toast.show("Lỗi kết nối", "error");
            });
    },

    showModemDetails: function () {
        if (typeof Modal === 'undefined') return;

        const loadingId = Modal.show({
            title: " ", // Space to avoid 'Thông báo' default
            content: `
                <div style="text-align:center;"><div class="spinner"></div></div>
            `
        });

        // Fetch details
        fetch('/cgi-bin/mobile/get')
            .then(r => r.json())
            .then(res => {
                Modal.close(loadingId);
                if (res.status === 'success' && res.data) {
                    const d = res.data;
                    const isConnected = (d.state === 'connected' || d.sub_state === 'connected');

                    const content = `
                        <style>
                            .modal-box h3 { display: none !important; } /* Hide default title */
                            .modal-box { padding: 0 !important; border-radius: 16px !important; overflow: visible !important; }
                            .modal-box > button { 
                                color: white !important; 
                                top: 15px !important; 
                                right: 15px !important; 
                                z-index: 10;
                                opacity: 0.8;
                             }
                            .modal-box > button:hover { opacity: 1; }
                            
                            .modem-info-modal { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                            .modem-header { 
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                padding: 25px 20px 20px; 
                                border-radius: 12px 12px 0 0; 
                                color: white;
                                display: flex;
                                align-items: center;
                                gap: 15px;
                            }
                            .modem-icon-box {
                                width: 50px; height: 50px;
                                background: rgba(255,255,255,0.2);
                                border-radius: 14px;
                                display: flex; align-items: center; justify-content: center;
                                backdrop-filter: blur(4px);
                            }
                            .modem-body { padding: 20px; }
                            .modem-row {
                                display: flex; justify-content: space-between; align-items: center;
                                padding: 12px 0;
                                border-bottom: 1px solid #f0f0f0;
                                font-size: 14px;
                            }
                            .modem-label { color: #718096; }
                            .modem-val { font-weight: 600; color: #2d3748; }
                            .val-phone { color: #e53e3e; font-size: 15px; }
                            .val-ip { color: #3182ce; font-size: 15px; }
                            .val-imei { font-family: monospace; letter-spacing: 0.5px; }
                            
                            .sys-info-block {
                                background: #f8fafc;
                                border-radius: 10px;
                                padding: 12px 15px;
                                margin-top: 15px;
                                border: 1px solid #edf2f7;
                            }
                            .sys-row {
                                display: flex; justify-content: space-between;
                                font-size: 13px;
                                margin-bottom: 6px;
                            }
                            .sys-row:last-child { margin-bottom: 0; }
                            .sys-label { color: #a0aec0; }
                            .sys-val { color: #4a5568; font-weight: 600; text-align: right; }
                            
                            .status-btn {
                                width: 100%;
                                padding: 12px;
                                margin-top: 20px;
                                background: ${isConnected ? '#48bb78' : '#e53e3e'};
                                border: none;
                                border-radius: 10px;
                                color: white;
                                font-weight: 700;
                                font-size: 14px;
                                display: flex; justify-content: center; align-items: center; gap: 8px;
                                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                            }
                        </style>
                        <div class="modem-info-modal">
                            <div class="modem-header">
                                <div class="modem-icon-box">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
                                </div>
                                <div>
                                    <div style="font-size: 19px; font-weight: 700; margin-bottom: 2px;">Thông tin Modem</div>
                                    <div style="font-size: 12px; opacity: 0.85;">Quản lý kết nối</div>
                                </div>
                            </div>
                            
                            <div class="modem-body">
                                <div class="modem-row">
                                    <span class="modem-label">Số điện thoại:</span>
                                    <span class="modem-val val-phone">${d.own_number || '--'}</span>
                                </div>
                                <div class="modem-row">
                                    <span class="modem-label">IP WAN:</span>
                                    <span class="modem-val val-ip">${d.wan_ip || '--'}</span>
                                </div>
                                <div class="modem-row">
                                    <span class="modem-label">IMEI:</span>
                                    <span class="modem-val val-imei">${d.imei || '--'}</span>
                                </div>
                                
                                <div class="sys-info-block">
                                    <div class="sys-row"><span class="sys-label">Hãng SX</span><span class="sys-val">${d.manufacturer || '--'}</span></div>
                                    <div class="sys-row"><span class="sys-label">Model</span><span class="sys-val">${d.model || '--'}</span></div>
                                    <div class="sys-row"><span class="sys-label">Firmware</span><span class="sys-val" style="font-family:monospace">${d.firmware || '--'}</span></div>
                                </div>

                                <button class="status-btn">
                                    ${isConnected ? '✓ Đã kết nối' : '✕ Mất kết nối'}
                                </button>
                            </div>
                        </div>
                    `;

                    Modal.show({
                        title: " ",
                        content: content,
                        showCancel: false,
                        showConfirm: false
                    });
                } else {
                    Modal.show({ title: "Lỗi", content: "Không lấy được thông tin modem." });
                }
            })
            .catch(() => {
                Modal.show({ title: "Lỗi", content: "Mất kết nối server." });
            });
    },

    showTTLModal: function () {
        if (typeof Modal === 'undefined') return;

        // Show Loading first
        const loadingId = Modal.show({
            title: "Cấu hình TTL",
            content: `
                <div style="text-align:center;">
                    <p style="margin-bottom:10px; color:var(--text-sub);">Đang tải cấu hình...</p>
                    <div class="spinner"></div>
                </div>
            `
        });

        // Fetch current
        fetch('/cgi-bin/ttl/index').then(r => r.json()).then(d => {
            Modal.close(loadingId);
            const current = (d.ttl && d.ttl > 0) ? d.ttl : "";

            Modal.show({
                title: "Cấu hình TTL (Bypass Hotspot)",
                content: `
                    <div style="padding: 10px;">
                        <p style="margin-bottom: 15px; color: var(--text-sub); font-size: 13px;">
                            Nhập giá trị TTL (thường là <b>64</b> hoặc <b>65</b> để bypass):
                        </p>
                        <div style="display:flex; gap:10px; justify-content:center;">
                            <input type="number" id="modal-ttl-input" placeholder="Ví dụ: 64" value="${current}" 
                                style="padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; width: 100px; text-align: center; font-weight: bold;">
                        </div>
                        <div style="margin-top: 15px; font-size: 12px; color: #718096; text-align: center;">
                            Để trống hoặc nhập 0 để tắt tính năng này.
                        </div>
                    </div>
                `,
                onConfirm: () => {
                    const inp = document.getElementById('modal-ttl-input');
                    const val = inp ? parseInt(inp.value) : 0;
                    this.doSetTTL(val);
                },
                confirmText: "Áp dụng",
                cancelText: "Hủy"
            });
        });
    },

    showTTLEdit: function () {
        if (typeof Modal === 'undefined') return;

        // Use currently displayed TTL from grid or data
        const current = document.getElementById('mob-card-ttl')?.innerText || "64";

        Modal.show({
            title: "Cấu hình TTL (IPv4)",
            content: `
                <div style="padding: 10px;">
                    <p style="margin-bottom: 15px; color: var(--text-sub); font-size: 13px;">
                        Nhập giá trị TTL (thường là <b>64</b> hoặc <b>65</b> để bypass):
                    </p>
                    <div style="display:flex; gap:10px; justify-content:center;">
                        <input type="number" id="modal-ttl-input" placeholder="Ví dụ: 64" value="${current}" 
                            style="padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; width: 100px; text-align: center; font-weight: bold;">
                    </div>
                </div>
            `,
            onConfirm: () => {
                const inp = document.getElementById('modal-ttl-input');
                const val = inp ? parseInt(inp.value) : 0;
                this.doSetTTL(val);
            },
            confirmText: "Áp dụng",
            cancelText: "Hủy"
        });
    },

    doSetTTL: function (val) {
        if (typeof Toast !== 'undefined') Toast.show("Đang áp dụng...", "info");

        // Update dashboard UI immediately for responsiveness
        const dashEl = document.getElementById('mob-card-ttl');
        if (dashEl) dashEl.innerText = val || "--";

        fetch('/cgi-bin/ttl/index', {
            method: 'POST',
            body: JSON.stringify({ ttl: val || 0 })
        })
            .then(r => r.json())
            .then(d => {
                if (d.status === 'success') {
                    if (typeof Toast !== 'undefined') Toast.show("Thành công! TTL: " + (val || "Off"), "success");
                } else {
                    if (typeof Toast !== 'undefined') Toast.show("Lỗi: " + d.message, "error");
                }
            })
            .catch(() => {
                if (typeof Toast !== 'undefined') Toast.show("Mất kết nối", "error");
            });
    }
};
window.MobileModule = MobileModule;