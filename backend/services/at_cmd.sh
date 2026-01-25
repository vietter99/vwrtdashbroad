#!/bin/sh
DEV=$1
CMD=$2

# 1. Config TTY first
stty -F $DEV 115200 raw -echo 2>/dev/null

# 2. Cleanup old output
rm -f /tmp/at_res
touch /tmp/at_res

# 3. Read background
cat $DEV > /tmp/at_res &
PID=$!
# Wait for cat to open device
sleep 1

# 4. Send command to device
echo -e "$CMD\r" > $DEV

# 5. Wait for response
sleep 1

# 6. Kill reader
kill $PID 2>/dev/null
wait $PID 2>/dev/null

# 7. Output result
cat /tmp/at_res
rm -f /tmp/at_res
