#!/bin/sh
DEVICE=$1
CMD=$2
[ -z "$DEVICE" ] && exit 1
[ -z "$CMD" ] && exit 1

# Unique TMP file
TMP="/tmp/at_res_$$"
rm -f $TMP

# 0. Global cleanup (Safety net)
# Only kill cats accessing THIS device to avoid collateral damage?
# Ideally we just kill all cats to be safe in this specific environment.
killall -9 cat 2>/dev/null

# 1. DRAIN PHASE (CRITICAL)
# Read from device for 1s and throw away.
# This ensures the buffer is empty before we ask a question.
(cat $DEVICE > /dev/null & PID=$!; sleep 1; kill -9 $PID 2>/dev/null) >/dev/null 2>&1

# 2. EXECUTION PHASE
# Start listener
(cat $DEVICE > $TMP & PID=$!; sleep 1; echo -e "$CMD\r" > $DEVICE; sleep 2; kill -9 $PID 2>/dev/null) >/dev/null 2>&1

# 3. RETURN RESULT
if [ -f $TMP ]; then
    cat $TMP
    rm -f $TMP
fi
