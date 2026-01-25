#!/bin/sh
DEV=$1
CMD=$2
# Background cat to read response
cat $DEV > /tmp/at_res &
PID=$!
sleep 1
# Send command
echo -e "$CMD\r" > $DEV
sleep 1
# Kill buffer reader
kill $PID 2>/dev/null
# Dump result
cat /tmp/at_res
rm -f /tmp/at_res
