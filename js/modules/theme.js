const ThemeModule = {
    init: function() {
        // 1. Kiểm tra config đã lưu
        const savedTheme = localStorage.getItem('vwrt_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // 2. Cập nhật Icon nút bấm
        this.updateIcon(savedTheme);

        // 3. Gắn sự kiện click
        const btn = document.getElementById('btn-theme-toggle');
        if (btn) {
            btn.addEventListener('click', () => this.toggle());
        }
    },

    toggle: function() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        
        // Đổi class html
        document.documentElement.setAttribute('data-theme', next);
        
        // Lưu vào bộ nhớ
        localStorage.setItem('vwrt_theme', next);
        
        // Đổi icon
        this.updateIcon(next);
    },

    updateIcon: function(theme) {
        const iconContainer = document.querySelector('#btn-theme-toggle .icon-btn');
        if (!iconContainer) return;

        if (theme === 'dark') {
            // Icon Mặt trời (Để bấm vào chuyển sang sáng)
            iconContainer.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
        } else {
            // Icon Mặt trăng (Để bấm vào chuyển sang tối)
            iconContainer.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        }
    }
};