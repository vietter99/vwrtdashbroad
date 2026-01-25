const SidebarModule = {
    init: function() {
        const btn = document.getElementById('menu-btn');
        const overlay = document.getElementById('overlay');
        const closeBtn = document.getElementById('close-sidebar');
        const sidebar = document.getElementById('sidebar');

        if(btn) btn.addEventListener('click', this.open);
        if(overlay) overlay.addEventListener('click', this.close);
        if(closeBtn) closeBtn.addEventListener('click', this.close);

        // Add swipe gesture support (Simple)
        let touchStartX = 0;
        document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
        document.addEventListener('touchend', e => {
            if (e.changedTouches[0].screenX - touchStartX > 100 && touchStartX < 50) this.open(); // Swipe Right
            if (touchStartX - e.changedTouches[0].screenX > 50 && sidebar.classList.contains('active')) this.close(); // Swipe Left
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

        if(featureName === 'wifi_sch') {
            if(typeof WifiScheduleModule !== 'undefined') {
                WifiScheduleModule.showModal();
            }
            return;
        }

        switch(featureName) {
            case 'ai': title = "AI Assistant"; desc = "Trợ lý ảo thông minh giúp cấu hình router."; break;
            case 'telegram': title = "Telegram Bot"; desc = "Quản lý Router qua Telegram Bot."; break;
        }

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
    }
};
window.SidebarModule = SidebarModule;

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
    SidebarModule.init();
});
