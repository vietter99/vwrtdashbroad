#!/usr/bin/lua

-- SMS Sync Service (Version 2 - Using existing driver)
-- Auto-sync SMS from SIM to router storage
-- Supports: FM350 (AT) and mmcli (ModemManager)

local cjson = require "cjson"
package.path = "/www/vwrt/?.lua;/www/vwrt/cgi-bin/?.lua;" .. package.path

local constants = require "lib.constants"
local sms_util = require "lib.sms_util"
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
    local safe_msg = tostring(msg):gsub("'", "'\\''")
    os.execute("logger -t VWRT_SMS_SYNC '" .. safe_msg .. "'")
    print(os.date("%H:%M:%S") .. " " .. tostring(msg))
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
    if not ok or not archive then
        archive = {}
    end
    
    -- Ensure all required fields exist
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

function save_archive(archive)
    os.execute("mkdir -p /overlay")
    local ok, json_text = pcall(cjson.encode, archive)
    if not ok then
        log("Error: Failed to encode archive to JSON: " .. tostring(json_text))
        return false
    end
    
    local success = write_file(ARCHIVE_FILE, json_text)
    if success then
        log("Archive saved successfully to " .. ARCHIVE_FILE .. " (Size: " .. #json_text .. ")")
    else
        log("Error: Failed to write archive to " .. ARCHIVE_FILE)
    end
    return success
end

-- Add message to archive
function add_to_archive(archive, phone, direction, content, timestamp, msg_id)
    if not archive or not archive.synced_ids or not archive.conversations then
        log("Error: Invalid archive structure in add_to_archive")
        return false
    end
    
    if not phone then
        log("Error: phone is nil in add_to_archive, assigning 'Unknown'")
        phone = "Unknown"
    end
    
    if not msg_id then
        log("Error: msg_id is nil in add_to_archive")
        return false
    end

    -- 1. Check if ID already synced (Basic check)
    if archive.synced_ids[msg_id] then
        return false 
    end
    
    -- 2. Deduplication for "SENT" messages (Smart Match)
    -- This handles cases where the modem's clock might be slightly off (network sync delay)
    -- If we just sent a message with identical content, don't add it as a new received message.
    if archive.conversations[phone] then
        local messages = archive.conversations[phone].messages
        -- Look at last 5 messages in this conversation
        for i = #messages, math.max(1, #messages - 5), -1 do
            local prev = messages[i]
            if prev.content == content then
                -- Match found! Check if it's within a 60-second window or identical fingerprint
                if prev.fingerprint == msg_id then
                    log("Dedup: Exact fingerprint match for " .. phone .. ", skipping.")
                    return false -- Already handled
                end
                
                -- Check direction conflict (Sent by us vs "Received" original copy from modem)
                if direction == "sent" and prev.direction == "sent" then
                    log("Dedup: Identical sent message already in archive for " .. phone)
                    archive.synced_ids[msg_id] = true
                    return false
                end
                
                -- The "FM350 Ghost" match: Modem reports our sent message as 'received' 
                -- but we already have it in archive as 'sent'.
                if direction == "received" and prev.direction == "sent" then
                   log("Dedup: Modem reported our own sent message as received for " .. phone .. ", merging.")
                   archive.synced_ids[msg_id] = true
                   return true -- Mark as handled (so it's deleted from modem) but don't add a new entry
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
        fingerprint = msg_id, -- Store original fingerprint for precise deletion
        direction = direction or "received",
        content = content or "",
        timestamp = (timestamp and timestamp ~= "" and timestamp ~= "--") and timestamp or os.date("%Y-%m-%dT%H:%M:%S"),
        read = false,
        important = false
    }
    
    table.insert(conv.messages, msg)
    conv.last_message = content or ""
    conv.last_time = msg.timestamp
    
    if direction == "received" then
        conv.unread = (conv.unread or 0) + 1
    end
    
    -- Mark as synced
    archive.synced_ids[msg_id] = true
    
    -- Limit messages
    local settings = archive.settings or { max_messages = 50 }
    local max_msg = settings.max_messages or 50
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
function sync_sms_via_driver(driver_lib)
    log("Syncing SMS via driver (Atomic mode)")
    
    local ok, result = pcall(driver_lib.get_sms, config)
    
    if not ok then
        log("Driver GET_SMS Error: " .. tostring(result))
        return 0
    end
    
    if not result or not result.messages then
        log("Failed to get SMS result from driver (Invalid format)")
        return 0
    end
    
    if result.status == "busy" then
        -- Don't log as failure, just return quietly
        return 0
    end
    
    local sms_storage = require "lib.sms_storage"
    local synced_count = 0
    local to_delete = {}

    -- Step 1: Update Archive Atomically
    sms_storage.update(function(archive)
        for _, msg in ipairs(result.messages) do
            local fingerprint = sms_util.get_fingerprint(msg)
            local msg_id = fingerprint
            
            -- Handle Content Messages
            if not msg.is_status_report and msg.text and msg.text ~= "" then
                -- Handle incomplete multipart messages
                if msg.text:find("[⚠️ Thiếu phần", 1, true) or msg.text:find("Thiếu phần", 1, true) then
                    -- Skip for now
                else
                    local phone = msg.number or "Unknown"
                    local content = msg.text or ""
                    local direction = msg.type or "received"
                    local timestamp = msg.time_sort or msg.time or os.date("%Y/%m/%d %H:%M:%S")
                    
                    -- Try to add to archive
                    local is_new = add_to_archive(archive, phone, direction, content, timestamp, msg_id)
                    if is_new then 
                        synced_count = synced_count + 1 
                        local del_idx = msg.raw_indices or msg.index
                        if del_idx then table.insert(to_delete, del_idx) end
                    elseif archive.synced_ids[msg_id] then
                        -- Already in archive, safe to delete from modem
                        local del_idx = msg.raw_indices or msg.index
                        if del_idx then table.insert(to_delete, del_idx) end
                    end
                end
            
            -- Handle Status Reports (Trash)
            elseif msg.is_status_report then
                if msg.index then table.insert(to_delete, msg.index) end
            end
        end
    end)
    
    -- Step 2: Delete from Modem only after archive is confirmed saved
    for _, idx in ipairs(to_delete) do
        pcall(function()
            driver_lib.delete_sms(config, idx)
            log("Cleaned up SMS index: " .. tostring(idx))
        end)
    end
    
    return synced_count
end

-- Main loop
function main()
    log("SMS Sync Service started (Driver mode)")
    
    local driver_lib = get_driver()
    log("Driver loaded successfully")
    
    while true do
        local archive = load_archive()
        
        -- 1. Check for DELETE requests from Web
        local f_del = io.open("/tmp/sms_delete_request", "r")
        if f_del then
            local phones = {}
            for line in f_del:lines() do
                local p = line:gsub("%s+", "")
                if #p > 0 then phones[p] = true end
            end
            f_del:close()
            os.remove("/tmp/sms_delete_request")
            
            for phone, _ in pairs(phones) do
                log("Processing remote delete request for: " .. phone)
                -- Get all SMS from modem and delete matching phone
                local result = pcall(driver_lib.get_sms, config)
                if result and result.messages then
                    for _, msg in ipairs(result.messages) do
                        if msg.number == phone then
                            local to_delete = msg.raw_indices or msg.index
                            if to_delete then
                                driver_lib.delete_sms(config, to_delete)
                                log("Remote cleaned up: " .. to_delete)
                            end
                        end
                    end
                end
            end
        end

        -- 2. Clear trigger file before sync
        os.remove("/tmp/sms_sync_trigger")
        
        local ok, count = pcall(sync_sms_via_driver, driver_lib)
        
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
