#!/bin/sh

CACHE_FILE="/tmp/vwrt_mobile.json"
TEMP_FILE="/tmp/vwrt_mobile_temp.json"

INFO_SCRIPT="/www/vwrt/cgi-bin/modem/info.sh"

while true; do
    
    if [ -x "$INFO_SCRIPT" ]; then
        "$INFO_SCRIPT" json > "$TEMP_FILE" 2>/dev/null
    else
        echo '{"operator_name":"Lỗi: Không tìm thấy","signal":"0"}' > "$CACHE_FILE"
        sleep 10
        continue
    fi
    if [ -s "$TEMP_FILE" ] && grep -qE "operator_name|rsrp" "$TEMP_FILE"; then
        mv "$TEMP_FILE" "$CACHE_FILE"
    else
        if [ ! -f "$CACHE_FILE" ]; then
             echo '{"operator_name":"Mất kết nối","signal":"0","mode":"-"}' > "$CACHE_FILE"
        fi
    fi

    sleep 5
done