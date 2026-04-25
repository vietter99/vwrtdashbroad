#!/usr/bin/lua
-- WATCHDOG V2.1.3 (LUA PURE DYNAMIC EDITION - UTF-8 FIXED)
-- Last Update: 2026-04-23 12:21 (Force Sync)
-- Tự động kiểm tra internet và khôi phục mạng 100% dựa trên thực tế hệ thống

local nixio = require "nixio"

-- --- CẤU HÌNH ---
local CONFIG = {
    check_interval = 60,     -- Kiểm tra mỗi 60 giây
    dead_period = 120,        -- Chờ mạng rớt 2 phút (120s) rồi mới restart
    tcp_port = 53,
    timeout = 3,
    lock_file = "/tmp/vwrt_watchdog.lock",
    status_file = "/tmp/vwrt_watchdog.status"
}

local function log(msg)
    -- Su dung logger cua he thong de ghi lai hoat dong
    os.execute(string.format("logger -t WATCHDOG '%s'", msg))
end

-- --- SINGLETON (CHỐNG CHẠY ĐÈ) ---
local function check_singleton()
    local f = io.open(CONFIG.lock_file, "r")
    if f then
        local old_pid = f:read("*n")
        f:close()
        if old_pid and nixio.kill(old_pid, 0) then
            log(string.format("Phat hien tien trinh cu (%s), dang khoi dong lai...", old_pid))
            nixio.kill(old_pid, 9)
            -- Doi mot chut de tien trinh cu thuc su thoat
            nixio.nanosleep(1, 0)
        end
    end
    f = io.open("/tmp/vwrt_watchdog.lock", "w")
    if f then
        f:write(tostring(nixio.getpid()))
        f:close()
    end
end

-- --- CONFIGURATION ---
local function get_uci_config()
    local handle = io.popen("uci -q get vwrt_watchdog.settings.mobile_check 2>/dev/null")
    local mobile_check = handle:read("*a"):gsub("%s+", "")
    handle:close()

    handle = io.popen("uci -q get vwrt_watchdog.settings.proxy_check 2>/dev/null")
    local proxy_check = handle:read("*a"):gsub("%s+", "")
    handle:close()

    handle = io.popen("uci -q get vwrt_watchdog.settings.interval 2>/dev/null")
    local interval = tonumber(handle:read("*a") or "30")
    handle:close()

    handle = io.popen("uci -q get vwrt_watchdog.settings.dead_period 2>/dev/null")
    local dead_period = tonumber(handle:read("*a") or "120")
    handle:close()

    return {
        mobile_check = (mobile_check == "1"),
        proxy_check = (proxy_check == "1"),
        check_interval = interval,
        dead_period = dead_period,
        status_file = "/tmp/vwrt_watchdog.status"
    }
end

local CONFIG = get_uci_config()

-- --- KIEM TRA WAN (MANG DI DONG) ---
local function check_wan()
    if not CONFIG.mobile_check then return true end

    local dns = "8.8.8.8"
    
    -- 1. Thử lấy DNS của giao diện mạng di động 5G
    local iface = "5G"
    local handle = io.popen("ubus call network.interface." .. iface .. " status 2>/dev/null")
    local status = handle:read("*a")
    handle:close()
    
    if status and status ~= "" then
        local parsed_dns = status:match('\"[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\"')
        if parsed_dns then 
            dns = parsed_dns:gsub('\"', '')
        end
    end
    
    -- 2. Ping DNS (Hoạt động cho mọi nhà mạng)
    if os.execute(string.format("ping -c 1 -W 2 '%s' >/dev/null 2>&1", dns)) == 0 then 
        return true 
    end
    
    -- 3. Ping 8.8.8.8
    if dns ~= "8.8.8.8" and os.execute("ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1") == 0 then
        return true
    end
    
    return false
end

-- --- KIEM TRA PROXY ---
local function check_proxy()
    if not CONFIG.proxy_check then return true end

    -- Thử curl một trang quốc tế (qua Proxy)
    if os.execute("curl -I -s -m 5 'http://www.google.com/generate_204' >/dev/null 2>&1") == 0 then
        return true
    end
    return false
end

-- --- XU LY KHI MANG ROT ---
local function handle_failure(fail_duration, wan_ok, proxy_ok)
    if fail_duration >= CONFIG.dead_period then
        if not wan_ok then
            log(string.format("Canh bao: Mat Internet Di dong lien tuc %ds. Dang khoi phuc ket noi...", fail_duration))
            os.execute("ifup 5G >/dev/null 2>&1")
            os.execute("/etc/init.d/shadowsocksr restart 2>/dev/null")
        elseif not proxy_ok then
            log(string.format("Canh bao: Ket noi Di dong on dinh nhung Proxy chet %ds. Dang khoi dong lai Proxy...", fail_duration))
            os.execute("/etc/init.d/shadowsocksr restart 2>/dev/null")
        end
        return 0
    else
        log(string.format("Canh bao: Mang khong on dinh (Di dong: %s, Proxy: %s). Thoi gian rot: %ds (Gioi han: %ds)", 
            wan_ok and "OK" or "Loi", proxy_ok and "OK" or "Loi", fail_duration, CONFIG.dead_period))
        return fail_duration + CONFIG.check_interval
    end
end

-- --- MAIN LOOP ---
check_singleton()

if not CONFIG.mobile_check and not CONFIG.proxy_check then
    log("He thong tu dong phuc hoi mang dang tam dung.")
else
    log("He thong tu dong phuc hoi mang da san sang.")
end

local fail_duration = 0
while true do
    -- Refresh config each loop if needed, or just rely on service restart
    -- For performance, we keep the config loaded unless service restarts
    
    local wan_ok = check_wan()
    local proxy_ok = check_proxy()
    
    if wan_ok and proxy_ok then
        if fail_duration > 0 then
            log(string.format("Thong bao: Internet va Proxy da on dinh sau %ds.", fail_duration))
            fail_duration = 0
        end
        local f = io.open(CONFIG.status_file, "w")
        if f then f:write("OK"); f:close() end
    else
        fail_duration = handle_failure(fail_duration, wan_ok, proxy_ok)
        local f = io.open(CONFIG.status_file, "w")
        if f then f:write("ERROR"); f:close() end
    end
    
    nixio.nanosleep(CONFIG.check_interval, 0)
end
