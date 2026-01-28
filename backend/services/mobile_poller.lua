#!/usr/bin/lua

local cjson = require "cjson"
local CACHE_FILE = "/tmp/vwrt_mobile.json"
local TEMP_FILE = "/tmp/vwrt_mobile_temp.json"

function log(msg)
    -- Disabled logging to prevent disk filling
end

-- SECURITY NOTE: exec() được dùng với hardcoded commands trong poller
-- Không nhận user input nên KHÔNG CÓ command injection risk
function exec(cmd)
    local f = io.popen(cmd)
    if not f then return nil end
    local content = f:read("*all")
    f:close()
    return content
end

function exec_at_tty(device, cmd)
    -- Sanitize AT command để chống injection (tuy không nhận từ user)
    if not cmd or cmd == "" then return nil end
cmd = cmd:gsub("[;&|`$()]", "")  -- Remove shell metacharacters
    
    local command = "/www/vwrt/services/at_cmd.sh " .. device .. " '" .. cmd .. "'"
    local out = exec(command)
    return out
end

function read_file(path)
    local f = io.open(path, "r")
    if not f then return nil end
    local content = f:read("*all")
    f:close()
    return content
end

function write_file(path, content)
    local f = io.open(path, "w")
    if f then
        f:write(content)
        f:close()
    end
end

function get_net_stats(iface)
    local rx_path = "/sys/class/net/" .. iface .. "/statistics/rx_bytes"
    local tx_path = "/sys/class/net/" .. iface .. "/statistics/tx_bytes"
    local rx = read_file(rx_path)
    local tx = read_file(tx_path)
    return {
        rx = rx and rx:gsub("\n", "") or "0",
        tx = tx and tx:gsub("\n", "") or "0"
    }
end

-- Get last AT port from mmcli JSON ports array (last is usually the working one for Dell)
function get_at_port_from_json(raw_json)
    if not raw_json then return nil end
    local ok, parsed = pcall(cjson.decode, raw_json)
    if not ok or not parsed or not parsed.modem or not parsed.modem.generic then return nil end
    local ports = parsed.modem.generic.ports
    if not ports then return nil end
    local last_at_port = nil
    for _, p in ipairs(ports) do
        local port_name = p:match("(ttyUSB%d+) %(at%)")
        if port_name then last_at_port = "/dev/" .. port_name end
    end
    return last_at_port
end

function get_bands_string(bands_list)
    if not bands_list or #bands_list == 0 then return "" end
    local b_str = ""
    for _, b in ipairs(bands_list) do
        local clean = b:gsub("eutran%-", "B"):gsub("ngran%-", "n"):gsub("utran%-", "B")
        if b_str == "" then b_str = clean else b_str = b_str .. ", " .. clean end
    end
    return b_str
end

-- === SIERRA / EM9191 SPECIFIC PARSER ===
function parse_at_gstatus(output)
    if not output then return {} end
    local res = {}
    
    -- Temp
    local temp = output:match("Temperature:%s*(%d+)")
    if temp then res.mtemp = temp end
    
    -- LTE Band & CA
    local lte_pcc = output:match("LTE band:.-(%S+)")
    local active_bands = {}
    
    if lte_pcc then table.insert(active_bands, lte_pcc) end
    
    for i = 1, 4 do
        local state = output:match("LTE SCC" .. i .. " state:%s*(%S+)")
        local band = output:match("LTE SCC" .. i .. " band:%s*(%S+)")
        if state and state ~= "INACTIVE" and band then
            table.insert(active_bands, band)
        end
    end
    
    -- NR5G Band (Sierra Output)
    local nr_band = output:match("NR5G band:%s*(%S+)")
    if nr_band and nr_band ~= "---" then
        if #active_bands > 0 then
            res.active_mode = "5G NSA"
        else
            res.active_mode = "5G SA"
        end
        table.insert(active_bands, nr_band)
    elseif #active_bands > 1 then
        res.active_mode = "LTE-A"
    end
    
    if #active_bands > 0 then
        res.active_band = table.concat(active_bands, " + ")
    end

    local sys_mode = output:match("System mode:.-(%S+)")
    if sys_mode and not res.active_mode then res.active_mode = sys_mode end

    -- Enhanced RSRQ parsing (Try multiple formats)
    -- Matches "RSRQ (dB): -10" or "RSRQ: -10"
    local rsrq = output:match("RSRQ.-:.-([%-%d%.]+)")
    if rsrq then res.rsrq = rsrq end
    
    -- Enhanced RSSI parsing
    -- Matches "Rx0 RSSI: -60" or "RSSI (dBm): -60" or "RSSI: -60"
    local rssi = output:match("Rx[0M] RSSI:.-([%-%d]+)")
    if not rssi then rssi = output:match("RSSI.-:.-([%-%d]+)") end
    if rssi then res.rssi = rssi end
    
    -- 5G Stats
    local nr_rsrp = output:match("NR5G RSRP %(dBm%):%s*([%-%d]+)")
    local nr_sinr = output:match("NR5G SINR %(dB%):%s*([%-%d%.]+)")
    local nr_rsrq = output:match("NR5G RSRQ %(dB%):%s*([%-%d%.]+)")
    
    if nr_rsrp and nr_rsrp ~= "---" then
        res.rsrp = nr_rsrp
        res.sinr = nr_sinr
        res.rsrq = nr_rsrq
        if not res.active_mode or not res.active_mode:find("5G") then
             res.active_mode = "5G NSA"
        end
    else
        -- LTE SINR
        local sinr = output:match("SINR.-:.-([%-%d%.]+)")
        if sinr then res.sinr = sinr end
        
        -- LTE RSRP (Fallback if not 5G)
        local rsrp = output:match("Rx[0M] RSRP:.-([%-%d]+)")
        if not rsrp then rsrp = output:match("RSRP.-:.-([%-%d]+)") end
        if rsrp then res.rsrp = rsrp end
    end
    
    return res
end

-- === DELL / DW5821e SPECIFIC PARSER ===
function parse_at_dw5821e_temp(output)
    if not output then return nil end
    -- Format: xo_therm_buf:43
    local temp = output:match("xo_therm_buf:(%d+)")
    return temp
end

function parse_at_dw5821e_cainfo(output)
    if not output then return {} end
    local res = {}
    local active_bands = {}
    
    -- PCC info: Band is LTE_B3, Band_width...
    local pcc_band = output:match("PCC info: Band is (%S+),")
    if pcc_band then
        pcc_band = pcc_band:gsub("LTE_", "") -- Clean to B3
        table.insert(active_bands, pcc_band)
    end
    
    -- SCC info lookups (SCC1, SCC2...)
    -- SCC1 info: Band is LTE_B1, Band_width...
    for line in output:gmatch("SCC%d+ info: [^\n]+") do
        local scc_band = line:match("Band is (%S+),")
        if scc_band then
            scc_band = scc_band:gsub("LTE_", "")
            table.insert(active_bands, scc_band)
        end
    end
    
    if #active_bands > 1 then
        res.active_mode = "LTE-A"
    elseif #active_bands == 1 then
        res.active_mode = "LTE"
    end
    
    if #active_bands > 0 then
        res.active_band = table.concat(active_bands, " + ")
    end
    
    return res
end


-- === MAIN JSON PARSER ===
function parse_mmcli_json(raw_json)
    if not raw_json or raw_json == "" then return nil end
    local ok, parsed = pcall(cjson.decode, raw_json)
    if not ok or not parsed or not parsed.modem then return nil end
    
    local m = parsed.modem
    local g3pp = m["3gpp"] or {}
    local generic = m.generic or {}
    local sig_qual = m["signal-quality"] or {}
    
    local raw_mode = generic["access-technologies"] and generic["access-technologies"][1] or "-"
    local mode_upper = raw_mode:upper()
    
    local bands = generic["current-bands"] or {}
    local band_str = get_bands_string(bands)
    local final_mode = mode_upper
    
    if band_str ~= "" and #bands <= 5 then
        final_mode = mode_upper .. " | " .. band_str
    end
    
    local result = {
        operator_name = g3pp["operator-name"] or "-",
        operator_mcc = g3pp["operator-code"] and string.sub(g3pp["operator-code"], 1, 3) or "-",
        operator_mnc = g3pp["operator-code"] and string.sub(g3pp["operator-code"], 4) or "-",
        simulation = "false", 
        mode = final_mode, 
        signal = sig_qual.value and tostring(sig_qual.value) or "0",
        imei = g3pp.imei or "-",
        modem = generic.model or "-",
        model = generic.model or "-",
        firmware = generic.revision or "-",
        manufacturer = generic.manufacturer or "-",
        own_number = generic["own-numbers"] and generic["own-numbers"][1] or "-",
        mtemp = "-", 
        rsrp = "-", rsrq = "-", sinr = "-", rssi = "-",
        conn_time = "-", rx = "0", tx = "0", csq = "0", registration = "1", cell_id = "-", ping = "-"
    }
    return result
end

function parse_mmcli_signal(raw)
    if not raw or raw == "" then return {} end
    local status, data = pcall(cjson.decode, raw)
    if not status or not data or not data.modem or not data.modem.signal then return {} end
    local s = data.modem.signal
    local res = {}
    if s["5g"] and s["5g"].rsrp and s["5g"].rsrp ~= "--" then
         res.rsrp = s["5g"].rsrp; res.rsrq = s["5g"].rsrq; res.sinr = s["5g"].snr
    elseif s.lte and s.lte.rsrp and s.lte.rsrp ~= "--" then
         res.rsrp = s.lte.rsrp; res.rsrq = s.lte.rsrq; res.sinr = s.lte.snr; res.rssi = s.lte.rssi
    end
    return res
end

function calculate_signal_strength(rsrp)
    if not rsrp or rsrp == "-" then return 0 end
    local r = tonumber(rsrp)
    if not r then return 0 end
    if r >= -80 then return 100 end
    if r <= -120 then return 0 end
    local percent = (r + 120) * (100 / 40)
    return math.floor(percent)
end

function main()
    -- Restore LED Config
    local function restore_leds() 
        local f = io.open("/etc/vwrt_led.json", "r")
        if f then
            local content = f:read("*all")
            f:close()
            local config = cjson.decode(content)
            if config then
                for name, settings in pairs(config) do
                    local led_path = "/sys/class/leds/" .. name
                    if settings.trigger then
                        os.execute("echo '" .. settings.trigger .. "' > " .. led_path .. "/trigger")
                    end
                    if settings.brightness then
                        os.execute("echo '" .. tostring(settings.brightness) .. "' > " .. led_path .. "/brightness")
                    end
                end
            end
        end
    end
    pcall(restore_leds)

    exec("mmcli -m 0 --signal-setup=1")

    local loop_count = 0
    while true do
        -- Auto Free RAM every ~5 minutes (150 * 2s = 300s)
        loop_count = loop_count + 1
        if loop_count >= 150 then
            os.execute("sync && echo 3 > /proc/sys/vm/drop_caches")
            loop_count = 0
        end

        local status, err = pcall(function()
            local raw_modem = exec("mmcli -m 0 -J")
            local raw_signal = exec("mmcli -m 0 --signal-get -J")
            
            local data_modem = parse_mmcli_json(raw_modem)
            local signal_data = parse_mmcli_signal(raw_signal)
            
            if not data_modem then
                data_modem = {
                    operator_name="No Device", mode="No Device", signal="0", manufacturer="-", model="-"
                }
            end
            
            if data_modem.mode ~= "No Device" then
                -- 1. Merge basic signal
                if signal_data.rsrp then data_modem.rsrp = signal_data.rsrp end
                if signal_data.rsrq then data_modem.rsrq = signal_data.rsrq end
                if signal_data.sinr then data_modem.sinr = signal_data.sinr end
                if signal_data.rssi then data_modem.rssi = signal_data.rssi end

                -- 2. DEVICE SPECIFIC LOGIC
                local is_sierra = (data_modem.manufacturer and data_modem.manufacturer:lower():find("sierra")) or 
                                  (data_modem.model and (data_modem.model:find("EM9191") or data_modem.model:find("EM7455")))
                
                local is_dell = (data_modem.model and data_modem.model:find("DW5821e")) or
                                (data_modem.manufacturer and data_modem.manufacturer:lower():find("dell"))

                if is_sierra then
                    local raw_at = exec("mmcli -m 0 --command='AT!GSTATUS?' 2>/dev/null")
                    if (not raw_at or raw_at == "") then
                         local f = io.open("/dev/ttyUSB0", "r")
                         if f then f:close(); raw_at = exec_at_tty("/dev/ttyUSB0", "AT!GSTATUS?"); end
                    end
                    local at_data = parse_at_gstatus(raw_at)
                    if at_data.mtemp then data_modem.mtemp = at_data.mtemp end
                    if at_data.rsrp then data_modem.rsrp = at_data.rsrp end
                    if at_data.rsrq then data_modem.rsrq = at_data.rsrq end
                    if at_data.sinr then data_modem.sinr = at_data.sinr end
                    if at_data.rssi then data_modem.rssi = at_data.rssi end
                    if at_data.active_band then data_modem.mode = at_data.active_mode .. " | " .. at_data.active_band end

                elseif is_dell then
                    -- === DELL DW5821e LOGIC ===
                    -- Auto-detect AT port from mmcli (fallback to ttyUSB1)
                    local at_port = get_at_port_from_json(raw_modem) or "/dev/ttyUSB1"
                    
                    -- 1. Temp
                    local raw_temp = exec_at_tty(at_port, "AT+TEMP")
                    local temp_val = parse_at_dw5821e_temp(raw_temp)
                    if temp_val then data_modem.mtemp = temp_val end
                    
                    -- 2. CA / Band Info
                    local raw_ca = exec_at_tty(at_port, "AT^CA_INFO?")
                    local ca_data = parse_at_dw5821e_cainfo(raw_ca)
                    
                    if ca_data.active_band then
                         local mode_prefix = ca_data.active_mode or data_modem.mode
                         data_modem.mode = mode_prefix .. " | " .. ca_data.active_band
                    end
                end

                -- 3. Fallback Signal
                if (data_modem.signal == "0" or data_modem.signal == "-") and data_modem.rsrp ~= "-" then
                    data_modem.signal = tostring(calculate_signal_strength(data_modem.rsrp))
                end

                -- 4. Ping
                local ping_cmd = "ping -c 1 -W 1 -I wwan0 8.8.8.8 2>/dev/null | grep 'time=' | awk -F'time=' '{print $2}' | awk '{print $1}'"
                local p = io.popen(ping_cmd)
                if p then
                    local p_val = p:read("*a"); p:close()
                    if p_val and p_val ~= "" then data_modem.ping = p_val:gsub("\n", "") end
                end
                
                -- 5. Data Usage
                local net_stats = get_net_stats("wwan0")
                data_modem.rx = net_stats.rx
                data_modem.tx = net_stats.tx

                local json_str = cjson.encode(data_modem)
                write_file(TEMP_FILE, json_str)
                os.rename(TEMP_FILE, CACHE_FILE)
            end
        end)
        
        local check_f = io.open(CACHE_FILE, "r")
        if check_f then
            local c = check_f:read("*all"); check_f:close()
            if c and (string.find(c, '"signal":"0"') or string.find(c, '"rsrp":"-"')) then
                 exec("mmcli -m 0 --signal-setup=1")
            end
        end
        exec("sleep 2")
    end
end

main()