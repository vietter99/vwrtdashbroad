-- Rate Limiting Module for VWRT Dashboard
-- Giới hạn số lần request để chống brute-force và spam

local M = {}

-- Storage file for rate limit data
local RATE_LIMIT_FILE = "/tmp/vwrt_rate_limits.json"
local json = require "luci.jsonc"

-- Load rate limit data from file
local function load_data()
    local f = io.open(RATE_LIMIT_FILE, "r")
    if not f then
        return {}
    end
    
    local content = f:read("*a")
    f:close()
    
    if not content or content == "" then
        return {}
    end
    
    local data = json.parse(content)
    return data or {}
end

-- Save rate limit data to file
local function save_data(data)
    local f = io.open(RATE_LIMIT_FILE, "w")
    if f then
        f:write(json.stringify(data))
        f:close()
    end
end

-- Clean expired entries
local function clean_expired(data, max_age)
    local now = os.time()
    local cleaned = {}
    
    for key, entry in pairs(data) do
        if entry.timestamp and (now - entry.timestamp) < max_age then
            cleaned[key] = entry
        end
    end
    
    return cleaned
end

-- Check if action is rate limited
-- Returns: allowed (boolean), remaining (number), reset_time (number)
function M.check_limit(identifier, action, max_attempts, window_seconds)
    local data = load_data()
    local key = action .. ":" .. identifier
    local now = os.time()
    
    -- Clean old entries (older than 1 hour)
    data = clean_expired(data, 3600)
    
    local entry = data[key]
    
    if not entry then
        -- First attempt
        data[key] = {
            count = 1,
            timestamp = now,
            reset_at = now + window_seconds
        }
        save_data(data)
        return true, max_attempts - 1, now + window_seconds
    end
    
    -- Check if window has expired
    if now >= entry.reset_at then
        -- Reset counter
        data[key] = {
            count = 1,
            timestamp = now,
            reset_at = now + window_seconds
        }
        save_data(data)
        return true, max_attempts - 1, now + window_seconds
    end
    
    -- Within window
    if entry.count >= max_attempts then
        -- Rate limited
        return false, 0, entry.reset_at
    end
    
    -- Increment counter
    entry.count = entry.count + 1
    entry.timestamp = now
    data[key] = entry
    save_data(data)
    
    return true, max_attempts - entry.count, entry.reset_at
end

-- Helper: Check login rate limit
function M.check_login(ip)
    -- 5 attempts per 5 minutes
    return M.check_limit(ip, "login", 5, 300)
end

-- Helper: Check SMS send rate limit
function M.check_sms(ip)
    -- 5 SMS per minute
    return M.check_limit(ip, "sms", 5, 60)
end

-- Helper: Check general API rate limit
function M.check_api(ip)
    -- 60 requests per minute
    return M.check_limit(ip, "api", 60, 60)
end

-- Get client IP from environment
function M.get_client_ip()
    -- Try X-Forwarded-For first (if behind proxy)
    local forwarded = os.getenv("HTTP_X_FORWARDED_FOR")
    if forwarded then
        -- Take first IP
        return forwarded:match("([^,]+)")
    end
    
    -- Fallback to REMOTE_ADDR
    return os.getenv("REMOTE_ADDR") or "unknown"
end

return M
