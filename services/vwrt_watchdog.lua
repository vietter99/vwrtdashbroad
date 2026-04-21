#!/usr/bin/lua
-- WATCHDOG V2.1.1 (LUA PURE DYNAMIC EDITION)
-- Tá»± Ä‘á»™ng tÃ¬m kiáº¿m má»¥c tiÃªu kiá»ƒm tra 100% dá»±a trÃªn thá»±c táº¿ há»‡ thá»‘ng

local nixio = require "nixio"
local uci = require "uci"

-- --- Cáº¤U HÃŒNH ---
local CONFIG = {
    check_interval = 20,     -- Kiá»ƒm tra má»—i 20 giÃ¢y
    dead_period = 60,        -- Chá» máº¡ng rá»›t 1 phÃºt (60s) rá»“i má»›i restart
    tcp_port = 53,
    timeout = 3,
    lock_file = "/tmp/vwrt_watchdog.lock",
    status_file = "/tmp/vwrt_watchdog.status"
}

local function log(msg)
    os.execute(string.format("logger -t WATCHDOG '%s'", msg))
end

-- --- SINGLETON (CHá» NG CHáº Y ÄÃˆ) ---
local function check_singleton()
    local f = io.open(CONFIG.lock_file, "r")
    if f then
        local old_pid = f:read("*n")
        f:close()
        if old_pid and nixio.kill(old_pid, 0) then
            log(string.format("PhÃ¡t hiá»‡n tiáº¿n trÃ¬nh cÅ© (%s), Ä‘ang khá»Ÿi Ä‘á»™ng láº¡i...", old_pid))
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

-- --- Tá»± Äá»˜NG TÃŒM KIáº¾M Má»¤C TIÃU (DYNAMIC DISCOVERY) ---
local function get_targets()
    local targets = {}
    
    -- 1. Láº¥y DNS nhÃ  máº¡ng tá»« Interface 5G (Tá»± tÃ¬m)
    local handle = io.popen("ubus call network.interface.5G status | jsonfilter -e '@[\"dns-server\"][0]' 2>/dev/null")
    local dns = handle:read("*a"):gsub("%s+", "")
    handle:close()
    if dns and dns ~= "" then table.insert(targets, dns) end
    
    -- 2. Láº¥y SNI tá»« SSR Plus (Chá»‰ dÃ¹ng náº¿u ngÆ°á»i dÃ¹ng cÃ³ cáº¥u hÃ¬nh)
    local cursor = uci.cursor()
    local sni = cursor:get("shadowsocksr", "@global[0]", "time_server")
    if sni and sni ~= "" and sni ~= "nil" then 
        table.insert(targets, sni) 
    end
    
    -- Náº¿u hoÃ n toÃ n khÃ´ng cÃ³ má»¥c tiÃªu nÃ o Ä‘Æ°á»£c tÃ¬m tháº¥y, má»›i dÃ¹ng 8.8.8.8 lÃ m cá»©u cÃ¡nh cuá»‘i cÃ¹ng
    if #targets == 0 then
        table.insert(targets, "8.8.8.8")
    end
    
    return targets
end

-- --- KIá» M TRA TCP ---
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

-- --- KIá» M TRA Tá»”NG THá»‚ ---
local function check_connectivity()
    local targets = get_targets()
    for _, host in ipairs(targets) do
        if host:match("^%d+%.%d+%.%d+%.%d+$") then
            -- Náº¿u lÃ  IP (DNS nhÃ  máº¡ng) -> Thá»­ TCP 53
            if tcp_check(host, CONFIG.tcp_port) then return true end
        else
            -- Náº¿u lÃ  SNI (TÃªn miá»n) -> Thá»­ HTTP Head
            if os.execute(string.format("curl -I -s -m 5 'http://%s' >/dev/null 2>&1", host)) == 0 then
                return true
            end
        end
    end
    -- Lá»›p cuá»‘i cÃ¹ng: Ping (Náº¿u cáº£ TCP vÃ  HTTP Ä‘á»u khÃ´ng cÃ³ trong danh sÃ¡ch)
    if #targets == 1 and targets[1] == "8.8.8.8" then
        if os.execute("ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1") == 0 then return true end
    end
    return false
end

-- --- TIáº¾N TRÃŒNH CHÃNH ---
local function main()
    check_singleton()
    log("Há»‡ thá»‘ng giÃ¡m sÃ¡t máº¡ng Ä‘Ã£ sáºµn sÃ ng")

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
                        log(string.format("Káº¿t ná»‘i Internet Ä‘Ã£ khÃ´i phá»¥c (Sau khi giÃ¡n Ä‘oáº¡n %ss)", downtime))
                    end
                    last_success = now
                    local sf = io.open(CONFIG.status_file, "w")
                    if sf then sf:write("ONLINE"); sf:close() end
                else
                    local downtime = now - last_success
                    local sf = io.open(CONFIG.status_file, "w")
                    if sf then sf:write("OFFLINE"); sf:close() end
                    log(string.format("Cáº£nh bÃ¡o: KhÃ´ng thá»ƒ truy cáº­p Internet. Thá»i gian rá»›t: %ss (Giá»›i háº¡n: %ss)", downtime, CONFIG.dead_period))
                    
                    if downtime >= CONFIG.dead_period then
                        log(string.format("Lá»–I NGHIÃM TRá»ŒNG: Máº¥t máº¡ng quÃ¡ %ss. Äang tiáº¿n hÃ nh khÃ´i phá»¥c máº¡ng...", CONFIG.dead_period))
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
    log("Lá»—i há»‡ thá»‘ng Watchdog: " .. tostring(err))
    os.remove(CONFIG.lock_file)
end
