#!/bin/sh
# Advanced Multi-Layer Watchdog for VWRT (Event-Driven + Ping Health Check)
# Version: 1.1.5
# This watchdog ensures 24/7 connectivity by monitoring both hardware events 
# and real internet throughput, bypassing any active VPN/Bypass tunnels.

logger -t MM_WATCHDOG "Khởi động Vệ sĩ kết nối siêu cấp (Dual-Mode: HW Events + Ping Health)"

# --- CONFIGURATION ---
PING_TARGET="8.8.8.8"
FAIL_COUNT=0
MAX_FAILS=3
CHECK_INTERVAL=120 # 2 minutes

# Function to perform Internet Health Check (Bypass VPN)
check_internet_health() {
    # 1. Get current physical interface for 5G
    INTERFACE=$(ubus call network.interface.5G status | jsonfilter -e '@.l3_device' 2>/dev/null)
    
    if [ -z "$INTERFACE" ]; then
        # If interface is not even defined, it's definitely down
        return 1
    fi

    # 2. Ping target using the specific physical interface (-I)
    # This bypasses the default gateway (VPN tunnel)
    if ping -I "$INTERFACE" -c 1 -W 5 "$PING_TARGET" > /dev/null 2>&1; then
        return 0 # Healthy
    else
        return 1 # Failed
    fi
}

# --- BACKGROUND PROCESS: PING WATCHDOG ---
(
    while true; do
        sleep "$CHECK_INTERVAL"
        
        # Only check if interface is supposed to be up
        UP=$(ubus call network.interface.5G status | jsonfilter -e '@.up' 2>/dev/null)
        if [ "$UP" != "true" ]; then
            continue
        fi

        if check_internet_health; then
            if [ $FAIL_COUNT -gt 0 ]; then
                logger -t MM_WATCHDOG "Internet khôi phục thành công qua $INTERFACE."
            fi
            FAIL_COUNT=0
        else
            FAIL_COUNT=$((FAIL_COUNT + 1))
            logger -t MM_WATCHDOG "Cảnh báo: Ping internet qua $INTERFACE thất bại ($FAIL_COUNT/$MAX_FAILS)"
            
            if [ $FAIL_COUNT -ge $MAX_FAILS ]; then
                logger -t MM_WATCHDOG "PHÁT HIỆN MẤT MẠNG NGẦM! Đang thực hiện Auto-Healing (Restart Interface)..."
                ifdown 5G
                sleep 2
                ifup 5G
                FAIL_COUNT=0
                # Give it time to reconnect before next check
                sleep 30
            fi
        fi
    done
) &

# --- MAIN PROCESS: HARDWARE EVENT MONITOR ---
while true; do
    # Listen for ModemManager state changes
    mmcli -m 0 --monitor-state 2>&1 | while read -r line; do
        if echo "$line" | grep -q "state changed"; then
            STATE=$(echo "$line" | awk -F '->' '{print $2}' | tr -d " )'")
            
            case "$STATE" in
                "registered")
                    logger -t MM_WATCHDOG "Sự kiện: Modem rớt mạng (Registered). Đang reconnect..."
                    APN=$(uci -q get network.5G.apn)
                    [ -n "$APN" ] && mmcli -m 0 --simple-connect="apn=${APN}" > /dev/null 2>&1 &
                    ;;
                "failed")
                    logger -t MM_WATCHDOG "Sự kiện: Modem lỗi (Failed). Đang Reset Modem Hardware..."
                    mmcli -m 0 --reset > /dev/null 2>&1 &
                    ;;
                "disabled")
                    logger -t MM_WATCHDOG "Sự kiện: Modem bị tắt (Disabled). Đang Enable..."
                    mmcli -m 0 --enable > /dev/null 2>&1 &
                    ;;
                "connected")
                    logger -t MM_WATCHDOG "Sự kiện: Modem đã kết nối thành công (Connected)."
                    ;;
            esac
        fi
    done
    
    # If monitor crashes, wait 5s and restart
    sleep 5
done
