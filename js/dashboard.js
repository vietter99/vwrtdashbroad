document.addEventListener('DOMContentLoaded', function() {
    const session = localStorage.getItem('vwrt_session');
    if (!session) { window.location.href = 'index.html'; return; }

    if(typeof HeaderModule !== 'undefined') {
        HeaderModule.init();
        SettingsModule.init();
    }

    if(typeof MobileModule !== 'undefined') MobileModule.init();
    if(typeof WifiModule !== 'undefined') WifiModule.init();
    if(typeof SmsModule !== 'undefined') SmsModule.init();

    if(typeof SystemModule !== 'undefined') SystemModule.init();
    if(typeof NetworkModule !== 'undefined') NetworkModule.init();

    if(typeof ThemeModule !== 'undefined') {
        ThemeModule.init(); 
    }

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
    
    window.togglePass = function(id) {
        const input = document.getElementById(id);
        if (input) input.type = input.type === "password" ? "text" : "password";
    }
});

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