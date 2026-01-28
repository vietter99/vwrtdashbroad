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

    # 4. Copy Version File
    if [ -f "$SOURCE_FOLDER/version.json" ]; then
        cp "$SOURCE_FOLDER/version.json" $INSTALL_DIR/
        echo " -> Copied version.json"
    elif [ ! -f "$INSTALL_DIR/version.json" ]; then
        echo '{"dashboard":{"version":"1.0.0"}}' > "$INSTALL_DIR/version.json"
        echo " -> Created default version.json"
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
# 1. Setup VWRT on Port 2222 (Backup)
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

# 2. Set VWRT as DEFAULT on Port 80
uci set uhttpd.main.home='/www/vwrt'

uci commit uhttpd
/etc/init.d/uhttpd restart

# 3. Create Symlinks for LuCI inside /www/vwrt
ln -sf /www/luci-static /www/vwrt/luci-static
ln -sf /www/cgi-bin/luci /www/vwrt/cgi-bin/luci

echo "[3/5] Dang thiet lap..."
RC_FILE="/etc/rc.local"

# Update RC.LOCAL for new path
sed -i '/mobile_poller.lua/d' $RC_FILE
sed -i '/mobile_poller.sh/d' $RC_FILE
sed -i '/exit 0/i killall mobile_poller.lua 2>/dev/null' $RC_FILE
sed -i '/exit 0/i killall mobile_poller.sh 2>/dev/null' $RC_FILE
sed -i "/exit 0/i lua $INSTALL_DIR/services/mobile_poller.lua &" $RC_FILE

# Enable ModemManager Debug Mode
if [ -f "/etc/init.d/modemmanager" ]; then
    sed -i "s|/usr/sbin/ModemManager$|/usr/sbin/ModemManager --log-level=DEBUG --debug --log-file=/tmp/mm.log|g" /etc/init.d/modemmanager
    /etc/init.d/modemmanager restart
fi

# Start the service now
if [ -f "$INSTALL_DIR/services/mobile_poller.lua" ]; then
    killall mobile_poller.lua 2>/dev/null
    lua "$INSTALL_DIR/services/mobile_poller.lua" &
fi

echo "[4/5] Hoan tat cau hinh he thong..."

# Restore index.html if we were using landing page
if [ -f "$BACKUP_FILE" ]; then
    mv "$BACKUP_FILE" "$INDEX_FILE"
fi

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