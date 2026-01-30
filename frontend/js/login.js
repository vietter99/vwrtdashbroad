document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const userField = document.getElementById('username');
    const passField = document.getElementById('password');
    const btn = document.getElementById('btnLogin');

    let userInput = userField.value.trim();
    const pass = passField.value; 
    const isAutoDetect = (userInput === "");
    let userToTry = isAutoDetect ? "root" : userInput;

    const doLogin = (user, password) => {
        const rpcData = {
            "jsonrpc": "2.0", "id": 1, "method": "call",
            "params": ["00000000000000000000000000000000", "session", "login", { "username": user, "password": password }]
        };

        return fetch('/ubus', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(rpcData)
        }).then(response => response.json());
    };

    const handleSuccess = (user, sessionId) => {
        localStorage.setItem('vwrt_session', sessionId);
        localStorage.setItem('vwrt_user', user);
        
        Toast.show(`Đăng nhập thành công (${user})!`, "success");
        btn.innerText = "Đang chuyển trang...";
        setTimeout(() => {
            // Load Dashboard with cache busting
            window.location.href = "dashboard.html?v=" + new Date().getTime();
        }, 1000);
    };

    const handleFail = () => {
        Toast.show("Sai tài khoản hoặc mật khẩu!", "error");
        btn.disabled = false;
        btn.innerText = "Đăng nhập ngay";
        const card = document.querySelector('.login-card');
        card.style.animation = "shake 0.5s";
        setTimeout(() => { card.style.animation = "none"; }, 500);
    };

    btn.disabled = true;
    btn.innerText = "Đang kết nối...";

    doLogin(userToTry, pass)
    .then(data => {
        if (data.result && data.result[0] === 0 && data.result[1]?.ubus_rpc_session) {
            handleSuccess(userToTry, data.result[1].ubus_rpc_session);
        } else {
            if (isAutoDetect && userToTry === "root") {

                return doLogin("admin", pass).then(data2 => {
                    if (data2.result && data2.result[0] === 0 && data2.result[1]?.ubus_rpc_session) {
                        handleSuccess("admin", data2.result[1].ubus_rpc_session);
                    } else {
                        throw new Error("Cả root và admin đều sai");
                    }
                });
            } else {
                throw new Error("Login failed");
            }
        }
    })
    .catch(error => {
        console.error('Lỗi đăng nhập:', error);
        handleFail();
    });
});

window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('vwrt_user');
    if (savedUser) {
        document.getElementById('username').value = savedUser;
    }
});
document.addEventListener('DOMContentLoaded', function() {
    const elVer = document.getElementById('app-version');
    
    if (elVer) {
        // Keep the fix for version path
        fetch('/cgi-bin/system/version')
            .then(response => response.json())
            .then(data => {
                if (data && data.dashboard && data.dashboard.version) {
                    elVer.innerText = `| v${data.dashboard.version}`;
                }
            })
            .catch(() => {});
    }
});