-- CSRF Protection Module for VWRT Dashboard
-- Chống tấn công Cross-Site Request Forgery

local M = {}

-- Generate random token (UUID-like)
function M.generate_token()
    local random = io.open("/dev/urandom", "rb")
    if not random then
        -- Fallback: use time-based token
        return string.format("%s-%s", os.time(), math.random(100000, 999999))
    end
    
    local bytes = random:read(16)
    random:close()
    
    if not bytes or #bytes ~= 16 then
        return string.format("%s-%s", os.time(), math.random(100000, 999999))
    end
    
    -- Convert to hex
    local hex = {}
    for i = 1, #bytes do
        hex[i] = string.format("%02x", string.byte(bytes, i))
    end
    
    return table.concat(hex)
end

-- Store CSRF token in session file
function M.save_token(token)
    local session_file = "/tmp/vwrt_csrf_token"
    local f = io.open(session_file, "w")
    if f then
        f:write(token .. "\n" .. os.time())
        f:close()
        return true
    end
    return false
end

-- Get CSRF token from session
function M.get_token()
    local session_file = "/tmp/vwrt_csrf_token"
    local f = io.open(session_file, "r")
    if not f then
        -- Generate new token if not exists
        local token = M.generate_token()
        M.save_token(token)
        return token
    end
    
    local token = f:read("*l")
    local timestamp = tonumber(f:read("*l") or "0")
    f:close()
    
    -- Token expires after 24 hours
    if os.time() - timestamp > 86400 then
        local new_token = M.generate_token()
        M.save_token(new_token)
        return new_token
    end
    
    return token
end

-- Validate CSRF token from request
function M.validate_token(provided_token)
    if not provided_token or provided_token == "" then
        return false
    end
    
    local stored_token = M.get_token()
    return provided_token == stored_token
end

-- Get token from HTTP headers or POST body
function M.get_token_from_request()
    -- Try X-CSRF-Token header first (CGI converts to HTTP_X_CSRF_TOKEN)
    local header_token = os.getenv("HTTP_X_CSRF_TOKEN")
    if header_token then
        return header_token
    end
    
    -- Fallback: Read from POST body (for uhttpd which strips custom headers)
    -- This requires the caller to pass the token explicitly
    return nil
end

-- Get token from parsed JSON data (primary method for uhttpd)
function M.get_token_from_body(json_data)
    if json_data and json_data.csrf_token then
        return json_data.csrf_token
    end
    return nil
end

return M
