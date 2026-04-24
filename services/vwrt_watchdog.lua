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
    f = io.open(CONFIG.lock_file, "w")
    if f then
        f:write(tostring(nixio.getpid()))
        f:close()
    end
end

-- --- KIEM TRA WAN (MANG GOC) ---
local function check_wan()
    local dns = "8.8.8.8"
    
    -- 1. Lay DNS nha mang bang grep tu cong 5G
    local handle = io.popen("ubus call network.interface.5G status 2>/dev/null | grep -o '\"[0-9]\\+\\.[0-9]\\+\\.[0-9]\\+\\.[0-9]\\+\"' | head -n 1 | tr -d '\"'")
    local parsed_dns = handle:read("*a"):gsub("%s+", "")
    handle:close()
    
    if parsed_dns and parsed_dns ~= "" then 
        dns = parsed_dns 
    end
    
    -- 2. Ping DNS nha mang (Hoat dong cho moi nha mang)
    if os.execute(string.format("ping -c 1 -W 2 '%s' >/dev/null 2>&1", dns)) == 0 then 
        return true 
    end
    
    -- 3. Ping 8.8.8.8 (Dach cho SIM CO DATA, truong hop DNS nha mang khong cho ping)
    if dns ~= "8.8.8.8" and os.execute("ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1") == 0 then
        return true
    end
    
    -- 4. Kiem tra SNI cua Proxy (Dach cho SIM HET DATA / Bypass)
    local global_server = io.popen("uci -q get shadowsocksr.@global[0].global_server 2>/dev/null"):read("*a"):gsub("%s+", "")
    if global_server and global_server ~= "" and global_server ~= "nil" then
        local ws_host = io.popen(string.format("uci -q get shadowsocksr.%s.ws_host 2>/dev/null", global_server)):read("*a"):gsub("%s+", "")
        if ws_host and ws_host ~= "" and ws_host ~= "nil" then
            if os.execute(string.format("curl -I -s -m 5 'http://%s' >/dev/null 2>&1", ws_host)) == 0 then
                return true
            end
        end
    end
    
    return false
end

-- --- KIEM TRA PROXY ---
local function check_proxy()
    -- Thu curl mot trang quoc te (qua Proxy)
    if os.execute("curl -I -s -m 5 'http://www.google.com/generate_204' >/dev/null 2>&1") == 0 then
        return true
    end
    return false
end

-- --- XU LY KHI MANG ROT ---
local function handle_failure(fail_duration, wan_ok, proxy_ok)
    if fail_duration >= CONFIG.dead_period then
        if not wan_ok then
            log(string.format("Canh bao: Mat Internet WAN lien tuc %ds. Dang khoi phuc ket noi 5G...", fail_duration))
            -- Chi restart duy nhat cong 5G
            os.execute("ifup 5G >/dev/null 2>&1")
            -- Neu 5G rot thi cung nen restart Proxy de dam bao dong bo
            os.execute("/etc/init.d/shadowsocksr restart")
        elseif not proxy_ok then
            log(string.format("Canh bao: Ket noi 5G on dinh nhung Proxy chet %ds. Dang khoi dong lai Proxy...", fail_duration))
            os.execute("/etc/init.d/shadowsocksr restart")
        end
        return 0
    else
        log(string.format("Canh bao: Mang khong on dinh (5G: %s, Proxy: %s). Thoi gian rot: %ds (Gioi han: %ds)", 
            wan_ok and "OK" or "Loi", proxy_ok and "OK" or "Loi", fail_duration, CONFIG.dead_period))
        return fail_duration + CONFIG.check_interval
    end
end

-- --- MAIN LOOP ---
check_singleton()
log("Watchdog V2.1.3 da khoi dong.")

local fail_duration = 0
while true do
    local wan_ok = check_wan()
    local proxy_ok = check_proxy()
    
    if wan_ok and proxy_ok then
        if fail_duration > 0 then
            log(string.format("Thong bao: Internet va Proxy da on dinh sau %ds.", fail_duration))
            fail_duration = 0
        end
        -- Ghi trang thai OK vao status file
        local f = io.open(CONFIG.status_file, "w")
        if f then f:write("OK"); f:close() end
    else
        fail_duration = handle_failure(fail_duration, wan_ok, proxy_ok)
        -- Ghi trang thai ERROR vao status file
        local f = io.open(CONFIG.status_file, "w")
        if f then f:write("ERROR"); f:close() end
    end
    
    nixio.nanosleep(CONFIG.check_interval, 0)
end
