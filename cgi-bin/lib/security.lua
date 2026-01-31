-- Security utilities for Lua backend
local M = {}

-- Escape shell arguments to prevent command injection
function M.escape_shell_arg(str)
    if not str or str == "" then return "''" end
    -- Remove any dangerous characters and escape single quotes
    str = tostring(str)
    str = str:gsub("[;&|`$(){}\\[\\]<>]", "")  -- Remove shell metacharacters
    str = str:gsub("'", "'\\''")  -- Escape single quotes properly
    return "'" .. str .. "'"
end

-- Validate phone number (international format)
function M.is_valid_phone(phone)
    if not phone or type(phone) ~= "string" then return false end
    -- Allow only: digits, +, spaces, hyphens, parentheses
    if not phone:match("^[+0-9%s%-%(%)]+$") then return false end
    -- Must contain at least 3 digits (for short codes like 888)
    local digits = phone:gsub("[^0-9]", "")
    return #digits >= 3 and #digits <= 15
end

-- Validate numeric ID (for modem/SMS index)
function M.is_valid_id(id)
    if not id then return false end
    id = tostring(id)
    return id:match("^%d+$") ~= nil
end

-- Sanitize SMS text (remove control characters but allow Unicode)
function M.sanitize_sms_text(text)
    if not text or type(text) ~= "string" then return "" end
    -- Remove ASCII control characters (except newline, tab)
    text = text:gsub("[\001-\008\011-\031\127]", "")
    -- Limit length
    if #text > 1600 then
        text = text:sub(1, 1600)
    end
    return text
end

-- Validate URL format
function M.is_valid_url(url)
    if not url or type(url) ~= "string" then return false end
    -- Basic URL validation
    return url:match("^https?://[%w%.%-]+%.[%w%.%-/]*$") ~= nil
end

return M
