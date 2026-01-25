#!/usr/bin/lua

local cjson = require "cjson"
local CACHE_FILE = "/tmp/vwrt_mobile.json"
local TEMP_FILE = "/tmp/vwrt_mobile_temp.json"

function log(msg)
    -- Disabled logging to prevent disk filling
    -- local f = io.open("/tmp/poller_debug.log", "a")
    -- if f then
    --     f:write(os.date() .. ": " .. msg .. "\n")
    --     f:close()
    -- end
end

function exec(cmd)
    local f = io.popen(cmd)
    if not f then return nil end
    local content = f:read("*all")
    f:close()
    return content
end


function exec_at_tty(device, cmd)
    local command = "/www/vwrt/services/at_cmd.sh " .. device .. " '" .. cmd .. "'"
    log("Executing TTY: " .. command)
    local out = exec(command)
    log("TTY Result: " .. (out or "NIL"))
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


function get_bands_string(bands_list)
    if not bands_list or #bands_list == 0 then return "" end
    local b_str = ""
    for _, b in ipairs(bands_list) do
        local clean = b:gsub("eutran%-", "B"):gsub("ngran%-", "n"):gsub("utran%-", "B")
        if b_str == "" then b_str = clean else b_str = b_str .. ", " .. clean end
    end
    return b_str
end

function parse_at_gstatus(output)
    if not output then return {} end
    local res = {}
    
    log("Parsing AT Output length: " .. #output)

    -- Temp
    local temp = output:match("Temperature:%s*(%d+)")
    if temp then res.mtemp = temp; log("Parsed Temp: " .. temp) end
    
    -- LTE Band & CA (Carrier Aggregation)
    local lte_pcc = output:match("LTE band:.-(%S+)")
    local active_bands = {}
    
    if lte_pcc then table.insert(active_bands, lte_pcc) end
    
    -- Parse SCC (SCC1 to SCC4 typically)
    for i = 1, 4 do
        local state = output:match("LTE SCC" .. i .. " state:%s*(%S+)")
        local band = output:match("LTE SCC" .. i .. " band:%s*(%S+)")
        if state and state ~= "INACTIVE" and band then
            table.insert(active_bands, band)
        end
    end
    
    -- NR5G Band
    local nr_band = output:match("NR5G band:%s*(%S+)")
    if nr_band and nr_band ~= "---" then
        if #active_bands > 0 then
            res.active_mode = "5G NSA" -- LTE + 5G
        else
            res.active_mode = "5G SA"
        end
        table.insert(active_bands, nr_band)
    elseif #active_bands > 1 then
        res.active_mode = "LTE-A" -- CA Active
    elseif #active_bands == 1 then
        -- Default mode is already parsed from System mode (e.g. LTE), keep it or set explicity
        -- res.active_mode = "LTE" 
    end
    
    -- Join bands with " + "
    if #active_bands > 0 then
        res.active_band = table.concat(active_bands, " + ")
        log("Parsed Active Bands: " .. res.active_band)
    end

    local sys_mode = output:match("System mode:.-(%S+)")
    -- Only override active_mode if not correctly detected as 5G/LTE-A
    if sys_mode and not res.active_mode then res.active_mode = sys_mode end

    -- Signal Stats
    local rsrp = output:match("Rx0 RSRP:.-([%-%d]+)")
    if rsrp then res.rsrp = rsrp; log("Parsed RSRP: " .. rsrp) else log("Failed to parse RSRP") end
    
    local rsrq = output:match("RSRQ %(dB%):.-([%-%d%.]+)")
    if rsrq then res.rsrq = rsrq end
    
    -- 5G Signal Stats (Prioritize if available)
    local nr_rsrp = output:match("NR5G RSRP %(dBm%):%s*([%-%d]+)")
    local nr_sinr = output:match("NR5G SINR %(dB%):%s*([%-%d%.]+)")
    local nr_rsrq = output:match("NR5G RSRQ %(dB%):%s*([%-%d%.]+)")
    
    if nr_rsrp and nr_rsrp ~= "---" then
        res.rsrp = nr_rsrp
        res.sinr = nr_sinr
        res.rsrq = nr_rsrq
        -- Use 5G mode explicitly if we have 5G signal
        if not res.active_mode or not res.active_mode:find("5G") then
             res.active_mode = "5G NSA"
        end
    else
        -- LTE SINR
        local sinr = output:match("SINR %(dB%):.-([%-%d%.]+)")
        if sinr then res.sinr = sinr end
    end

    -- RSSI (PCC Rx0 RSSI)
    local rssi = output:match("Rx0 RSSI:.-([%-%d]+)")
    if rssi then res.rssi = rssi end
    
    return res
end

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
    
    -- Fallback Band logic if AT command fails
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
        
        mode = final_mode, -- Can be overwritten by AT parser
        signal = sig_qual.value and tostring(sig_qual.value) or "0",
        
        imei = g3pp.imei or "-",
        modem = generic.model or "-", -- Legacy key for Model Name
        model = generic.model or "-", -- Keep for consistency
        firmware = generic.revision or "-",
        manufacturer = generic.manufacturer or "-",
        own_number = generic["own-numbers"] and generic["own-numbers"][1] or "-",
        mtemp = "-", 
        
        rsrp = "-",
        rsrq = "-",
        sinr = "-",
        rssi = "-",
        
        conn_time = "-",
        rx = "0",
        tx = "0",
        csq = "0",
        registration = "1",
        cell_id = "-"
    }
    
    return result
end

function parse_mmcli_signal(raw)
    if not raw or raw == "" then return {} end
    local status, data = pcall(cjson.decode, raw)
    if not status or not data or not data.modem or not data.modem.signal then return {} end
    
    local s = data.modem.signal
    local res = {}
    
    -- Prioritize 5G -> LTE
    if s["5g"] and s["5g"].rsrp and s["5g"].rsrp ~= "--" then
         res.rsrp = s["5g"].rsrp
         res.rsrq = s["5g"].rsrq
         res.sinr = s["5g"].snr
    elseif s.lte and s.lte.rsrp and s.lte.rsrp ~= "--" then
         res.rsrp = s.lte.rsrp
         res.rsrq = s.lte.rsrq
         res.sinr = s.lte.snr 
         res.rssi = s.lte.rssi
    end
    
    return res
end

function calculate_signal_strength(rsrp)
    if not rsrp or rsrp == "-" then return 0 end
    local r = tonumber(rsrp)
    if not r then return 0 end
    
    -- RSRP range: -120 (0%) to -80 (100%)
    if r >= -80 then return 100 end
    if r <= -120 then return 0 end
    
    local percent = (r + 120) * (100 / 40)
    return math.floor(percent)
end

function main()
    -- Enable signal polling
    exec("mmcli -m 0 --signal-setup=1")

    while true do
        local status, err = pcall(function()
            local raw_modem = exec("mmcli -m 0 -J")
            local raw_signal = exec("mmcli -m 0 --signal-get -J")
            
            -- Try mmcli AT first
            local raw_at = exec("mmcli -m 0 --command='AT!GSTATUS?' 2>/dev/null")
            
            -- Fallback to direct TTY if mmcli AT fails or is empty, and TTY exists
            -- Re-enabled: MM refuses to run AT command in Connected state, so we MUST use direct TTY.
            if (not raw_at or raw_at == "") then
                 local f = io.open("/dev/ttyUSB0", "r")
                 if f then
                     f:close()
                     -- log("Attempting Fallback TTY")
                     raw_at = exec_at_tty("/dev/ttyUSB0", "AT!GSTATUS?")
                 end
            end

            local data_modem = parse_mmcli_json(raw_modem)
            local signal_data = parse_mmcli_signal(raw_signal)
            local at_data = parse_at_gstatus(raw_at)
            
            if not data_modem then
                data_modem = {
                    operator_name = "No Device",
                    operator_mcc = "-",
                    operator_mnc = "-",
                    simulation = "false",
                    mode = "No Device",
                    signal = "0",
                    imei = "-",
                    modem = "No Device",
                    model = "-",
                    firmware = "-",
                    manufacturer = "-",
                    own_number = "-",
                    mtemp = "-",
                    rsrp = "-",
                    rsrq = "-",
                    sinr = "-",
                    rssi = "-",
                    conn_time = "-",
                    rx = "0",
                    tx = "0",
                    csq = "0",
                    registration = "0",
                    cell_id = "-"
                }
            end
            
            if data_modem then
                -- Merge signal data from mmcli --signal-get
                if signal_data.rsrp then data_modem.rsrp = signal_data.rsrp end
                if signal_data.rsrq then data_modem.rsrq = signal_data.rsrq end
                if signal_data.sinr then data_modem.sinr = signal_data.sinr end
                if signal_data.rssi then data_modem.rssi = signal_data.rssi end

                -- Merge AT Data (Overwrite mmcli if available, as AT is more detailed)
                if at_data.mtemp then data_modem.mtemp = at_data.mtemp end
                if at_data.rsrp then data_modem.rsrp = at_data.rsrp end
                if at_data.rsrq then data_modem.rsrq = at_data.rsrq end
                if at_data.sinr then data_modem.sinr = at_data.sinr end
                if at_data.rssi then data_modem.rssi = at_data.rssi end
                
                -- Override Mode with Active Band from AT (More accurate)
                if at_data.active_band then
                    data_modem.mode = at_data.active_mode .. " | " .. at_data.active_band
                end
                
                -- Fallback Signal Calculation from RSRP if mmcli reports 0
                if (data_modem.signal == "0" or data_modem.signal == "-") and data_modem.rsrp ~= "-" then
                    data_modem.signal = tostring(calculate_signal_strength(data_modem.rsrp))
                end
                
                local json_str = cjson.encode(data_modem)
                write_file(TEMP_FILE, json_str)
                os.rename(TEMP_FILE, CACHE_FILE)
            end
        end)

        if not status then
            log("Error: " .. tostring(err))
        end
        
        -- Auto-retry signal setup if missing
        local check_f = io.open(CACHE_FILE, "r")
        if check_f then
            local c = check_f:read("*all")
            check_f:close()
            if c and (string.find(c, '"signal":"0"') or string.find(c, '"rsrp":"-"')) then
                 exec("mmcli -m 0 --signal-setup=1")
            end
        end
        
        exec("sleep 2")
    end
end

main()