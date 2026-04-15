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
    
    // === UNIFIED POLLING (MASTER DUAL-LOOP) ===
    let fastInterval = null;
    let slowInterval = null;
    let lastTraffic = { rx: 0, tx: 0, time: 0 };

    function calculateSpeed(currentRx, currentTx) {
        const now = Date.now();
        const dt = (now - lastTraffic.time) / 1000;
        if (dt <= 0 || lastTraffic.time === 0) {
            lastTraffic = { rx: currentRx, tx: currentTx, time: now };
            return { rx: 0, tx: 0 };
        }

        const rxSpeed = (currentRx - lastTraffic.rx) / dt;
        const txSpeed = (currentTx - lastTraffic.tx) / dt;
        
        lastTraffic = { rx: currentRx, tx: currentTx, time: now };
        return { rx: rxSpeed > 0 ? rxSpeed : 0, tx: txSpeed > 0 ? txSpeed : 0 };
    }

    function fetchFastStats() {
        fetch('/cgi-bin/dashboard/stats?fast=1')
            .then(r => r.json())
            .then(data => {
                if (data.sys) {
                    const speeds = calculateSpeed(data.sys.rx_total, data.sys.tx_total);
                    data.sys.rx_speed = speeds.rx;
                    data.sys.tx_speed = speeds.tx;
                    
                    if (typeof SystemModule !== 'undefined') SystemModule.render(data.sys, true);
                    if (typeof MobileModule !== 'undefined' && data.mob) MobileModule.updateFromDashboard(data.mob, true);
                }
            })
            .catch(e => console.error("Fast Poll Error:", e));
    }

    function fetchFullStats() {
        fetch('/cgi-bin/dashboard/stats')
            .then(r => r.json())
            .then(data => {
                if (typeof SystemModule !== 'undefined' && data.sys) SystemModule.render(data.sys, false);
                if (typeof MobileModule !== 'undefined' && data.mob) MobileModule.updateFromDashboard(data.mob);
            })
            .catch(e => console.error("Full Poll Error:", e));
    }

    function startLoops() {
        if (!fastInterval) {
            fetchFastStats();
            fastInterval = setInterval(fetchFastStats, 3000); // Tăng từ 1s lên 3s để giảm tải CPU
        }
        if (!slowInterval) {
            setTimeout(fetchFullStats, 500); // Stagger slow poll
            slowInterval = setInterval(fetchFullStats, 10000); // Tăng từ 5s lên 10s
        }
    }

    function stopLoops() {
        if (fastInterval) { clearInterval(fastInterval); fastInterval = null; }
        if (slowInterval) { clearInterval(slowInterval); slowInterval = null; }
    }

    // Start Loops
    startLoops();
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopLoops();
        else startLoops();
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