--[[
    VWRT Core Helper Library (Pure Lua)
    Commercial Grade - Optimized for Performance
    Version: 2.2.0 (High-Speed CLI Bridge)
]]--

local VWRTH = {}

-- === PURE LUA JSON ENCODER ===
function VWRTH.json_encode(val)
    if type(val) == "table" then
        local is_array = true
        local n = 0
        for k, v in pairs(val) do
            n = n + 1
            if type(k) ~= "number" or k ~= n then is_array = false break end
        end
        
        local res = {}
        if is_array then
            for _, v in ipairs(val) do table.insert(res, VWRTH.json_encode(v)) end
            return "[" .. table.concat(res, ",") .. "]"
        else
            for k, v in pairs(val) do 
                table.insert(res, string.format("%q:%s", tostring(k), VWRTH.json_encode(v))) 
            end
            return "{" .. table.concat(res, ",") .. "}"
        end
    elseif type(val) == "string" then 
        local escaped = val:gsub("\\", "\\\\"):gsub('"', '\\"'):gsub("\n", "\\n"):gsub("\r", "\\r"):gsub("\t", "\\t")
        return '"' .. escaped .. '"'
    elseif type(val) == "number" or type(val) == "boolean" then return tostring(val)
    else return "null" end
end

-- === NATIVE UCI WRAPPER (OPTIMIZED - ONE CALL ONLY) ===
function VWRTH.uci_get_all(config, section)
    local cmd = "uci show " .. config
    if section then cmd = cmd .. "." .. section end
    local f = io.popen(cmd .. " 2>/dev/null")
    if not f then return {} end
    
    local data = {}
    local types = {} -- Cache section types to avoid 'uci get'
    
    for line in f:lines() do
        -- Pattern for uci show: config.section=type OR config.section.option=value
        local sec, type_or_opt, val = line:match(config .. "%.([^%.=]+)[%.=]([^=]+)=(.*)")
        if not sec then
             -- Handle type definition lines: shadowsocksr.cfg01244a=global
             sec, val = line:match(config .. "%.([^%.=]+)=(.*)")
             if sec and val then
                 types[sec] = val
             end
        else
            local opt = type_or_opt
            val = val:gsub("^'?(.-)'?$", "%1")
            
            if not section or (section and sec == section) then
                if not data[sec] then data[sec] = {} end
                if data[sec][opt] then
                    if type(data[sec][opt]) ~= "table" then data[sec][opt] = {data[sec][opt]} end
                    table.insert(data[sec][opt], val)
                else
                    data[sec][opt] = val
                end
            end
        end
    end
    f:close()
    
    -- Attach types to the data for foreach usage
    for sec, t in pairs(types) do
        if data[sec] then data[sec][".type"] = t end
    end
    
    if section then return data[section] or {} end
    return data, types
end

function VWRTH.uci_foreach(config, type_name, callback)
    local all, types = VWRTH.uci_get_all(config)
    
    -- Sorting by ID to maintain original order if possible
    local keys = {}
    for k in pairs(all) do table.insert(keys, k) end
    table.sort(keys)

    for _, sector_id in ipairs(keys) do
        local settings = all[sector_id]
        if types[sector_id] == type_name then
            settings[".name"] = sector_id
            callback(settings)
        end
    end
end

function VWRTH.uci_set(config, section, option, value)
    local val_str = type(value) == "table" and table.concat(value, " ") or tostring(value or "")
    os.execute(string.format("uci set %s.%s.%s='%s'", config, section, option, val_str))
end

function VWRTH.uci_commit(config)
    return os.execute("uci commit " .. config) == 0
end

-- === SYSTEM HELPERS ===
function VWRTH.get_params()
    local params = {}
    local query_string = os.getenv("QUERY_STRING") or ""
    
    -- Read POST data if available
    local content_length = tonumber(os.getenv("CONTENT_LENGTH") or 0)
    if content_length > 0 then
        local post_data = io.read(content_length) or ""
        if query_string ~= "" then query_string = query_string .. "&" .. post_data
        else query_string = post_data end
    end

    for k, v in query_string:gmatch("([^&=]+)=([^&]*)") do
        v = v:gsub("+", " "):gsub("%%(%x%x)", function(h) return string.char(tonumber(h, 16)) end)
        params[k] = v
    end
    return params
end

function VWRTH.exec(cmd)
    local f = io.popen(cmd)
    if not f then return "" end
    local res = f:read("*a")
    f:close()
    if res then
        res = res:gsub("\n$", "")
    end
    return res
end

return VWRTH
