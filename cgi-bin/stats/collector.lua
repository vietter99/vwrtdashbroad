#!/usr/bin/lua

local cjson = require "cjson"

-- Paths
local history_path = "/usr/lib/vwrt/stats/history.json"
local today_path = "/tmp/vwrt_stats_today.json"
local setup_flag = "/etc/vwrt_stats_initialized_v11" -- Final Official v11

-- Helper functions
local function read_file(path)
    local f = io.open(path, "r")
    if not f then return nil end
    local s = f:read("*all")
    f:close()
    return s
end

local function write_file(path, content)
    local f = io.open(path, "w")
    if f then f:write(content) f:close() end
end

local function get_hostnames()
    local hostnames = {}
    local f = io.open("/tmp/dhcp.leases", "r")
    if f then
        for line in f:lines() do
            local mac, ip, name = line:match("%s+(%S+)%s+(%S+)%s+(%S+)%s+")
            if ip and name and name ~= "*" then hostnames[ip] = name end
        end
        f:close()
    end
    return hostnames
end

-- [SELF-HEALING]
local function ensure_environment()
    os.execute("iptables -t mangle -N VWRT_DEVICES 2>/dev/null")
    os.execute("iptables -t mangle -C POSTROUTING -j VWRT_DEVICES 2>/dev/null || iptables -t mangle -I POSTROUTING -j VWRT_DEVICES")
    
    local arp = io.popen("cat /proc/net/arp | grep : | grep -v 00:00:00:00:00:00")
    if arp then
        for line in arp:lines() do
            local ip = line:match("^(%d+%.%d+%.%d+%.%d+)")
            if ip then
                os.execute("iptables -t mangle -C VWRT_DEVICES -d " .. ip .. " -j RETURN 2>/dev/null || iptables -t mangle -A VWRT_DEVICES -d " .. ip .. " -j RETURN -m comment --comment 'DEV_" .. ip .. "'")
                os.execute("iptables -t mangle -C VWRT_DEVICES -s " .. ip .. " -j RETURN 2>/dev/null || iptables -t mangle -A VWRT_DEVICES -s " .. ip .. " -j RETURN -m comment --comment 'DEV_" .. ip .. "'")
            end
        end
        arp:close()
    end
end

-- Collection
local function get_device_stats()
    local stats = {}
    local total = 0
    local hostnames = get_hostnames()
    local handle = io.popen("iptables -t mangle -vnL VWRT_DEVICES -x 2>/dev/null")
    if handle then
        for line in handle:read("*all"):gmatch("[^\r\n]+") do
            local bytes, ip = line:match("%s+%d+%s+(%d+)%s+RETURN%s+.-%s+/%* DEV_(%S+) %*/")
            if bytes and ip then
                local b = tonumber(bytes)
                local name = hostnames[ip] or ip
                stats[name] = (stats[name] or 0) + b
                total = total + b
            end
        end
        handle:close()
    end
    return stats, total
end

-- Run
ensure_environment()
local current_day = os.date("%Y-%m-%d")

-- 1. Update Today Traffic
local today_data = { date = current_day, traffic = 0, devices = 0, services = {} }
local today_raw = read_file(today_path) or "{}"
local ok, d = pcall(cjson.decode, today_raw)
if ok and d.date == current_day then today_data = d end

local dev_stats, grand_total = get_device_stats()
today_data.traffic = grand_total
today_data.services = dev_stats

local count = 0
for _ in pairs(dev_stats) do count = count + 1 end
if count > today_data.devices then today_data.devices = count end
write_file(today_path, cjson.encode(today_data))

-- 2. Update History (FIFO 90 days) - Official Mode
local history = {}
local hist_raw = read_file(history_path)
if hist_raw then
    local ok_h, h = pcall(cjson.decode, hist_raw)
    if ok_h then history = h end
end

-- Official Mode: Key is YYYY-MM-DD
local found = false
for i, entry in ipairs(history) do
    if entry.date == current_day then
        entry.traffic = grand_total
        entry.devices = today_data.devices
        found = true
        break
    end
end

if not found then
    table.insert(history, { date = current_day, traffic = grand_total, devices = today_data.devices })
end

-- Keep only last 90 entries
while #history > 90 do table.remove(history, 1) end
write_file(history_path, cjson.encode(history))
