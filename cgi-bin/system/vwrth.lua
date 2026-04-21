local nixio = require "nixio"

-- Smart Loading cho UCI
local uci_ok, uci_lib = pcall(require, "uci")
if not uci_ok then
    uci_ok, uci_lib = pcall(require, "luci.model.uci")
end

-- Smart Loading cho JSON
local json_ok, json_lib = pcall(require, "cjson")
if not json_ok then
    json_ok, json_lib = pcall(require, "luci.jsonc")
    if not json_ok then
        json_ok, json_lib = pcall(require, "luci.json")
    end
end

local M = {}

-- Chức năng URL Decode chuẩn
local function url_decode(s)
    if not s then return "" end
    s = s:gsub("+", " ")
    s = s:gsub("%%(%x%x)", function(h)
        return string.char(tonumber(h, 16))
    end)
    return s
end

function M.get_params()
    local params = {}
    
    -- 1. Đọc dữ liệu từ GET (Query String)
    local query_string = os.getenv("QUERY_STRING")
    if query_string and query_string ~= "" then
        for pair in query_string:gmatch("([^&]+)") do
            -- FIXED: ^([^=]+)=(.*)$ đảm bảo lấy toàn bộ giá trị sau dấu = đầu tiên
            local k, v = pair:match("^([^=]+)=(.*)$")
            if k then params[k] = url_decode(v or "") end
        end
    end

    -- 2. Đọc dữ liệu từ POST (CGI stdin)
    local method = os.getenv("REQUEST_METHOD")
    if method == "POST" then
        local len = tonumber(os.getenv("CONTENT_LENGTH") or 0)
        if len > 0 then
            local body = io.stdin:read(len)
            if body then
                for pair in body:gmatch("([^&]+)") do
                    -- FIXED: ^([^=]+)=(.*)$ đảm bảo lấy toàn bộ giá trị sau dấu = đầu tiên
                    local k, v = pair:match("^([^=]+)=(.*)$")
                    if k then params[k] = url_decode(v or "") end
                end
            end
        end
    end
    
    return params
end

function M.json_encode(data)
    if json_lib and json_lib.encode then
        return json_lib.encode(data)
    elseif json_lib and json_lib.stringify then
        return json_lib.stringify(data)
    end
    return "{}"
end

function M.exec(cmd)
    local f = io.popen(cmd)
    local s = f:read("*a")
    f:close()
    return s
end

function M.uci_get_all(config)
    if not uci_ok then return {} end
    local cursor = uci_lib.cursor()
    local data = cursor:get_all(config)
    return data or {}
end

function M.uci_foreach(config, section_type, callback)
    if not uci_ok then return end
    local cursor = uci_lib.cursor()
    cursor:foreach(config, section_type, callback)
end

function M.uci_set(config, section, option, value)
    if not uci_ok then return end
    local cursor = uci_lib.cursor()
    cursor:set(config, section, option, value)
end

function M.uci_commit(config)
    if not uci_ok then return end
    local cursor = uci_lib.cursor()
    cursor:commit(config)
end

return M
