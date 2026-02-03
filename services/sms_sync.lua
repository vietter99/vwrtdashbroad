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
    -- Check if already synced
    if archive.synced_ids[msg_id] then
        return false -- Already synced
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
        timestamp = timestamp,
        read = false,
        important = false
    }
    
    table.insert(conv.messages, msg)
    conv.last_message = content
    conv.last_time = timestamp
    
    if direction == "received" then
        conv.unread = (conv.unread or 0) + 1
    end
    
    -- Mark as synced
    archive.synced_ids[msg_id] = true
    
    -- Limit messages per conversation
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
        -- Check if already synced
        local msg_id = msg.index or string.format("%s_%d_%s", msg.storage or "SENT", os.time(), msg.number or "unknown")
        
        if not archive.synced_ids[msg_id] and msg.text and msg.text ~= "" then
            local phone = msg.number or "Unknown"
            local content = msg.text or ""
            local direction = msg.type or "received"
            local timestamp = msg.time_sort or msg.time or os.date("%Y/%m/%d %H:%M:%S")
            
            -- Convert timestamp to ISO format (YYYY-MM-DDTHH:MM:SS)
            local iso_time = timestamp:gsub(" ", "T"):gsub("/", "-")
            
            -- If it's DD-MM-YY, convert to YYYY-MM-DD
            if iso_time:match("^(%d+)-(%d+)-(%d+)T") then
                local p1, p2, p3, rest = iso_time:match("^(%d+)-(%d+)-(%d+)T(.*)")
                if #p1 <= 2 and #p3 >= 2 then
                    -- Assume DD-MM-YYYY or DD-MM-YY based on p3
                    local y = p3
                    if #y == 2 then y = "20" .. y end
                    iso_time = string.format("%s-%s-%sT%s", y, p2, p1, rest)
                end
            end
            
            -- Add to archive (returns true if new, false if exists)
            local is_new = add_to_archive(archive, phone, direction, content, iso_time, msg_id)
            if is_new then
                count = count + 1
            end
            
            -- Auto-delete from Modem/SIM if it is safely in archive (newly added or previously synced)
            if is_new or archive.synced_ids[msg_id] then
                pcall(function()
                    local st = string.upper(msg.storage or "NIL")
                    
                    if msg.index and (st == "SM" or st == "ME" or st == "MT") then
                        driver_lib.delete_sms(config, msg.index)
                        log("Cleaned up SMS from " .. st .. ": " .. msg.index)
                    end
                end)
            end
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
        
        local ok, count = pcall(sync_sms_via_driver, archive, driver_lib)
        if ok and type(count) == "number" and count > 0 then
            save_archive(archive)
            log("Synced " .. count .. " new SMS to archive")
        elseif not ok then
            log("Error syncing SMS: " .. tostring(count))
        end
        
        -- Sleep 5 minutes
        os.execute("sleep 300")
    end
end

-- Start service
main()
