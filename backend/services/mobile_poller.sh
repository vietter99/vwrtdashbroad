#!/usr/bin/lua

local cjson = require "cjson"
local CACHE_FILE = "/tmp/vwrt_mobile.json"
local TEMP_FILE = "/tmp/vwrt_mobile_temp.json"

function exec(cmd)
    local f = io.popen(cmd)
    if not f then return nil end
    local content = f:read("*all")
    f:close()
    return content
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
    
    -- Temp
    local temp = output:match("Temperature:%s*(%d+)")
    if temp then res.mtemp = temp end
    
    -- Band (LTE)
    local lte_band = output:match("LTE band:%s*(%S+)")
    -- Band (5G)
    local nr_band = output:match("NR5G band:%s*(%S+)")
    
    if nr_band and nr_band ~= "---" then
        res.active_band = nr_band
        res.active_mode = "5G"
    elseif lte_band and lte_band ~= "---" then
        res.active_band = lte_band
        res.active_mode = "LTE"
    end
    
    -- Signal Stats
    local rsrp = output:match("Rx0 RSRP:%s*([%-%d]+)")
    if rsrp then res.rsrp = rsrp end
    
    local rsrq = output:match("RSRQ %(dB%):%s*([%-%d%.]+)")
    if rsrq then res.rsrq = rsrq end
    
    local sinr = output:match("SINR %(dB%):%s*([%-%d%.]+)")
    if sinr then res.sinr = sinr end

    -- RSSI (PCC Rx0 RSSI)
    local rssi = output:match("Rx0 RSSI:%s*([%-%d]+)")
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
        local raw_modem = exec("mmcli -m 0 -J")
        local raw_at = exec("mmcli -m 0 --command='AT!GSTATUS?'") -- Sierra Specific
        
        local data_modem = parse_mmcli_json(raw_modem)
        local at_data = parse_at_gstatus(raw_at)
        
        if data_modem then
            -- Merge AT Data
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
        
        exec("sleep 2") 
    end
end

main()