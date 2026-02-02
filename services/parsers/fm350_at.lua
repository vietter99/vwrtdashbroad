local M = {}

-- === HELPER: Parse CSV Line (Handles empty fields correctly) ===
local function parse_csv(line)
    if not line then return {} end
    local res = {}
    local pattern = "([^,]*),"
    local last_pos = 1
    
    for part, pos in line:gmatch("([^,]*),()") do
        table.insert(res, part:match("^%s*(.-)%s*$") or "") -- Trim
        last_pos = pos
    end
    -- Catch last part after last comma
    local last_part = line:sub(last_pos):match("^%s*(.-)%s*$") or ""
    table.insert(res, last_part)
    
    return res
end

-- === HELPER: EARFCN to Band (Standard LTE/5G) ===
local function get_band_from_earfcn(earfcn, rat)
    local e = tonumber(earfcn)
    if not e then return nil end
    
    if rat == "LTE" or rat == "4" or rat == "LTE-A" then
        if e >= 0 and e <= 599 then return "B1"
        elseif e >= 1200 and e <= 1949 then return "B3"
        elseif e >= 2400 and e <= 2649 then return "B5"
        elseif e >= 2750 and e <= 3449 then return "B7"
        elseif e >= 3450 and e <= 3799 then return "B8"
        elseif e >= 3800 and e <= 4149 then return "B20"
        elseif e >= 6150 and e <= 6599 then return "B28"
        elseif e >= 9210 and e <= 9659 then return "B28"
        elseif e >= 27650 and e <= 27759 then return "B66"
        elseif e >= 37750 and e <= 38249 then return "B38"
        elseif e >= 38650 and e <= 39649 then return "B40"
        elseif e >= 40210 and e <= 41589 then return "B41"
        -- Auto-detect 5G if ARFCN is huge (typical NR ARFCN > 100000)
        -- even if RAT was passed as LTE (common in NSA parsing)
        elseif e > 100000 then 
             return get_band_from_earfcn(earfcn, "5G")
        end
    elseif rat == "5G" or rat == "9" or rat == "5GS" then
        if e >= 422000 and e <= 434000 then return "n1"
        elseif e >= 361000 and e <= 376000 then return "n3"
        elseif e >= 151600 and e <= 160600 then return "n28"
        elseif e >= 185000 and e <= 192000 then return "n8"
        elseif e >= 620000 and e <= 680000 then return "n78" -- Extended for safety
        elseif e >= 600000 and e <= 620000 then return "n77"
        elseif e >= 499200 and e <= 537999 then return "n41"
        end
    end
    return nil
end

-- === HELPER: Band Mapping ===
local function map_band(val, earfcn, rat)
    local v = tonumber(val)
    if not v or v == 0 then 
        return get_band_from_earfcn(earfcn, rat) or val
    end
    
    if v < 200 and v > 100 then
        return "B" .. (v - 100)
    elseif v >= 5000 then
        local s = tostring(v)
        if s:sub(1,2) == "50" then
            return "n" .. s:sub(3)
        end
    end
    
    return get_band_from_earfcn(earfcn, rat) or ("Band " .. val)
end

-- === PARSE AT+GTSENRDTEMP=1 ===
function M.parse_temp(output)
    if not output then return nil end
    local temp = output:match("%+GTSENRDTEMP:%s*%d+,%s*(%d+)")
    if temp then
        local t = tonumber(temp)
        if t then return string.format("%.1f &deg;C", t / 1000) end
    end
    return nil
end

-- === UNIFIED SIGNAL PARSER (Handles GTCCINFO and GTCAINFO) ===
function M.parse_all_signal(output)
    if not output then return {} end
    local res = { active_bands = {} }
    
    -- Iterate through all lines
    for line in output:gmatch("[^\r\n]+") do
        local trimmed = line:match("^%s*(.-)%s*$")
        if trimmed and trimmed ~= "" and trimmed ~= "OK" then

            -- 1. GTCCINFO Data (Starts with a number and comma)
            if trimmed:match("^%d+,%d+,") then
                local parts = parse_csv(trimmed)
                if #parts >= 7 then
                    local rat = parts[2]
                    local earfcn = parts[7]
                    local pci = parts[8]
                    local band_idx = parts[9]
                    
                    local current_mode = (rat == "9") and "5G" or "LTE"
                    local current_band = map_band(band_idx, earfcn, rat)

                    -- Prioritize 5G for primary band/metrics
                    if not res.active_mode or current_mode == "5G" or (res.active_mode ~= "5G" and current_mode == "5G") then
                        res.active_mode = current_mode
                        res.active_band = current_band
                        res.pci = pci
                        res.earfcn = earfcn

                        if #parts >= 14 then
                            local sinr_raw = tonumber(parts[11])
                            local rsrp_raw = tonumber(parts[13])
                            local rsrq_raw = tonumber(parts[14])
                            
                            if sinr_raw and sinr_raw ~= 255 then
                                if rat == "9" then res.sinr = string.format("%.1f", (sinr_raw - 45) / 2 - 1)
                                else res.sinr = string.format("%.1f", sinr_raw / 2) end
                            end
                            
                            if rsrp_raw and rsrp_raw ~= 255 then
                                if rat == "9" then res.rsrp = tostring(rsrp_raw - 157)
                                else res.rsrp = tostring(rsrp_raw - 141) end
                            end
                            
                            if rsrq_raw and rsrq_raw ~= 255 then
                                if rat == "9" then res.rsrq = string.format("%.1f", (rsrq_raw - 87) / 2)
                                else res.rsrq = string.format("%.1f", (rsrq_raw - 34) / 2 - 3) end
                            end
                        end
                    end
                end

            -- 2. GTCAINFO Data (PCC/SCC prefixes)
            elseif trimmed:match("^[PS]CC") then
                local type_cell, csv_part = trimmed:match("([PS]CC[^:]*):%s*([%d%,%-]+)")
                if type_cell and csv_part then
                    local parts = parse_csv(csv_part)
                    if #parts >= 3 then
                        local band_idx = parts[1]
                        local earfcn = parts[3]
                        
                        if type_cell:find("SCC") then
                            if #parts >= 5 then band_idx = parts[3]; earfcn = parts[5] end
                        end

                        local band_name = map_band(band_idx, earfcn, res.active_mode)
                        
                        if type_cell:find("PCC") then
                            -- If we already have a 5G band as active, and this is LTE, put it in SCC
                            if res.active_band and res.active_band:find("^n") and not band_name:find("^n") then
                                table.insert(res.active_bands, band_name)
                                res.active_mode = "5G-NSA"
                            -- If this is 5G, it wins
                            elseif band_name:find("^n") then
                                if res.active_band and not res.active_band:find("^n") then
                                    table.insert(res.active_bands, res.active_band)
                                end
                                res.active_band = band_name
                                res.active_mode = "5G-NSA"
                            else
                                res.active_band = band_name
                            end
                        else
                            -- Pure SCC
                            local exists = false
                            for _, b in ipairs(res.active_bands) do if b == band_name then exists = true; break end end
                            if not exists and band_name ~= res.active_band then
                                table.insert(res.active_bands, band_name)
                                if res.active_mode == "LTE" then res.active_mode = "LTE-A" end
                                if band_name:find("^n") then res.active_mode = "5G-NSA" end
                            end
                        end
                    end
                end
            end

        end
    end

    -- Format final mode string
    if res.active_mode and res.active_band then
        local mode_str = res.active_mode .. " | " .. res.active_band
        if #res.active_bands > 0 then
            mode_str = mode_str .. " + " .. table.concat(res.active_bands, " + ")
        end
        res.full_mode = mode_str
    end
    
    return res
end

-- === PARSE AT+CNUM ===
function M.parse_cnum(output)
    if not output then return nil end
    local num = output:match("%+CNUM:.-,\"(%d+)\"") or output:match("%+CNUM:.-,\"(%+%d+)\"")
    return num
end

return M
