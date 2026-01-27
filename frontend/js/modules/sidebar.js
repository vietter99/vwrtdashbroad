const SidebarModule = {
    init: function() {
        const btn = document.getElementById('menu-btn');
        const overlay = document.getElementById('overlay');
        const closeBtn = document.getElementById('close-sidebar');
        const sidebar = document.getElementById('sidebar');

        if(btn) btn.addEventListener('click', this.open);
        if(overlay) overlay.addEventListener('click', this.close);
        if(closeBtn) closeBtn.addEventListener('click', this.close);

        // Add swipe gesture support (Enhanced)
        let touchStartX = 0;
        let touchStartY = 0;
        
        document.addEventListener('touchstart', e => { 
            touchStartX = e.changedTouches[0].screenX; 
            touchStartY = e.changedTouches[0].screenY;
        }, {passive: true});

        document.addEventListener('touchend', e => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            
            // Check if it's a vertical scroll (ignore if Y movement > X movement)
            if (Math.abs(diffY) > Math.abs(diffX)) return;

            // Only trigger if horizontal swipe is significant (> 60px)
            if (Math.abs(diffX) < 60) return;

            // Swipe Right (Open) - Only if started from Left Edge (< 40px)
            if (diffX > 0 && touchStartX < 40) {
                this.open();
            }
            
            // Swipe Left (Close) - Only if Sidebar is open
            if (diffX < 0 && sidebar.classList.contains('active')) {
                this.close();
            }
        }, {passive: true});
    },

    open: function() {
        document.getElementById('sidebar').classList.add('active');
        document.getElementById('overlay').classList.add('active');
    },

    close: function() {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
    },

    showFeature: function(featureName) {
        this.close();
        
        let title = "";
        let desc = "Tính năng này đang được phát triển.";
        
        if(featureName === 'terminal') {
            if(typeof Modal !== 'undefined') {
                Modal.show({
                    title: "Terminal",
                    content: `<div style="width:100%; height:75vh;">
                                <iframe src="http://${window.location.hostname}:7681" style="width:100%; height:100%; border:none; background:#000;"></iframe>
                              </div>`,
                    showCancel: false,
                    showIcon: false,
                    confirmText: "Đóng",
                    onConfirm: () => {}
                });
                
                // Adjust modal styling for terminal (Dark & Compact)
                const mBox = document.querySelector('.modal-box');
                if(mBox) {
                    mBox.style.maxWidth = "900px";
                    mBox.style.width = "95%";
                    mBox.style.background = "#1a1b26";
                    mBox.style.color = "#c0caf5";
                    mBox.style.padding = "15px"; // More compact padding
                    
                    const title = mBox.querySelector('h3');
                    if(title) {
                        title.style.color = "#c0caf5";
                        title.style.marginTop = "0";
                        title.style.marginBottom = "10px";
                    }
                }
            }
            return;
        }

        if(featureName === 'adblock') {
            // Open custom AdBlock modal
            if(typeof AdBlockModule !== 'undefined') {
                AdBlockModule.showModal();
            }
            return;
        }

        if(featureName === 'led') {
            if(typeof LedModule !== 'undefined') {
                LedModule.showModal();
            }
            return;
        }

        if(featureName === 'reboot_sch') {
            if(typeof RebootScheduleModule !== 'undefined') {
                RebootScheduleModule.showModal();
            }
            return;
        }


        if(featureName === 'switch_ui') {
            if(typeof Modal !== 'undefined') {
                // Check status first
                if(typeof Toast !== 'undefined') Toast.show("Đang kiểm tra trạng thái...", "info");
                
                let checkPayload = { target: 'check' };
                if(typeof VWRT_API !== 'undefined' && VWRT_API.csrfToken) {
                    checkPayload.csrf_token = VWRT_API.csrfToken;
                }

                fetch('/cgi-bin/system/switch_dashboard', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(checkPayload)
                })
                .then(res => res.json())
                .then(data => {
                    let contentHTML = "";
                    if(data.installed) {
                        contentHTML = `
                            <div style="text-align:center; padding:10px;">
                                <div style="font-size:48px; margin-bottom:10px; color:#48bb78;">✅</div>
                                <p style="margin-bottom:20px; color:#333; font-weight:bold;">Màn hình chọn đã được cài đặt</p>
                                <p style="color:#666; font-size:14px;">Bạn có thể khởi động lại Router để thấy giao diện chọn.</p>
                            </div>
                        `;
                    } else {
                        contentHTML = `
                            <div style="text-align:center; padding:10px;">
                                <div style="font-size:48px; margin-bottom:10px;">📲</div>
                                <p style="margin-bottom:20px; color:#333; font-weight:bold;">Cài Đặt Màn Hình Chọn</p>
                                <p style="color:#666; margin-bottom:20px;">
                                    Thiết lập trang chủ Router thành màn hình lựa chọn (LuCI / VWRT).
                                </p>
                                <button onclick="SidebarModule.doSwitch('install_selector')" class="btn-modal" style="background:#3182ce; color:white; padding:12px 24px; border-radius:8px; border:none; cursor:pointer; width:100%; font-size:16px;">
                                    Cài Đặt Ngay
                                </button>
                            </div>
                        `;
                    }

                    Modal.show({
                        title: "Quản Lý Giao Diện",
                        content: contentHTML,
                        showCancel: false, // Removed redundant 'Hủy'
                        showIcon: false,
                        confirmText: "Đóng", // Only one close button
                        onConfirm: () => {}
                    });
                })
                .catch(() => {
                    if(typeof Toast !== 'undefined') Toast.show("Lỗi kết nối kiểm tra", "error");
                });
            }
            return;
        }

        // Default: Feature not implemented
        if(typeof Modal !== 'undefined') {
            Modal.show({
                title: title,
                content: `<div style="text-align:center; padding:20px;">
                            <div style="font-size:40px; margin-bottom:10px;">🚧</div>
                            <p>${desc}</p>
                            <button onclick="document.querySelector('.modal-overlay').remove()" style="margin-top:15px; padding:8px 20px; border:none; background:#3182ce; color:white; border-radius:6px; cursor:pointer;">Đóng</button>
                          </div>`,
                showCancel: false,
                confirmText: "OK"
            });
        }
    },

    doSwitch: function(target) {
        if(typeof Toast !== 'undefined') Toast.show("Đang lưu cấu hình...", "info");
        
        let payload = { target: target };
        
        if(typeof VWRT_API !== 'undefined' && VWRT_API.csrfToken) {
            payload.csrf_token = VWRT_API.csrfToken;
        }

        fetch('/cgi-bin/system/switch_dashboard', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                // Show Reboot Confirmation
                if(typeof Modal !== 'undefined') {
                    Modal.show({
                        title: "Cần Khởi Động Lại",
                        content: `
                            <div style="text-align:center;">
                                <div style="font-size:48px; margin-bottom:10px;">🔄</div>
                                <p>Cấu hình giao diện đã được lưu!</p>
                                <p style="color:#666; font-size:14px;">Bạn có muốn khởi động lại Router ngay bây giờ để áp dụng thay đổi?</p>
                            </div>
                        `,
                        showCancel: true,
                        confirmText: "Khởi động lại ngay",
                        cancelText: "Để sau",
                        onConfirm: () => {
                            SidebarModule.doReboot();
                        }
                    });
                }
            } else {
                if(typeof Toast !== 'undefined') Toast.show("Lỗi: " + data.error, "error");
            }
        })
        .catch(err => {
            if(typeof Toast !== 'undefined') Toast.show("Lỗi kết nối: " + err.message, "error");
        });
    },

    doReboot: function() {
        if(typeof Toast !== 'undefined') Toast.show("Đang gửi lệnh khởi động lại...", "warning");
        fetch('/cgi-bin/system/action?action=reboot')
        .then(res => res.json())
        .catch(() => {}); // Ignore error as connection will drop
    }
};
window.SidebarModule = SidebarModule;

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
    SidebarModule.init();
});
