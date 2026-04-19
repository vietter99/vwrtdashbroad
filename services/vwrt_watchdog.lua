#!/usr/bin/lua
-- WATCHDOG V2.1.1 (LUA PURE DYNAMIC EDITION)
-- Tự động tìm kiếm mục tiêu kiểm tra 100% dựa trên thực tế hệ thống

local nixio = require "nixio"
local uci = require "uci"

-- --- CẤU HÌNH ---
local CONFIG = {
    check_interval = 20,     -- Kiểm tra mỗi 20 giây
    dead_period = 60,        -- Chờ mạng rớt 1 phút (60s) rồi mới restart
    tcp_port = 53,
    timeout = 3,
    lock_file = "/tmp/vwrt_watchdog.lock",
    status_file = "/tmp/vwrt_watchdog.status"
}

local function log(msg)
    os.execute(string.format("logger -t WATCHDOG '%s'", msg))
end

-- --- SINGLETON (CHỐNG CHẠY ĐÈ) ---
local function check_singleton()
    local f = io.open(CONFIG.lock_file, "r")
    if f then
        local old_pid = f:read("*n")
        f:close()
        if old_pid and nixio.kill(old_pid, 0) then
            log(string.format("Phát hiện tiến trình cũ (%s), đang khởi động lại...", old_pid))
            nixio.kill(old_pid, 9)
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
    
    -- 2. Lấy SNI từ SSR Plus (Chỉ dùng nếu người dùng có cấu hình)
    local cursor = uci.cursor()
    local sni = cursor:get("shadowsocksr", "@global[0]", "time_server")
    if sni and sni ~= "" and sni ~= "nil" then 
        table.insert(targets, sni) 
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
            -- Nếu là SNI (Tên miền) -> Thử HTTP Head
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

-- --- TIẾN TRÌNH CHÍNH ---
local function main()
    check_singleton()
    log("Hệ thống giám sát mạng đã sẵn sàng")

    local last_success = os.time()
    local last_check = 0
    
    while true do
        local now = os.time()
        if (now - last_check) >= CONFIG.check_interval then
            last_check = now
            local handle = io.popen("ubus call network.interface.5G status")
            local status_json = handle:read("*a")
            handle:close()
            local is_up = status_json:match('"up":%s*true')
            
            if is_up then
                if check_connectivity() then
                    local downtime = now - last_success
                    if downtime > CONFIG.check_interval then
                        log(string.format("Kết nối Internet đã khôi phục (Sau khi gián đoạn %ss)", downtime))
                    end
                    last_success = now
                    local sf = io.open(CONFIG.status_file, "w")
                    if sf then sf:write("ONLINE"); sf:close() end
                else
                    local downtime = now - last_success
                    local sf = io.open(CONFIG.status_file, "w")
                    if sf then sf:write("OFFLINE"); sf:close() end
                    log(string.format("Cảnh báo: Không thể truy cập Internet. Thời gian rớt: %ss (Giới hạn: %ss)", downtime, CONFIG.dead_period))
                    
                    if downtime >= CONFIG.dead_period then
                        log(string.format("LỖI NGHIÊM TRỌNG: Mất mạng quá %ss. Đang tiến hành khôi phục mạng...", CONFIG.dead_period))
                        os.execute("ifdown 5G; sleep 2; /etc/init.d/modemmanager restart; sleep 15; ifup 5G")
                        last_success = os.time() 
                    end
                end
            end
        end
        nixio.nanosleep(5, 0)
    end
end

local ok, err = pcall(main)
if not ok then
    log("Lỗi hệ thống Watchdog: " .. tostring(err))
    os.remove(CONFIG.lock_file)
end
