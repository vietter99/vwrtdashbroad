#!/usr/bin/lua
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
    -- Sử dụng logger của hệ thống (Bao bọc trong ngoặc kép để an toàn UTF-8)
    os.execute(string.format("logger -t WATCHDOG \"%s\"", msg))
    print(string.format("[%s] %s", os.date("%Y-%m-%d %H:%M:%S"), msg))
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

-- --- CONFIGURATION ---
local function get_uci_config()
    local check = io.popen("uci -q get vwrt_watchdog.settings 2>/dev/null")
    local exists = check:read("*a")
    check:close()

    if exists == "" then
        local f = io.open("/etc/config/vwrt_watchdog", "w")
        if f then
            f:write("config watchdog 'settings'\n")
            f:write("\toption mobile_check '1'\n")
            f:write("\toption proxy_check '0'\n")
            f:write("\toption interval '60'\n")
            f:write("\toption dead_period '120'\n")
            f:write("\toption status_file '/tmp/vwrt_watchdog.status'\n")
            f:close()
        end
    end

    local handle = io.popen("uci -q get vwrt_watchdog.settings.mobile_check 2>/dev/null")
    local mobile_check = handle:read("*a"):gsub("%s+", "")
    handle:close()

    handle = io.popen("uci -q get vwrt_watchdog.settings.proxy_check 2>/dev/null")
    local proxy_check = handle:read("*a"):gsub("%s+", "")
    handle:close()

    handle = io.popen("uci -q get vwrt_watchdog.settings.interval 2>/dev/null")
    local interval = tonumber((handle:read("*a"):gsub("%s+", ""))) or 30
    handle:close()

    handle = io.popen("uci -q get vwrt_watchdog.settings.dead_period 2>/dev/null")
    local dead_period = tonumber((handle:read("*a"):gsub("%s+", ""))) or 120
    handle:close()

    return {
        mobile_check = (mobile_check ~= "0"),
        proxy_check = (proxy_check == "1"),
        check_interval = interval,
        dead_period = dead_period,
        status_file = "/tmp/vwrt_watchdog.status"
    }
end

local CONFIG_UCI = get_uci_config()

-- --- KIỂM TRA WAN (MẠNG DI ĐỘNG) ---
local function check_wan()
    if not CONFIG_UCI.mobile_check then return true end

    local dns = "8.8.8.8"
    local iface = "5G"
    local handle = io.popen("ubus call network.interface." .. iface .. " status 2>/dev/null")
    local status = handle:read("*a")
    handle:close()
    
    if status and status ~= "" then
        local dns_section = status:match('"dns%-server":%s*%[%s*"([^"]+)"')
        if dns_section then 
            dns = dns_section
        end
    end
    
    log(string.format("1. Đang kiểm tra DNS nhà mạng: %s", dns))
    if os.execute(string.format("ping -c 1 -W 2 -I wwan0 '%s' >/dev/null 2>&1", dns)) == 0 then 
        log(" -> Kết quả: Thành công (DNS nhà mạng OK)")
        return true 
    else
        log(" -> Kết quả: Thất bại (Không thể kết nối tới DNS nhà mạng)")
    end
    
    if dns ~= "8.8.8.8" then
        log("2. Đang kiểm tra DNS dự phòng: 8.8.8.8")
        if os.execute("ping -c 1 -W 2 -I wwan0 8.8.8.8 >/dev/null 2>&1") == 0 then
            log(" -> Kết quả: Thành công (Mạng vẫn sống qua DNS dự phòng)")
            return true
        else
            log(" -> Kết quả: Thất bại (Cả DNS nhà mạng và dự phòng đều chết)")
        end
    end
    
    return false
end

-- --- KIỂM TRA PROXY ---
local function check_proxy()
    if not CONFIG_UCI.proxy_check then return true end

    log("3. Đang kiểm tra kết nối Proxy quốc tế...")
    if os.execute("curl -I -s -m 5 'http://www.google.com/generate_204' >/dev/null 2>&1") == 0 then
        log(" -> Kết quả: Thành công (Proxy hoạt động tốt)")
        return true
    end
    log(" -> Kết quả: Thất bại (Proxy bị treo hoặc lỗi)")
    return false
end

-- --- XỬ LÝ KHI MẠNG RỚT ---
local function handle_failure(fail_duration, wan_ok, proxy_ok)
    if fail_duration >= CONFIG_UCI.dead_period then
        if not wan_ok then
            log(string.format("Cảnh báo: Mất Internet Di động liên tục %ds. Đang khôi phục kết nối...", fail_duration))
            os.execute("ifup 5G >/dev/null 2>&1")
            os.execute("/etc/init.d/shadowsocksr restart 2>/dev/null")
        elseif not proxy_ok then
            log(string.format("Cảnh báo: Kết nối Di động ổn định nhưng Proxy chết %ds. Đang khởi động lại Proxy...", fail_duration))
            os.execute("/etc/init.d/shadowsocksr restart 2>/dev/null")
        end
        return 0
    else
        local wan_status = not CONFIG_UCI.mobile_check and "Tắt" or (wan_ok and "OK" or "Lỗi")
        local proxy_status = not CONFIG_UCI.proxy_check and "Tắt" or (proxy_ok and "OK" or "Lỗi")
        
        log(string.format("Cảnh báo: Mạng không ổn định (Di động: %s, Proxy: %s). Thời gian rớt: %ds (Giới hạn: %ds)", 
            wan_status, proxy_status, fail_duration, CONFIG_UCI.dead_period))
        return fail_duration + CONFIG_UCI.check_interval
    end
end

-- --- VÒNG LẶP CHÍNH ---
check_singleton()

if not CONFIG_UCI.mobile_check and not CONFIG_UCI.proxy_check then
    log("Hệ thống tự động phục hồi mạng đang tạm dừng.")
else
    log("Hệ thống tự động phục hồi mạng đã sẵn sàng.")
end

local fail_duration = 0
while true do
    local wan_ok = check_wan()
    local proxy_ok = check_proxy()
    
    if wan_ok and proxy_ok then
        if fail_duration > 0 then
            log(string.format("Thông báo: Internet và Proxy đã ổn định sau %ds.", fail_duration))
            fail_duration = 0
        end
        local f = io.open(CONFIG_UCI.status_file, "w")
        if f then f:write("OK"); f:close() end
    else
        fail_duration = handle_failure(fail_duration, wan_ok, proxy_ok)
        local f = io.open(CONFIG_UCI.status_file, "w")
        if f then f:write("ERROR"); f:close() end
    end
    
    nixio.nanosleep(CONFIG_UCI.check_interval, 0)
end
