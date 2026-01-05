const HeaderModule = {
    template: `
        <div class="nav-item" id="nav-wifi" title="Wifi">
            <div class="icon-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
                <span class="badge" id="wifi-badge" style="display:none; background:#3182ce; border-color:#3182ce;">0</span>
            </div>
            <div class="popup-box hidden" id="wifi-popup-content">
                <div class="popup-body" style="text-align:center; padding: 20px; color: #999;">
                    Đang tải dữ liệu Wifi...
                </div>
            </div>
        </div>      
        
        <div class="nav-item" id="btn-theme-toggle" title="Giao diện"><div class="icon-btn"></div></div>
        
        <div class="nav-item" id="nav-settings" title="Cài đặt hệ thống">
            <div class="icon-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 0 2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 0 2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </div>
            <div class="popup-box hidden" id="settings-popup-content" style="right: 0;">
                </div>
        </div>

        <div class="nav-item" title="Đăng xuất"><div class="icon-btn btn-danger" id="btnTopLogout"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></div></div>
    `,
init: function() {
        const container = document.getElementById('header-container');
        if (container) {
            container.innerHTML = this.template;
            this.initPopups();
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
            });
        });
        document.addEventListener('click', (e) => {
            navItems.forEach(item => {
                const popup = item.querySelector('.popup-box');
                if (popup && !popup.classList.contains('hidden') && !item.contains(e.target)) popup.classList.add('hidden');
            });
        });
    },

    initLinks: function() {
        const luciLink = document.getElementById('luci-link');
        if (luciLink) luciLink.href = `${window.location.protocol}//${window.location.hostname}/cgi-bin/luci`;
    }
};