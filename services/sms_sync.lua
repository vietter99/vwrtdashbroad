#!/usr/bin/lua

-- SMS Sync Service (Version 2 - Using existing driver)
-- Auto-sync SMS from SIM to router storage
-- Supports: FM350 (AT) and mmcli (ModemManager)

local cjson = require "cjson"
package.path = "/www/vwrt/?.lua;/www/vwrt/cgi-bin/?.lua;" .. package.path

local constants = require "lib.constants"
local ARCHIVE_FILE = constants.PATHS.SMS_ARCHIVE

-- Helper functions
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
        return true
    end
    return false
end

function log(msg)
    os.execute("logger -t VWRT_SMS_SYNC '" .. msg .. "'")
end

-- Detect modem driver  
function get_driver()
    local handle = io.popen("uci show network | grep '.proto=.atc.'")
    if handle then
        local content = handle:read("*all")
        handle:close()
        if content and content ~= "" then
            return require "drivers.fm350"
        end
    end
    return require "drivers.mmcli"
end

-- Load/Save archive
function load_archive()
    local content = read_file(ARCHIVE_FILE)
    if not content or content == "" then
        return {
            settings = { max_messages = 50, auto_delete_days = 7 },
            conversations = {},
            synced_ids = {} -- Track synced messages
        }
    end
    
    local ok, archive = pcall(cjson.decode, content)
    if ok and archive then
        if not archive.settings then
            archive.settings = { max_messages = 50, auto_delete_days = 7 }
        end
        if not archive.conversations then
            archive.conversations = {}
        end
        if not archive.synced_ids then
            archive.synced_ids = {}
        end
        return archive
    end
    
    return {
        settings = { max_messages = 50, auto_delete_days = 7 },
        conversations = {},
        synced_ids = {}
    }
end

function save_archive(archive)
    os.execute("mkdir -p /overlay")
    local json = cjson.encode(archive)
    return write_file(ARCHIVE_FILE, json)
end

-- Add message to archive
function add_to_archive(archive, phone, direction, content, timestamp, msg_id)
    -- 1. Check if ID already synced (Basic check)
    if archive.synced_ids[msg_id] then
        return false 
    end
    
    -- 2. Deduplication for "SENT" messages
    if direction == "sent" and (not timestamp or timestamp == "" or timestamp == "--") then
         if archive.conversations[phone] then
             local messages = archive.conversations[phone].messages
             for i = #messages, math.max(1, #messages - 2), -1 do
                 local prev = messages[i]
                 if prev.direction == "sent" and prev.content == content then
                     log("Dedup: Found identical sent message for " .. phone .. ", marking as handled.")
                     archive.synced_ids[msg_id] = true -- Handle but skip insert
                     return true -- Return true so it gets saved to disk and deleted from modem
                 end
             end
         end
    end

    if not archive.conversations[phone] then
        archive.conversations[phone] = {
            messages = {},
            unread = 0,
            last_message = "",
            last_time = ""
        }
    end
    
    local conv = archive.conversations[phone]
    local msg = {
        id = "sms_" .. os.time() .. "_" .. math.random(1000),
        direction = direction,
        content = content,
        timestamp = (timestamp and timestamp ~= "" and timestamp ~= "--") and timestamp or os.date("%Y-%m-%dT%H:%M:%S"),
        read = false,
        important = false
    }
    
    table.insert(conv.messages, msg)
    conv.last_message = content
    conv.last_time = msg.timestamp
    
    if direction == "received" then
        conv.unread = (conv.unread or 0) + 1
    end
    
    -- Mark as synced
    archive.synced_ids[msg_id] = true
    
    -- Limit messages
    local max_msg = archive.settings.max_messages or 50
    while #conv.messages > max_msg do
        for i = 1, #conv.messages do
            if not conv.messages[i].important then
                table.remove(conv.messages, i)
                break
            end
        end
    end
    
    return true
end

-- Sync SMS using driver
function sync_sms_via_driver(archive, driver_lib)
    log("Syncing SMS via driver")
    
    local config = { driver = "dynamic", modem_index = "0" }
    local ok, result = pcall(driver_lib.get_sms, config)
    
    if not ok or not result or not result.messages then
        log("Failed to get SMS from driver")
        return 0
    end
    
    local count = 0
    for _, msg in ipairs(result.messages) do
        local msg_id = msg.index or string.format("%s_%d_%s", msg.storage or "SENT", os.time(), msg.number or "unknown")
        
        -- A. Handle Content Messages
        if not msg.is_status_report and msg.text and msg.text ~= "" then
            local phone = msg.number or "Unknown"
            local content = msg.text or ""
            local direction = msg.type or "received"
            local timestamp = msg.time_sort or msg.time or os.date("%Y/%m/%d %H:%M:%S")
            
            -- Convert timestamp to ISO
            local iso_time = timestamp:gsub(" ", "T"):gsub("/", "-")
            if iso_time:match("^(%d+)-(%d+)-(%d+)T") then
                local p1, p2, p3, rest = iso_time:match("^(%d+)-(%d+)-(%d+)T(.*)")
                if #p1 <= 2 and #p3 >= 2 then
                    local y = p3; if #y == 2 then y = "20" .. y end
                    iso_time = string.format("%s-%s-%sT%s", y, p2, p1, rest)
                end
            end
            
            -- Try to add to archive
            local is_new = add_to_archive(archive, phone, direction, content, iso_time, msg_id)
            if is_new then count = count + 1 end
            
            -- Cleanup: If it's in archive (just added OR already existed), DELETE it from modem
            if archive.synced_ids[msg_id] then
                pcall(function()
                    if msg.index then
                        driver_lib.delete_sms(config, msg.index)
                        log("Cleaned up SMS index: " .. msg.index)
                    end
                end)
            end
        
        -- B. Handle Trash (Status Reports)
        elseif msg.is_status_report then
            pcall(function()
                if msg.index then
                    driver_lib.delete_sms(config, msg.index)
                    log("Deleted Status Report: " .. msg.index)
                end
            end)
            count = count + 1 -- Trigger save
        end
    end
    
    return count
end

-- Main loop
function main()
    log("SMS Sync Service started (Driver mode)")
    
    local driver_lib = get_driver()
    log("Driver loaded successfully")
    
    while true do
        local archive = load_archive()
        
        -- Clear trigger file before sync
        os.remove("/tmp/sms_sync_trigger")
        
        local ok, count = pcall(sync_sms_via_driver, archive, driver_lib)
        
        local base_sleep = 60 -- Default interval (Rest mode)
        
        -- Check for recent web activity (last 2 minutes)
        local f_act = io.open("/tmp/sms_web_activity", "r")
        if f_act then
            local last_act = tonumber(f_act:read("*a") or 0)
            f_act:close()
            if (os.time() - last_act) < 120 then
                base_sleep = 10 -- Fast polling (Active mode)
            end
        end
        
        if ok then
            if type(count) == "number" and count > 0 then
                save_archive(archive)
                log("Synced " .. count .. " new SMS to archive")
                base_sleep = 5 -- Burst mode if messages coming
            end
        else
            log("Modem/Driver error: " .. tostring(count))
            base_sleep = 300 -- Sleep 5 mins on failure
        end
        
        -- Smart Sleep: check for trigger every second
        for i = 1, base_sleep do
            os.execute("sleep 1")
            -- If trigger file appears, wake up immediately
            local f_trig = io.open("/tmp/sms_sync_trigger", "r")
            if f_trig then
                f_trig:close()
                break
            end
        end
    end
end

-- Start service
main()
