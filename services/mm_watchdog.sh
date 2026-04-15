#!/bin/sh
# Real-time event-driven watchdog for ModemManager (ATC style)

logger -t MM_ATC "Khởi động ATC Event-Driven Watchdog cho ModemManager"

while true; do
    # Bắt đầu nghe event từ ModemManager (không dùng ping)
    # mmcli --monitor-state sẽ stream log liên tục khi có sự kiện thay đổi D-Bus
    mmcli -m 0 --monitor-state 2>&1 | while read -r line; do
        if echo "$line" | grep -q "state changed"; then
            # Parse state mới từ dòng log "state changed (connected -> registered)"
            STATE=$(echo "$line" | awk -F '->' '{print $2}' | tr -d " )'")
            
            if [ "$STATE" = "registered" ]; then
                logger -t MM_ATC "Phát hiện rớt mạng tức thì! (State: registered). Đang reconnect..."
                APN=$(uci -q get network.5G.apn)
                # Dùng Dấu & để chạy nền tránh block luồng monitor
                if [ -n "$APN" ]; then
                    mmcli -m 0 --simple-connect="apn=${APN}" > /dev/null 2>&1 &
                fi
            elif [ "$STATE" = "failed" ]; then
                logger -t MM_ATC "Lỗi trạng thái modem (State: failed). Đang Reset Radio..."
                mmcli -m 0 --reset > /dev/null 2>&1 &
            elif [ "$STATE" = "disabled" ]; then
                logger -t MM_ATC "Modem bị vô hiệu hóa (State: disabled). Đang Enable..."
                mmcli -m 0 --enable > /dev/null 2>&1 &
            fi
        fi
    done
    
    # Nếu lệnh monitor dừng (ModemManager restart), ngủ 5s rồi kết nối loop lại
    sleep 5
done
