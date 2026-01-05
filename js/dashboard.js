document.addEventListener('DOMContentLoaded', function() {
    // 1. Kiểm tra Session
    const session = localStorage.getItem('vwrt_session');
    if (!session) { window.location.href = 'index.html'; return; }

    // 2. VẼ HEADER TRƯỚC
    if(typeof HeaderModule !== 'undefined') {
        HeaderModule.init();
        SettingsModule.init();
    }

    if(typeof MobileModule !== 'undefined') MobileModule.init();
    if(typeof WifiModule !== 'undefined') WifiModule.init();
    if(typeof SmsModule !== 'undefined') SmsModule.init();

    // 3. Khởi chạy các module khác
    if(typeof SystemModule !== 'undefined') SystemModule.init();
    if(typeof NetworkModule !== 'undefined') NetworkModule.init();

    // 4. KHỞI CHẠY THEME
    if(typeof ThemeModule !== 'undefined') {
        ThemeModule.init(); 
    }

    // 5. Xử lý Logout
    const btnLogout = document.getElementById('btnTopLogout');
    if(btnLogout) {
        btnLogout.addEventListener('click', function(e) {
            e.preventDefault();
            if(typeof Modal !== 'undefined') {
                Modal.confirm("Đăng xuất", "Bạn muốn thoát?", () => {
                    localStorage.removeItem('vwrt_session');
                    localStorage.removeItem('vwrt_user');
                    window.location.href = 'index.html';
                });
            }
        });
    }
    
    // Toggle pass helper
    window.togglePass = function(id) {
        const input = document.getElementById(id);
        if (input) input.type = input.type === "password" ? "text" : "password";
    }
});

// --- Tự động hiển thị Version dưới Footer ---
document.addEventListener('DOMContentLoaded', function() {
    const elVer = document.getElementById('app-version');
    
    if (elVer) {
        fetch('/cgi-bin/get_version')
            .then(response => response.json())
            .then(data => {
                if (data && data.dashboard && data.dashboard.version) {
                    elVer.innerText = `| v${data.dashboard.version}`;
                }
            })
            .catch(() => {
                console.log("Chưa có thông tin version");
            });
    }
});