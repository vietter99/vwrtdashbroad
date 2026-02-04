-- SMS Storage Library for VWRT
-- This library provides atomic and locked access to the SMS archive
local M = {}

local cjson = require "cjson"
local constants = require "lib.constants"

local ARCHIVE_PATH = constants.PATHS.SMS_ARCHIVE
local LOCK_DIR = "/tmp/sms_archive.lock"
local TMP_PATH = ARCHIVE_PATH .. ".tmp"

-- Helper to log to system log
local function log(msg)
    os.execute("logger -t VWRT_SMS_STORAGE '" .. msg:gsub("'", "") .. "'")
end

-- Atomic Lock using mkdir (standard for shell scripts and Lua on OpenWrt)
function M.lock(timeout)
    timeout = timeout or 5
    local start = os.time()
    while true do
        local ok = os.execute("mkdir " .. LOCK_DIR .. " 2>/dev/null")
        if ok == 0 or ok == true then
            return true
        end
        if os.time() - start >= timeout then
            log("Lock timeout, breaking stale lock")
            os.execute("rmdir " .. LOCK_DIR .. " 2>/dev/null")
            -- Try one last time after clearing
            if os.execute("mkdir " .. LOCK_DIR .. " 2>/dev/null") == 0 then
                return true
            end
            return false
        end
        os.execute("sleep 0.1")
    end
end

function M.unlock()
    os.execute("rmdir " .. LOCK_DIR .. " 2>/dev/null")
end

-- Load archive safely
function M.load()
    local f = io.open(ARCHIVE_PATH, "r")
    if not f then
        return { conversations = {}, synced_ids = {} }
    end
    local content = f:read("*all")
    f:close()
    
    if not content or content == "" then
        return { conversations = {}, synced_ids = {} }
    end
    
    local ok, archive = pcall(cjson.decode, content)
    if not ok or not archive then
        log("Error decoding archive, returning fresh structure")
        return { conversations = {}, synced_ids = {} }
    end
    
    if not archive.conversations then archive.conversations = {} end
    if not archive.synced_ids then archive.synced_ids = {} end
    
    return archive
end

-- Save archive atomically
function M.save(archive)
    local ok, content = pcall(cjson.encode, archive)
    if not ok then
        log("Error encoding archive for save")
        return false
    end
    
    local f = io.open(TMP_PATH, "w")
    if not f then
        log("Cannot open tmp file for writing: " .. TMP_PATH)
        return false
    end
    f:write(content)
    f:close()
    
    -- Atomic rename
    local move_ok = os.execute("mv " .. TMP_PATH .. " " .. ARCHIVE_PATH)
    return move_ok == 0 or move_ok == true
end

-- Protected update: lock -> load -> modify -> save -> unlock
function M.update(update_func)
    if not M.lock() then
        log("Failed to acquire lock for update")
        return false
    end
    
    local archive = M.load()
    local ok, result = pcall(update_func, archive)
    
    if not ok then
        log("Update function failed: " .. tostring(result))
        M.unlock()
        return false
    end
    
    local save_ok = M.save(archive)
    M.unlock()
    return save_ok, result
end

return M
