// LED Config Module - Custom UI
const LedModule = {
    // Dynamic name mapping will be handled by backend or fallback to raw system names
    nameMap: {}, 
    
    // Standard Linux triggers (likely to be consistent across OpenWrt)
    triggerMap: {
        'none': 'Tắt hoàn toàn',
        'default-on': 'Bật liên tục',
        'heartbeat': 'Nhịp tim (Nháy chậm)',
        'timer': 'Nháy đều (Timer)',
        'netdev': 'Nháy khi có mạng',
        'usbport': 'Theo cổng USB',
        'mmc0': 'Theo ổ cứng/Thẻ nhớ',
        'phy0rx': 'WiFi nhận dữ liệu',
        'phy0tx': 'WiFi gửi dữ liệu',
        'phy0assoc': 'WiFi có kết nối',
        // Fallback for others
        'activity': 'Hoạt động',
        'link': 'Liên kết'
    },

    showModal: function() {
        Promise.all([
            fetch('/cgi-bin/led/get').then(res => res.json()),
            fetch('/cgi-bin/led/auto_get').then(res => res.json())
        ])
        .then(([ledData, autoData]) => {
            if(ledData.error) {
                Toast.show("Lỗi: " + ledData.error, "error");
                return;
            }
            LedModule.renderModal(ledData, autoData);
        })
        .catch(err => {
            Toast.show("Không thể tải cấu hình LED.", "error");
            console.error(err);
        });
    },

    renderModal: function(data, autoConfig) {
        const leds = data.leds || [];
        const auto = autoConfig || { enabled: false, rules: [] };
        
        const getDisplayName = (name) => {
            // 1. Try custom map if exists
            if (LedModule.nameMap[name]) return LedModule.nameMap[name];
            
            // 2. Prettify common system names
            let display = name;
            
            // Replace separators
            display = display.replace(/[-_:.@]/g, ' ');
            
            // Capitalize first letters
            display = display.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
            
            // Highlight specifics
            if(display.toLowerCase().includes('wifi')) display = "📡 " + display;
            else if(display.toLowerCase().includes('power')) display = "⚡ " + display;
            else if(display.toLowerCase().includes('wan')) display = "🌐 " + display;
            else if(display.toLowerCase().includes('exclude')) display = "❌ " + display;
            else display = "💡 " + display;

            return display;
        };

        const getTriggerName = (t) => LedModule.triggerMap[t] || t;

        // Manual Control List
        let ledsHtml = leds.map(led => {
            const available = led.available_triggers || ['none', 'default-on'];
            let options = available.map(t => {
                const selected = t === led.trigger ? 'selected' : '';
                return `<option value="${t}" ${selected}>${getTriggerName(t)}</option>`;
            }).join('');

            return `
                <div class="led-item" style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:10px; background:var(--card-bg, #f7fafc); margin-bottom:8px; border: 1px solid rgba(0,0,0,0.05);">
                    <div style="display:flex; align-items:center; gap:12px; flex: 1; overflow: hidden;">
                        <span style="font-size:18px;">${led.name.includes('wifi') ? '📡' : (led.name.includes('power') ? '⚡' : '💡')}</span>
                        <div style="overflow: hidden;">
                            <div style="font-weight:600; font-size:13px; color:var(--text-primary, #2d3748); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${led.name}">${getDisplayName(led.name)}</div>
                            <div style="font-size:11px; color:var(--text-secondary, #718096);">Gốc: ${led.name}</div>
                        </div>
                    </div>
                    <div style="margin-left: 10px;">
                        <select class="led-trigger-select" data-led="${led.name}" style="padding: 5px 8px; border-radius: 6px; border: 1px solid #cbd5e0; font-size: 11px; background: white; outline: none; cursor:pointer;">
                            ${options}
                        </select>
                    </div>
                </div>
            `;
        }).join('');

        // Auto LED Logic Control
        const findRule = (status) => (auto.rules || []).find(r => r.status === status) || { led: "" };
        const autoHtml = `
            <div style="margin-top: 20px; padding-top: 15px; border-top: 2px dashed #edf2f7;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <div style="font-weight:700; font-size:14px; color:#3182ce;">🤖 Auto LED thông minh</div>
                    <label class="auto-led-switch" style="position:relative; display:inline-block; width:44px; height:24px;">
                        <input type="checkbox" id="auto-led-enable" ${auto.enabled ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                        <span class="auto-led-slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#cbd5e0; transition:.3s; border-radius:24px;"></span>
                    </label>
                </div>
                
                <div id="auto-led-settings" style="display: ${auto.enabled ? 'block' : 'none'};">
                    <div style="font-size:11px; color:#c53030; margin-bottom:12px; background: #fff5f5; padding: 10px; border-radius: 8px; border-left: 4px solid #f56565;">
                        <strong>💡 Mẹo:</strong> Khi vừa khởi động và chưa xác định được loại mạng, hệ thống sẽ tự động sáng <strong>CẢ HAI</strong> LED 4G + 5G để báo hiệu đã có kết nối.
                    </div>
                    
                    ${["5G", "4G"].map(status => {
                        const rules = (auto.rules || []).filter(r => r.status === status);
                        const firstRule = rules[0] || { led: "", trigger: "default-on" };
                        
                        let ledOptions = `<option value="">-- Không dùng --</option>` + leds.map(l => {
                            return `<option value="${l.name}" ${firstRule.led === l.name ? 'selected' : ''}>${getDisplayName(l.name)}</option>`;
                        }).join('');
                        
                        return `
                            <div style="margin-bottom:12px; background:white; padding:10px; border-radius:8px;">
                                <div style="font-size:13px; font-weight:600; margin-bottom:8px;">
                                    ${status === '5G' ? '⚡ Mạng 5G' : '📱 Mạng 4G'}
                                </div>
                                <div style="display:flex; gap:5px;">
                                    <select class="auto-led-mapping-select" data-status="${status}" style="padding:5px; font-size:12px; border-radius:5px; border:1px solid #ddd; flex:1;">
                                        ${ledOptions}
                                    </select>
                                    <select class="auto-led-effect-select" data-status="${status}" style="padding:5px; font-size:12px; border-radius:5px; border:1px solid #ddd; width:100px;">
                                        <option value="default-on" ${firstRule.trigger === 'default-on' ? 'selected' : ''}>Sáng tĩnh</option>
                                        <option value="netdev" ${firstRule.trigger === 'netdev' ? 'selected' : ''}>Nháy data</option>
                                    </select>
                                </div>
                            </div>
                        `;
                    }).join('')}
                    
                </div>
                
                <button id="save-auto-led" style="width:100%; margin-top:10px; padding:10px; background:#3182ce; color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer; transition: 0.2s;">
                    Lưu cấu hình Auto LED
                </button>
            </div>
            <style>
                #auto-led-enable:checked + .auto-led-slider { background-color: #3182ce !important; }
                .auto-led-slider:before {
                    position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%;
                }
                #auto-led-enable:checked + .auto-led-slider:before { transform: translateX(20px); }
                #save-auto-led:hover { background: #2b6cb0; transform: translateY(-1px); }
                #save-auto-led:active { transform: translateY(0); }
            </style>
        `;
        
        const content = `
            <div style="text-align:left;">
                <div style="padding:10px 15px; background:linear-gradient(135deg, rgba(49,130,206,0.1), rgba(56,161,105,0.1)); border-radius:12px; margin-bottom:15px;">
                    <div style="font-weight:600; font-size:13px; color:var(--text-primary, #2d3748);">LED & Tự động hóa</div>
                </div>
                
                <div id="led-list" style="max-height:220px; overflow-y:auto; padding-right: 5px;">
                    ${ledsHtml || '<div style="text-align:center; color:#999; padding:20px;">Không tìm thấy LED nào.</div>'}
                </div>

                ${autoHtml}
            </div>
        `;
        
        if(typeof Modal !== 'undefined') {
            Modal.show({
                title: "Cấu hình LED",
                content: content,
                showCancel: false,
                showIcon: false,
                confirmText: "Hoàn tất",
                onConfirm: () => {}
            });
            
            const mBox = document.querySelector('.modal-box');
            if(mBox) {
                mBox.style.maxWidth = "520px";
                mBox.style.width = "95%";
            }
            
            // Attach Events
            setTimeout(() => {
                // Manual
                document.querySelectorAll('.led-trigger-select').forEach(sel => {
                    sel.addEventListener('change', () => {
                        const ledName = sel.getAttribute('data-led');
                        const trigger = sel.value;
                        LedModule.setLed(ledName, trigger === 'none' ? 0 : 1, trigger);
                    });
                });

                // Auto Toggle
                const autoEnable = document.getElementById('auto-led-enable');
                const autoSettings = document.getElementById('auto-led-settings');
                autoEnable.addEventListener('change', () => {
                    autoSettings.style.display = autoEnable.checked ? 'block' : 'none';
                });

                // Save Auto
                document.getElementById('save-auto-led').addEventListener('click', () => {
                    const config = {
                        enabled: autoEnable.checked,
                        rules: []
                    };
                    
                    // Handle single-select statuses (4G, 5G)
                    const singleSelects = document.querySelectorAll('.auto-led-mapping-select');
                    const singleEffects = document.querySelectorAll('.auto-led-effect-select');
                    
                    singleSelects.forEach((sel, index) => {
                        const status = sel.getAttribute('data-status');
                        const led = sel.value;
                        const effectSel = singleEffects[index];
                        const trigger = effectSel ? effectSel.value : 'default-on';

                        if (led) {  // Only add if LED is selected
                            config.rules.push({ status, led, trigger });
                        }
                    });
                    
                    LedModule.saveAutoConfig(config);
                });
            }, 100);
        }
    },

    saveAutoConfig: function(config) {
        if(typeof Toast !== 'undefined') Toast.show("Đang lưu cấu hình Auto...", "info");
        
        const payload = JSON.parse(JSON.stringify(config)); // clone
        const headers = { 'Content-Type': 'application/json' };
        
        if(typeof VWRT_API !== 'undefined' && VWRT_API.csrfToken) {
            payload.csrf_token = VWRT_API.csrfToken;
            headers['X-CSRF-Token'] = VWRT_API.csrfToken;
        }

        fetch('/cgi-bin/led/auto_set', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if(data.success) Toast.show("Đã kích hoạt Auto LED thành công!", "success");
            else Toast.show("Lỗi: " + data.error, "error");
        })
        .catch(err => Toast.show("Lỗi kết nối API.", "error"));
    },
    
    setLed: function(name, brightness, trigger) {
        if(typeof Toast !== 'undefined') Toast.show("Đang lưu...", "info");
        
        const payload = { name: name, brightness: brightness, trigger: trigger };
        const headers = { 'Content-Type': 'application/json' };
        
        if(typeof VWRT_API !== 'undefined' && VWRT_API.csrfToken) {
            payload.csrf_token = VWRT_API.csrfToken;
            headers['X-CSRF-Token'] = VWRT_API.csrfToken;
        }

        fetch('/cgi-bin/led/set', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                const trName = LedModule.triggerMap[trigger] || trigger;
                Toast.show("Đã chuyển sang " + trName, "success");
            } else {
                Toast.show("Lỗi: " + (data.error || "Không thể cập nhật."), "error");
            }
        })
        .catch(err => {
            Toast.show("Lỗi kết nối API.", "error");
            console.error(err);
        });
    }
};

window.LedModule = LedModule;
