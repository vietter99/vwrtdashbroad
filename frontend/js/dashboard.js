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
    if(typeof ClientsModule !== 'undefined') ClientsModule.init();

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
    
    // === UNIFIED POLLING (MASTER LOOP) ===
    let dashboardInterval = null;
    let errorCount = 0;

    function fetchDashboardStats() {
        fetch('/cgi-bin/dashboard/stats')
            .then(r => r.json())
            .then(data => {
                errorCount = 0; // Reset error count on success
                if (typeof SystemModule !== 'undefined' && data.sys) {
                    SystemModule.render(data.sys);
                }
                if (typeof MobileModule !== 'undefined' && data.mob) {
                    MobileModule.updateFromDashboard(data.mob);
                }
            })
            .catch(e => {
                console.error("Unified Poll Error:", e);
                errorCount++;
                if (errorCount === 3) {
                    if(typeof Toast !== 'undefined') Toast.show("Mất kết nối với Router...", "error");
                }
            });
    }

    function startDashboardLoop() {
        if (!dashboardInterval) {
            fetchDashboardStats();
            dashboardInterval = setInterval(fetchDashboardStats, 3000);
        }
    }

    function stopDashboardLoop() {
        if (dashboardInterval) {
            clearInterval(dashboardInterval);
            dashboardInterval = null;
        }
    }

    // Start Loop
    startDashboardLoop();
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopDashboardLoop();
        else startDashboardLoop();
    });

    window.togglePass = function(id) {
        const input = document.getElementById(id);
        if (input) input.type = input.type === "password" ? "text" : "password";
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const elVer = document.getElementById('app-version');
    
    if (elVer) {
        fetch('/cgi-bin/system/version')
            .then(response => response.json())
            .then(data => {
                if (data && data.dashboard && data.dashboard.version) {
                    elVer.innerText = `| v${data.dashboard.version}`;
                }
            })
            .catch(() => {

            });
    }
});