const MobileModule = {
    errorCount: 0,
    interval: null, 

    init: function() {
        const container = document.getElementById('mobile-popup-content');
        if (container) this.renderTemplate(container);
        
        if (container) this.renderTemplate(container);
        
        this.fetchTTL(); // Init TTL value
        this.startLoop();

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) this.stopLoop();
            else this.startLoop();
        });
    },

    startLoop: function() {
        if (!this.interval) {
            this.fetchData();
            this.interval = setInterval(() => this.fetchData(), 3000);
        }
    },

    stopLoop: function() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    },

    processNetworkInfo: function(data) {
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

    getTempColor: function(tempStr) {
        let t = parseFloat(tempStr);
        if (isNaN(t)) return "var(--text-sub)";
        if (t < 50) return "#48bb78"; 
        if (t < 65) return "#ed8936"; 
        return "#e53e3e";            
    },

    getPingColor: function(msStr) {
        let ms = parseFloat(msStr);
        if (isNaN(ms)) return "var(--text-sub)";
        if (ms < 60) return "#48bb78"; // Good (Green)
        if (ms < 150) return "#ed8936"; // Fair (Orange)
        return "#e53e3e"; // Bad (Red)
    },
    


    renderTemplate: function(container) {
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
                        <div class="signal-bar b-1" style="width:6px; background:#ddd; border-radius:2px; height:20%;"></div>
                        <div class="signal-bar b-2" style="width:6px; background:#ddd; border-radius:2px; height:40%;"></div>
                        <div class="signal-bar b-3" style="width:6px; background:#ddd; border-radius:2px; height:60%;"></div>
                        <div class="signal-bar b-4" style="width:6px; background:#ddd; border-radius:2px; height:80%;"></div>
                        <div class="signal-bar b-5" style="width:6px; background:#ddd; border-radius:2px; height:100%;"></div>
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
                    <span style="color: var(--text-sub);">Nhà mạng</span> 
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

    fetchData: function() {
        fetch('/cgi-bin/mobile/get')
            .then(res => res.json())
            .then(res => {
                if (res.status === 'success') {
                    this.errorCount = 0;
                    this.updateUI(res.data);
                } else {
                    this.handleError();
                }
            })
            .catch(err => {
                console.log("Mobile Error", err);
                this.handleError();
            });
    },

    handleError: function() {
        this.errorCount++;
        if (this.errorCount > 3) {
            const emptyData = { operator_name: "-", signal: "0", mode: "-" };
            this.updatePopup(emptyData);
            this.updateDashboardCard(emptyData);
        }
    },

    updateUI: function(data) {
        if ((data.operator_name === "-" || !data.operator_name) && (data.signal === "-" || !data.signal)) {
            return;
        }
        
        const netInfo = this.processNetworkInfo(data);
        data.display_type = netInfo.type;
        data.display_band = netInfo.bandText;

        this.updatePopup(data);
        this.updateDashboardCard(data);
    },

    updatePopup: function(data) {
        const setTxt = (id, txt) => { const e = document.getElementById(id); if(e) e.innerText = txt; };

        setTxt('mob-operator', data.operator_name);
        setTxt('mob-mode', data.display_type || "--");
        setTxt('mob-provider', data.operator_name);
        setTxt('mob-band-main', data.display_band);
        setTxt('mob-model', data.modem || data.model || "--");
        setTxt('mob-fw', data.firmware || "--");
        
        let signalPercent = parseInt(data.signal);
        if (isNaN(signalPercent)) signalPercent = 0;
        setTxt('mob-signal', signalPercent + "%");

        const isReg = data.registration === "1" || data.registration === "5";
        const elStatus = document.getElementById('mob-status');
        if(elStatus) {
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

    updateDashboardCard: function(mobData) {
        const card = document.getElementById('card-mobile');
        if (!card) return;

        if (!mobData || (!mobData.operator_name && !mobData.signal)) return;
        card.style.display = 'flex'; 

        const setTxt = (id, txt) => { const e = document.getElementById(id); if(e) e.innerText = txt; };

        setTxt('mob-card-operator', (mobData.operator_name || "--").toUpperCase());
        setTxt('mob-card-type', mobData.display_type || "MOBILE");
        
        let cleanBand = mobData.display_band || "--";
        cleanBand = cleanBand.replace(/\s*\([^)]*\)/g, '').trim();
        setTxt('mob-card-band', cleanBand);

        const elStatusVal = document.getElementById('mob-card-status');
        if (elStatusVal) {
            let tempVal = mobData.mtemp || "--";
            let parsedTemp = parseFloat(tempVal);
            if (!isNaN(parsedTemp)) {
                elStatusVal.innerText = parsedTemp + "°C";
                elStatusVal.style.color = this.getTempColor(parsedTemp); 
                elStatusVal.style.fontWeight = "bold";
            } else {
                elStatusVal.innerText = "--";
                elStatusVal.style.color = "var(--text-sub)";
            }
        }

        setTxt('mob-card-rsrp', (mobData.rsrp || "--") + " dBm");
        setTxt('mob-card-sinr', (mobData.sinr || "--") + " dB");
        setTxt('mob-card-rsrq', (mobData.rsrq || "--") + " dB");
        setTxt('mob-card-rssi', (mobData.rssi || "--") + " dBm");

        const elSigBar = document.getElementById('mob-card-signal-bar');
        const elSigText = document.getElementById('mob-card-signal-text');
        if (elSigBar) {
            let signal = parseInt(mobData.signal);
            if(isNaN(signal)) signal = 0;
            elSigBar.style.width = `${signal}%`;
            if(elSigText) elSigText.innerText = `${signal}%`;
            elSigBar.style.background = signal > 70 ? '#48bb78' : (signal > 30 ? '#ed8936' : '#e53e3e');
        }

        // Update Ping
        const elPing = document.getElementById('mob-card-ping');
        if (elPing) {
            if (mobData.ping && mobData.ping !== '-') {
                elPing.innerText = mobData.ping + " ms";
                elPing.style.color = this.getPingColor(mobData.ping);
                elPing.style.fontWeight = "bold";
            } else {
                elPing.innerText = "--";
                elPing.style.color = "var(--text-sub)";
                elPing.style.fontWeight = "normal";
                elPing.style.color = "var(--text-sub)";
                elPing.style.fontWeight = "normal";
            }
        }
        

    },

    fetchTTL: function() {
        fetch('/cgi-bin/ttl')
            .then(r => r.json())
            .then(d => {
                const el = document.getElementById('mob-card-ttl');
                if(el && d.ttl && d.ttl > 0) el.innerText = d.ttl;
                else if (el) el.innerText = "--";
            }).catch(()=>{});
    },

    setTTL: function() {
        const el = document.getElementById('inp-ttl');
        if(!el) return;
        const val = parseInt(el.value);
        
        if (typeof Toast !== 'undefined') Toast.show("Đang áp dụng TTL...", "info");

        fetch('/cgi-bin/ttl', {
            method: 'POST',
            body: JSON.stringify({ ttl: val || 0 })
        })
        .then(r => r.json())
        .then(d => {
            if(d.status === 'success') {
                if (typeof Toast !== 'undefined') Toast.show("Đã set TTL: " + (val || "Disabled"), "success");
            } else {
                if (typeof Toast !== 'undefined') Toast.show("Lỗi: " + d.message, "error");
            }
        })
        .catch(() => {
            if (typeof Toast !== 'undefined') Toast.show("Lỗi kết nối", "error");
        });
    },

    showModemDetails: function() {
        if (typeof Modal === 'undefined') return;
        
        Modal.show({
            title: "Thông tin Modem",
            content: `
                <div style="text-align:center;"><div class="spinner"></div></div>
            `
        });

        // Fetch details
        fetch('/cgi-bin/mobile/get')
            .then(r => r.json())
            .then(res => {
                if(res.status === 'success' && res.data) {
                    const d = res.data;
                    const content = `
                        <div style="padding: 10px;">
                            <div style="margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                    <span style="color:var(--text-sub);">Số điện thoại:</span>
                                    <span style="font-weight:bold; color:#e53e3e;">${d.own_number || '--'}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                    <span style="color:var(--text-sub);">IMEI:</span>
                                    <span style="font-family:monospace; font-weight:bold;">${d.imei || '--'}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between;">
                                    <span style="color:var(--text-sub);">Nhà sản xuất:</span>
                                    <span>${d.manufacturer || '--'}</span>
                                </div>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                    <span style="color:var(--text-sub);">Model:</span>
                                    <span style="text-align:right;">${d.model || '--'}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between;">
                                    <span style="color:var(--text-sub);">Firmware:</span>
                                    <span style="text-align:right; font-family:monospace; font-size:11px;">${d.firmware || '--'}</span>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    Modal.show({
                        title: "Thông tin Modem",
                        content: content,
                        showCancel: false,
                        confirmText: "Đóng",
                        onConfirm: () => {} 
                    });
                } else {
                     Modal.show({ title: "Lỗi", content: "Không lấy được thông tin modem." });
                }
            })
            .catch(() => {
                Modal.show({ title: "Lỗi", content: "Mất kết nối server." });
            });
    },

    showTTLModal: function() {
        if (typeof Modal === 'undefined') return;
        
        // Show Loading first
        Modal.show({
            title: "Cấu hình TTL",
            content: `
                <div style="text-align:center;">
                    <p style="margin-bottom:10px; color:var(--text-sub);">Đang tải cấu hình...</p>
                    <div class="spinner"></div>
                </div>
            `
        });

        // Fetch current
        fetch('/cgi-bin/ttl').then(r=>r.json()).then(d => {
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

    doSetTTL: function(val) {
        if (typeof Toast !== 'undefined') Toast.show("Đang áp dụng...", "info");
        
        // Update dashboard UI immediately for responsiveness
        const dashEl = document.getElementById('mob-card-ttl');
        if(dashEl) dashEl.innerText = val || "--";

        fetch('/cgi-bin/ttl', {
            method: 'POST',
            body: JSON.stringify({ ttl: val || 0 })
        })
        .then(r => r.json())
        .then(d => {
            if(d.status === 'success') {
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