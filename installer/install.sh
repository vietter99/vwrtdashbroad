#!/bin/sh
GITHUB_URL="https://github.com/vietter99/vwrtdashbroad/archive/refs/heads/main.tar.gz"
INSTALL_DIR="/www/vwrt"
TMP_DIR="/tmp/vwrt_install"
INDEX_FILE="/www/index.html"
BACKUP_FILE="/www/index.html.bak"

echo "=== BAT DAU CAI DAT VWRT DASHBOARD (NEW STRUCTURE) ==="

echo "[1/5] Dang tai..."
rm -rf $TMP_DIR
mkdir -p $TMP_DIR
rm -rf $INSTALL_DIR

if curl -k -L -o $TMP_DIR/source.tar.gz "$GITHUB_URL"; then
    echo " -> Tai ve thanh cong ($GITHUB_URL)"
    echo " -> Dang giai nen..."
    if tar -xzf $TMP_DIR/source.tar.gz -C $TMP_DIR >/dev/null 2>&1; then
        echo " -> Giai nen OK."
    else
        echo "LOI: Lenh tar that bai! File tai ve co the bi loi."
        exit 1
    fi
    
    SOURCE_FOLDER=$(ls -d $TMP_DIR/*/ 2>/dev/null | head -n 1)
    if [ -z "$SOURCE_FOLDER" ]; then
        SOURCE_FOLDER=$(find $TMP_DIR -maxdepth 1 -type d | grep -v "^$TMP_DIR$" | head -n 1)
    fi
    
    if [ -z "$SOURCE_FOLDER" ]; then
        echo "LOI: Khong tim thay thu muc ma nguon!"
        ls -l $TMP_DIR
        exit 1
    fi
    
    # --- NEW INSTALLATION LOGIC ---
    mkdir -p $INSTALL_DIR
    
    # 1. Copy Frontend (HTML, CSS, JS) to root of INSTALL_DIR
    echo " -> Copying Frontend..."
    cp -rf "$SOURCE_FOLDER/frontend/"* $INSTALL_DIR/
    
    # 2. Setup CGI-BIN from Backend API
    echo " -> Copying Backend APIs..."
    mkdir -p $INSTALL_DIR/cgi-bin
    cp -rf "$SOURCE_FOLDER/backend/api/"* $INSTALL_DIR/cgi-bin/
    
    # 3. Setup Services
    echo " -> Copying Services..."
    mkdir -p $INSTALL_DIR/services
    cp -rf "$SOURCE_FOLDER/backend/services/"* $INSTALL_DIR/services/
    
    # Remove installer from target if copied (unlikely with this structure but good practice)
    rm -rf $INSTALL_DIR/installer

    if [ ! -f "$INSTALL_DIR/version.json" ]; then
        echo '{"dashboard":{"version":"1.0.0"}}' > "$INSTALL_DIR/version.json"
    fi
    
    # Apply Permissions
    chmod -R 755 $INSTALL_DIR
    chmod +x $INSTALL_DIR/cgi-bin/*
    chmod +x $INSTALL_DIR/cgi-bin/*/* # Recursive for mobile/system folders
    chmod +x $INSTALL_DIR/services/*

else
    echo "LOI: Khong tai duoc file tu GitHub! Kiem tra mang."
    exit 1
fi

echo "[2/5] Dang cau hinh Web Server..."
uci delete uhttpd.vwrt 2>/dev/null
uci set uhttpd.vwrt=uhttpd
uci add_list uhttpd.vwrt.listen_http='0.0.0.0:2222'
uci add_list uhttpd.vwrt.listen_http='[::]:2222'
uci set uhttpd.vwrt.home='/www/vwrt'
uci set uhttpd.vwrt.rfc1918_filter='1'
uci set uhttpd.vwrt.max_requests='3'
uci set uhttpd.vwrt.max_connections='100'
uci set uhttpd.vwrt.cgi_prefix='/cgi-bin'
uci set uhttpd.vwrt.ubus_prefix='/ubus'
uci set uhttpd.vwrt.script_timeout='60'
uci set uhttpd.vwrt.network_timeout='30'

uci commit uhttpd
/etc/init.d/uhttpd restart

echo "[3/5] Dang thiet lap..."
RC_FILE="/etc/rc.local"

# Update RC.LOCAL for new path
sed -i '/mobile_poller.sh/d' $RC_FILE
sed -i '/exit 0/i killall mobile_poller.sh 2>/dev/null' $RC_FILE
sed -i "/exit 0/i sh $INSTALL_DIR/services/mobile_poller.sh &" $RC_FILE

# Start the service now
if [ -f "$INSTALL_DIR/services/mobile_poller.sh" ]; then
    killall mobile_poller.sh 2>/dev/null
    sh "$INSTALL_DIR/services/mobile_poller.sh" &
fi

echo "[4/5] Dang cai dat chon LuCI/VWRT..."

if [ -f "$INDEX_FILE" ] && [ ! -f "$BACKUP_FILE" ]; then
    mv "$INDEX_FILE" "$BACKUP_FILE"
fi

cat << 'EOF' > "$INDEX_FILE"
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <title>OpenWrt Gateway</title>
    <style>
        body { background: #f0f2f5; font-family: sans-serif; height: 100vh; display: flex; justify-content: center; align-items: center; flex-direction: column; margin: 0; }
        #selection-screen { display: none; text-align: center; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 320px; max-width: 90%; }
        #loading-screen { display: flex; flex-direction: column; align-items: center; }
        .btn { display: block; width: 100%; padding: 15px 0; margin-bottom: 15px; text-decoration: none; color: white; font-weight: bold; border-radius: 8px; cursor: pointer; border: none; font-size: 16px; }
        .btn:hover { opacity: 0.9; }
        .btn-luci { background-color: #0099cc; }
        .btn-vwrt { background-color: #3182ce; }
        .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3182ce; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin-bottom: 15px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        p { color: #718096; font-size: 14px; margin-top: 0; }
        .note { font-size: 12px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;}
        @media (prefers-color-scheme: dark) {
            body { background: #1a1a1a; }
            #selection-screen { background: #2d2d2d; }
            h2 { color: #fff; } p { color: #ccc; }
        }
    </style>
    <script>
        function getLuciLink() { return "/cgi-bin/luci/"; }
        function getVwrtLink() { return "http://" + window.location.hostname + ":2222"; } 
        function init() {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('reset')) {
                localStorage.removeItem('default_dashboard');
                window.history.replaceState({}, document.title, "/");
            }
            const savedChoice = localStorage.getItem('default_dashboard');
            if (savedChoice) {
                document.getElementById('loading-screen').style.display = 'flex';
                document.getElementById('txt-status').innerText = "Đang vào " + (savedChoice === 'luci' ? 'LuCI' : 'VWRT') + "...";
                setTimeout(function() {
                    if (savedChoice === 'luci') window.location.href = getLuciLink();
                    else window.location.href = getVwrtLink();
                }, 300); 
            } else {
                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('selection-screen').style.display = 'block';
            }
        }
        function selectDashboard(type) {
            localStorage.setItem('default_dashboard', type);
            if (type === 'luci') window.location.href = getLuciLink();
            else window.location.href = getVwrtLink();
        }
        window.onload = init;
    </script>
</head>
<body>
    <div id="loading-screen"><div class="loader"></div><p id="txt-status">Đang tải...</p></div>
    <div id="selection-screen">
        <h2 style="margin-top:0; color:#333;">Dashboard Selection</h2>
        <p style="margin-bottom:20px;">Chọn giao diện quản lý Router</p>
        <button class="btn btn-luci" onclick="selectDashboard('luci')">LuCI</button>
        <button class="btn btn-vwrt" onclick="selectDashboard('vwrt')">VWRT Dashboard</button>
        <p class="note">Để chọn lại, hãy truy cập: <b>IP-Router/?reset=1</b></p>
    </div>
</body>
</html>
EOF

echo "[5/5] Cap quyen va don dep..."
chmod 644 $INDEX_FILE
rm -rf $TMP_DIR

echo ""
echo "=========================================="
echo "      CAI DAT THANH CONG! (Success)"
echo "=========================================="

rm -f "$0" 2>/dev/null

echo "Dang khoi dong lai thiet bi sau 3 giay..."
sleep 3
reboot