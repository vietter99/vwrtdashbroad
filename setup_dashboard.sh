#!/bin/sh

# === CẤU HÌNH ===
# Đường dẫn file index của OpenWrt
INDEX_FILE="/www/index.html"
BACKUP_FILE="/www/index.html.bak"

echo "Dang bat dau cai dat VWRT Dashboard Launcher..."

# 1. KIỂM TRA VÀ BACKUP FILE GỐC
if [ -f "$INDEX_FILE" ]; then
    if [ ! -f "$BACKUP_FILE" ]; then
        mv "$INDEX_FILE" "$BACKUP_FILE"
        echo "[OK] Da backup file goc sang: $BACKUP_FILE"
    else
        echo "[INFO] File backup da ton tai. Se ghi de file index.html hien tai."
    fi
else
    echo "[WARN] Khong tim thay file index.html goc. Dang tao file moi..."
fi

# 2. GHI NỘI DUNG MỚI VÀO INDEX.HTML
cat << 'EOF' > "$INDEX_FILE"
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <title>OpenWrt Gateway</title>
    <style>
        body { background: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; height: 100vh; display: flex; justify-content: center; align-items: center; flex-direction: column; margin: 0; }
        
        /* Giao diện chọn (Ẩn mặc định) */
        #selection-screen { display: none; text-align: center; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 320px; max-width: 90%; }
        
        /* Giao diện Loading */
        #loading-screen { display: flex; flex-direction: column; align-items: center; }
        
        .btn { display: block; width: 100%; padding: 15px 0; margin-bottom: 15px; text-decoration: none; color: white; font-weight: bold; border-radius: 8px; cursor: pointer; border: none; font-size: 16px; transition: opacity 0.2s; }
        .btn:hover { opacity: 0.9; }
        .btn-luci { background-color: #0099cc; }
        .btn-vwrt { background-color: #3182ce; }
        
        .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3182ce; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin-bottom: 15px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        p { color: #718096; font-size: 14px; margin-top: 0; }
        .note { font-size: 12px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;}
        
        /* Dark Mode support */
        @media (prefers-color-scheme: dark) {
            body { background: #1a1a1a; }
            #selection-screen { background: #2d2d2d; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
            h2 { color: #fff; }
            p { color: #ccc; }
        }
    </style>
    
    <script>
        // === CẤU HÌNH LIÊN KẾT ===
        function getLuciLink() { return "/cgi-bin/luci/"; }
        
        // VWRT chạy port 2222, lấy IP động theo trình duyệt
        function getVwrtLink() { return "http://" + window.location.hostname + ":2222"; } 

        function init() {
            // 1. Kiểm tra lệnh RESET từ URL (vd: 192.168.1.1/?reset=1)
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('reset')) {
                localStorage.removeItem('default_dashboard');
                // Xóa param trên thanh địa chỉ
                window.history.replaceState({}, document.title, "/");
            }

            // 2. Kiểm tra lựa chọn đã lưu trong LocalStorage
            const savedChoice = localStorage.getItem('default_dashboard');

            if (savedChoice) {
                // Đã lưu -> Chuyển hướng
                document.getElementById('loading-screen').style.display = 'flex';
                document.getElementById('txt-status').innerText = "Đang vào " + (savedChoice === 'luci' ? 'LuCI' : 'VWRT') + "...";
                
                // Delay nhỏ để UX mượt hơn
                setTimeout(function() {
                    if (savedChoice === 'luci') window.location.href = getLuciLink();
                    else window.location.href = getVwrtLink();
                }, 300); 
            } else {
                // Chưa lưu -> Hiện menu chọn
                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('selection-screen').style.display = 'block';
            }
        }

        // Xử lý khi bấm nút
        function selectDashboard(type) {
            localStorage.setItem('default_dashboard', type);
            if (type === 'luci') window.location.href = getLuciLink();
            else window.location.href = getVwrtLink();
        }

        window.onload = init;
    </script>
</head>
<body>

    <div id="loading-screen">
        <div class="loader"></div>
        <p id="txt-status">Đang tải...</p>
    </div>

    <div id="selection-screen">
        <h2 style="margin-top:0; color:#333;">Dashboard Selection</h2>
        <p style="margin-bottom:20px;">Chọn giao diện quản lý Router</p>
        
        <button class="btn btn-luci" onclick="selectDashboard('luci')">LuCI (Mặc định)</button>
        <button class="btn btn-vwrt" onclick="selectDashboard('vwrt')">VWRT Dashboard</button>
        
        <p class="note">Hệ thống sẽ tự động nhớ lựa chọn này.<br>Để chọn lại, hãy truy cập: <b>IP-Router/?reset=1</b></p>
    </div>

</body>
</html>
EOF

# 3. PHÂN QUYỀN
chmod 644 "$INDEX_FILE"

echo "[SUCCESS] Cai dat hoan tat! Truy cap Router de kiem tra."