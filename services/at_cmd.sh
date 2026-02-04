#!/bin/sh
DEVICE=$1
CMD=$2
[ -z "$DEVICE" ] && exit 1
[ -z "$CMD" ] && exit 1

# Kiểm tra device tồn tại và là character device (không phải file thường)
# Quan trọng: Ngăn việc ghi vào path tạo file thường thay vì mở device
if [ ! -c "$DEVICE" ]; then
    exit 1
fi

TMP="/tmp/at_res_$$"
rm -f $TMP

# Use a standard robust method to capture AT response
# without killing other processes.
(cat $DEVICE > $TMP) &
CAT_PID=$!

# Short delay to ensure cat is ready
sleep 0.5
echo -e "$CMD\r" > $DEVICE

# Wait for response then kill the cat
sleep 1.5
kill -9 $CAT_PID 2>/dev/null

if [ -f $TMP ]; then
    cat $TMP
    rm -f $TMP
fi
