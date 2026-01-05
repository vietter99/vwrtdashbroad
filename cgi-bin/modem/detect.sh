#!/bin/sh

DIR=$(cd "$(dirname "$0")"; pwd)

getdevicepath() {
	devname="$(basename $1)"
	case "$devname" in
	'wwan'*'at'*)
		devpath="$(readlink -f /sys/class/wwan/$devname/device)"
		echo ${devpath%/*/*/*}
		;;
	'ttyACM'*)
		devpath="$(readlink -f /sys/class/tty/$devname/device)"
		echo ${devpath%/*}
		;;
	'tty'*)
		devpath="$(readlink -f /sys/class/tty/$devname/device)"
		echo ${devpath%/*/*}
		;;
	*)
		devpath="$(readlink -f /sys/class/usbmisc/$devname/device)"
		echo ${devpath%/*}
		;;
	esac
}

DEVICE=$(uci -q get 3ginfo.@3ginfo[0].device)
if [ -n "$DEVICE" ]; then
	echo $DEVICE
	exit 0
fi

WAN_DEV=$(uci -q get network.wan.device)
if [ -z "$WAN_DEV" ]; then
    WAN_DEV=$(uci -q get network.modem.device)
fi

if [ -e "$WAN_DEV" ] && [ "${WAN_DEV#/dev/}" != "$WAN_DEV" ]; then
    if gcom -d $WAN_DEV -s $DIR/check.gcom >/dev/null 2>&1; then
        echo "$WAN_DEV"
        exit 0
    fi
fi

MODEMFILE=/tmp/modem_scan_cache
if [ -f $MODEMFILE ]; then
    DEVICE=$(cat $MODEMFILE)
    if [ -e "$DEVICE" ]; then
        echo $DEVICE
        exit 0
    fi
fi
DEVICES=$(find /dev -name "ttyUSB*" -o -name "ttyACM*" -o -name "wwan*at*" 2>/dev/null | sort -r)

if [ -n "$WAN_DEV" ]; then
    WAN_PHY_PATH=$(getdevicepath "$WAN_DEV")
    
    if [ -n "$WAN_PHY_PATH" ]; then
        DEVICES_FILTERED=""
        for DEVICE in $DEVICES; do
            T=$(getdevicepath $DEVICE)
            if [ "x$T" = "x$WAN_PHY_PATH" ]; then
                DEVICES_FILTERED="$DEVICES_FILTERED $DEVICE"
            fi
        done
        [ -n "$DEVICES_FILTERED" ] && DEVICES="$DEVICES_FILTERED"
    fi
fi

for DEVICE in $DEVICES; do
    gcom -d $DEVICE -s $DIR/check.gcom >/dev/null 2>&1
    
    if [ $? = 0 ]; then
        echo "$DEVICE"
        echo "$DEVICE" > $MODEMFILE
        exit 0
    fi
done

exit 1