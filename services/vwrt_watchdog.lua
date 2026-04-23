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

-- --- TỰ ĐỘNG TÌM KIẾM MỤC TIÊU (DYNAMIC DISCOVERY) ---
local function get_targets()
    local targets = {}
    
    -- 1. Lấy DNS nhà mạng từ Interface 5G (Tự tìm)
    local handle = io.popen("ubus call network.interface.5G status | jsonfilter -e '@[\"dns-server\"][0]' 2>/dev/null")
    local dns = handle:read("*a"):gsub("%s+", "")
    handle:close()
    if dns and dns ~= "" then table.insert(targets, dns) end
    
    -- 2. Lấy SNI từ SSR Plus (Đồng bộ với mục tiêu của Proxy)
    local handle = io.popen("uci -q get shadowsocksr.@global[0].time_server 2>/dev/null")
    if handle then
        local sni = handle:read("*a"):gsub("%s+", "")
        handle:close()
        if sni and sni ~= "" and sni ~= "nil" then 
            table.insert(targets, sni) 
        end
    end
    
    -- Nếu hoàn toàn không có mục tiêu nào được tìm thấy, mới dùng 8.8.8.8 làm cứu cánh cuối cùng
    if #targets == 0 then
        table.insert(targets, "8.8.8.8")
    end
    
    return targets
end

-- --- KIỂM TRA TCP ---
local function tcp_check(host, port)
    local socket = nixio.socket("inet", "stream")
    if not socket then return false end
    socket:setblocking(false)
    local success, code, msg = socket:connect(host, port)
    if not success and code == nixio.const.einprogress then
        nixio.poll({{fd=socket, events=nixio.poll.POLLOUT}}, CONFIG.timeout * 1000)
        success = socket:getopt("socket", "error") == 0
    end
    socket:close()
    return success
end

-- --- KIỂM TRA TỔNG THỂ ---
local function check_connectivity()
    local targets = get_targets()
    for _, host in ipairs(targets) do
        if host:match("^%d+%.%d+%.%d+%.%d+$") then
            -- Nếu là IP (DNS nhà mạng) -> Thử TCP 53
            if tcp_check(host, CONFIG.tcp_port) then return true end
        else
            -- Nếu là SNI (Tên miền) -> Thử HTTP Head qua curl
            if os.execute(string.format("curl -I -s -m 5 'http://%s' >/dev/null 2>&1", host)) == 0 then
                return true
            end
        end
    end
    -- Lớp cuối cùng: Ping (Nếu cả TCP và HTTP đều không có trong danh sách)
    if #targets == 1 and targets[1] == "8.8.8.8" then
        if os.execute("ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1") == 0 then return true end
    end
    return false
end

-- --- XỬ LÝ KHI MẠNG RỚT ---
local function handle_failure(fail_duration)
    if fail_duration >= CONFIG.dead_period then
        log(string.format("Canh bao: Mat Internet lien tuc %ds. Dang khoi phuc ket noi WAN va Proxy...", fail_duration))
        -- Chi restart interface 5G va Proxy, khong restart toan bo network de tranh rot Wifi
        os.execute("ifup 5G")
        os.execute("/etc/init.d/shadowsocksr restart")
        -- Doi mot chut de he thong on dinh
        return 0
    else
        log(string.format("Canh bao: Khong the truy cap Internet. Thoi gian rot: %ds (Gioi han: %ds)", fail_duration, CONFIG.dead_period))
        return fail_duration + CONFIG.check_interval
    end
end

-- --- MAIN LOOP ---
check_singleton()
log("Watchdog V2.1.3 da khoi dong.")

local fail_duration = 0
while true do
    if check_connectivity() then
        if fail_duration > 0 then
            log(string.format("Thong bao: Internet da khoi phuc sau %ds.", fail_duration))
            fail_duration = 0
        end
        -- Ghi trạng thái OK vào status file
        local f = io.open(CONFIG.status_file, "w")
        if f then f:write("OK"); f:close() end
    else
        fail_duration = handle_failure(fail_duration)
        -- Ghi trạng thái ERROR vào status file
        local f = io.open(CONFIG.status_file, "w")
        if f then f:write("ERROR"); f:close() end
    end
    
    nixio.nanosleep(CONFIG.check_interval, 0)
end
