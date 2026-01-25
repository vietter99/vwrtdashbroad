// LED Config Module - Custom UI
const LedModule = {
    showModal: function() {
        fetch('/cgi-bin/led/get')
            .then(res => res.json())
            .then(data => {
                if(data.error) {
                    Toast.show("Lỗi: " + data.error, "error");
                    return;
                }
                this.renderModal(data);
            })
            .catch(err => {
                Toast.show("Không thể tải cấu hình LED.", "error");
                console.error(err);
            });
    },

    renderModal: function(data) {
        const leds = data.leds || [];
        
        // Group LEDs by type (4g, 5g, wifi, power)
        const getDisplayName = (name) => {
            if(name.includes('4g:blue')) return '4G Xanh dương';
            if(name.includes('4g:green')) return '4G Xanh lá';
            if(name.includes('4g:yellow')) return '4G Vàng';
            if(name.includes('5g:blue')) return '5G Xanh dương';
            if(name.includes('5g:yellow')) return '5G Vàng';
            if(name.includes('power')) return 'Nguồn';
            if(name.includes('wifi')) return 'WiFi';
            return name;
        };
        
        const getIcon = (name) => {
            if(name.includes('4g') || name.includes('5g')) return '📶';
            if(name.includes('power')) return '⚡';
            if(name.includes('wifi')) return '📡';
            return '💡';
        };
        
        let ledsHtml = leds.map(led => {
            const isOn = led.brightness > 0;
            return `
                <div class="led-item" style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-radius:10px; background:var(--card-bg, #f7fafc); margin-bottom:8px; transition: all 0.2s;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:20px;">${getIcon(led.name)}</span>
                        <div>
                            <div style="font-weight:600; font-size:13px; color:var(--text-primary, #2d3748);">${getDisplayName(led.name)}</div>
                            <div style="font-size:11px; color:var(--text-secondary, #718096);">${led.trigger}</div>
                        </div>
                    </div>
                    <label class="led-switch" style="position:relative; display:inline-block; width:50px; height:28px;">
                        <input type="checkbox" data-led="${led.name}" ${isOn ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                        <span class="led-slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${isOn ? '#48bb78' : '#e53e3e'}; transition:.3s; border-radius:28px;"></span>
                    </label>
                </div>
            `;
        }).join('');
        
        const content = `
            <div style="text-align:left;">
                <div style="padding:12px 15px; background:linear-gradient(135deg, rgba(49,130,206,0.1), rgba(56,161,105,0.1)); border-radius:12px; margin-bottom:20px;">
                    <div style="font-weight:600; font-size:13px; color:var(--text-primary, #2d3748);">Điều khiển đèn LED</div>
                    <div style="font-size:12px; color:var(--text-secondary, #718096);">Bật/Tắt đèn trên thiết bị</div>
                </div>
                
                <div id="led-list" style="max-height:350px; overflow-y:auto;">
                    ${ledsHtml || '<div style="text-align:center; color:#999; padding:20px;">Không tìm thấy LED nào.</div>'}
                </div>
            </div>
            <style>
                .led-switch input:checked + .led-slider { background-color: #48bb78 !important; }
                .led-switch input:not(:checked) + .led-slider { background-color: #e53e3e !important; }
                .led-slider:before {
                    position: absolute;
                    content: "";
                    height: 22px;
                    width: 22px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .3s;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                .led-switch input:checked + .led-slider:before { transform: translateX(22px); }
                .led-item:hover { background: var(--card-hover-bg, #edf2f7) !important; }
            </style>
        `;
        
        if(typeof Modal !== 'undefined') {
            Modal.show({
                title: "Cấu hình LED",
                content: content,
                showCancel: false,
                showIcon: false,
                confirmText: "Đóng",
                onConfirm: () => {}
            });
            
            const mBox = document.querySelector('.modal-box');
            if(mBox) {
                mBox.style.maxWidth = "420px";
                mBox.style.width = "95%";
            }
            
            // Attach toggle handlers
            setTimeout(() => {
                const checkboxes = document.querySelectorAll('#led-list input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        e.stopPropagation();
                        const ledName = cb.getAttribute('data-led');
                        const isOn = cb.checked;
                        this.setLed(ledName, isOn ? 1 : 0);
                    });
                });
            }, 100);
        }
    },
    
    setLed: function(name, brightness) {
        fetch('/cgi-bin/led/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, brightness: brightness, trigger: brightness > 0 ? 'default-on' : 'none' })
        })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                Toast.show(brightness > 0 ? "Đã bật LED!" : "Đã tắt LED!", "success");
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
