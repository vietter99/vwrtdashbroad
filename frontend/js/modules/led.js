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
        
        let ledsHtml = leds.map(led => {
            const available = led.available_triggers || ['none', 'default-on'];
            let options = available.map(t => {
                const selected = t === led.trigger ? 'selected' : '';
                return `<option value="${t}" ${selected}>${t}</option>`;
            }).join('');

            return `
                <div class="led-item" style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-radius:10px; background:var(--card-bg, #f7fafc); margin-bottom:12px; border: 1px solid rgba(0,0,0,0.05);">
                    <div style="display:flex; align-items:center; gap:12px; flex: 1;">
                        <span style="font-size:18px;">💡</span>
                        <div style="overflow: hidden;">
                            <div style="font-weight:600; font-size:13px; color:var(--text-primary, #2d3748); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${led.name}">${led.name}</div>
                            <div style="font-size:11px; color:var(--text-secondary, #718096);">Active: ${led.trigger}</div>
                        </div>
                    </div>
                    <div style="margin-left: 15px;">
                        <select class="led-trigger-select" data-led="${led.name}" style="padding: 6px 8px; border-radius: 6px; border: 1px solid #ddd; font-size: 12px; background: white; outline: none;">
                            ${options}
                        </select>
                    </div>
                </div>
            `;
        }).join('');
        
        const content = `
            <div style="text-align:left;">
                <div style="padding:12px 15px; background:linear-gradient(135deg, rgba(49,130,206,0.1), rgba(56,161,105,0.1)); border-radius:12px; margin-bottom:20px;">
                    <div style="font-weight:600; font-size:13px; color:var(--text-primary, #2d3748);">Điều khiển đèn LED</div>
                    <div style="font-size:12px; color:var(--text-secondary, #718096);">Chọn chế độ (Trigger) trực tiếp từ hệ thống</div>
                </div>
                
                <div id="led-list" style="max-height:400px; overflow-y:auto; padding-right: 5px;">
                    ${ledsHtml || '<div style="text-align:center; color:#999; padding:20px;">Không tìm thấy LED nào.</div>'}
                </div>
            </div>
        `;
        
        if(typeof Modal !== 'undefined') {
            Modal.show({
                title: "Cấu hình LED Hệ thống",
                content: content,
                showCancel: false,
                showIcon: false,
                confirmText: "Đóng",
                onConfirm: () => {}
            });
            
            const mBox = document.querySelector('.modal-box');
            if(mBox) {
                mBox.style.maxWidth = "480px";
                mBox.style.width = "95%";
            }
            
            // Attach change handlers
            setTimeout(() => {
                const selects = document.querySelectorAll('.led-trigger-select');
                selects.forEach(sel => {
                    sel.addEventListener('change', (e) => {
                        const ledName = sel.getAttribute('data-led');
                        const trigger = sel.value;
                        const brightness = trigger === 'none' ? 0 : 1;
                        this.setLed(ledName, brightness, trigger);
                    });
                });
            }, 100);
        }
    },
    
    setLed: function(name, brightness, trigger) {
        if(typeof Toast !== 'undefined') Toast.show("Đang lưu...", "info");
        
        fetch('/cgi-bin/led/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, brightness: brightness, trigger: trigger })
        })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                Toast.show("Đã cập nhật chế độ " + trigger, "success");
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
