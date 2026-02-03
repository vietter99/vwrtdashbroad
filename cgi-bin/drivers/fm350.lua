local M = {}
local json = require "luci.jsonc"

-- Helper to execute shell command
local function exec(cmd)
    local f = io.popen(cmd)
    if not f then return nil end
    local content = f:read("*all")
    f:close()
    return content
end

-- Helper to check if a file exists
local function file_exists(path)
    local f = io.open(path, "r")
    if f then
        f:close()
        return true
    end
    return false
end

-- Helper: Get configured AT port dynamic
local function get_fm350_port(purpose)
    -- Hybrid Strategy:
    -- ttyUSB3 IS REQUIRED FOR SENDING (firmware restriction)
    -- ttyUSB1 IS BETTER FOR READING/POLLING (no conflict with data session traffic)
    
    if purpose == "send" then
        if file_exists("/dev/ttyUSB3") then return "/dev/ttyUSB3" end
        return "/dev/ttyUSB1"
    else
        -- Default/Read/Poll
        if file_exists("/dev/ttyUSB1") then return "/dev/ttyUSB1" end
        if file_exists("/dev/ttyUSB3") then return "/dev/ttyUSB3" end
    end
    
    return "/dev/ttyUSB3"
end

-- ===== LOCAL STORAGE FOR SENT MESSAGES =====
local SENT_FILE = "/etc/vwrt/sms_sent.json"

local function read_sent_msgs()
    local f = io.open(SENT_FILE, "r")
    if not f then return {} end
    local content = f:read("*all")
    f:close()
    if not content or content == "" then return {} end
    local ok, data = pcall(json.parse, content)
    return (ok and data) or {}
end

local function save_sent_msg(number, text)
    local msgs = read_sent_msgs()
    -- Format: 01/02/26 14:30:00 (approx matching modem style dd/mm/yy)
    local timestamp = os.date("%d/%m/%y %H:%M:%S")
    local new_msg = {
        index = "LOCAL_" .. os.time(), -- Unique-ish ID
        number = number,
        time = timestamp,
        text = text,
        status = "sent",
        storage = "LOCAL"
    }
    table.insert(msgs, new_msg)
    
    -- Limit local history to 50
    if #msgs > 50 then
        table.remove(msgs, 1) -- Remove oldest
    end
    
    -- Automatic Directory Creation
    os.execute("mkdir -p /etc/vwrt")
    
    local f = io.open(SENT_FILE, "w")
    if f then
        f:write(json.stringify(msgs))
        f:close()
    end
end

local function delete_sent_msg(index)
    if index == "all" then
        -- Delete all local sent messages
        local f = io.open(SENT_FILE, "w")
        if f then
            f:write(json.stringify({}))
            f:close()
        end
        return true
    end
    
    -- Delete specific message by index
    local msgs = read_sent_msgs()
    local found = false
    local new_msgs = {}
    
    for _, msg in ipairs(msgs) do
        if msg.index ~= index then
            table.insert(new_msgs, msg)
        else
            found = true
        end
    end
    
    if found then
        local f = io.open(SENT_FILE, "w")
        if f then
            f:write(json.stringify(new_msgs))
            f:close()
        end
        return true
    end
    
    return false
end
 
-- Helper: Parse Timestamp to YYYY/MM/DD HH:MM:SS for sorting
local function parse_time(t_str)
    if not t_str or t_str == "" then return "0000/00/00 00:00:00" end
    -- Local format: dd/mm/yy HH:MM:SS
    -- Modem format (likely): yy/mm/dd (less common) or mm/dd/yy (common)
    -- Given user report: 02/01/26 (Feb 1st), it's MM/DD/YY.
    
    -- Attempt to detect MM/DD/YY vs DD/MM/YY
    -- Let's try to standardize to YYYY/MM/DD
    local p1, p2, p3, time = t_str:match("(%d+)/(%d+)/(%d+)%s+(.*)")
    if p1 and p2 and p3 then
        local y = tonumber(p3)
        local m = tonumber(p1) -- Assume MM/DD/YY by default for modem
        local d = tonumber(p2)
        
        -- If > 31 it's year
        if tonumber(p1) > 31 then return t_str end -- already YYYY
        
        -- Normalize year 2 digits
        if y < 100 then y = 2000 + y end
        
        -- Fix for Local Storage which uses DD/MM/YY
        -- If we detect it's likely DD/MM/YY...
        -- Or we just force everything to standard.
        -- Let's assume modem sends MM/DD/YY and we saved DD/MM/YY locally.
        -- This is tricky. Let's start with a format helper.
    end
    return t_str
end

local function normalize_msg_obj(msg)
    local t_raw = msg.time or msg.timestamp or ""
    local t_sort = t_raw
    
    -- Heuristic: If it starts with "LOCAL_", we saved it as DD/MM/YY
    if msg.index and msg.index:find("^LOCAL_") then
         local d, m, y, t = t_raw:match("(%d+)/(%d+)/(%d+)%s+(.*)")
         if d and m and y then
             t_sort = string.format("20%s/%s/%s %s", y, m, d, t)
         end
    else
         -- Modem: Assume MM/DD/YY (02/01/26 -> 2026/02/01)
         local m, d, y, t = t_raw:match("(%d+)/(%d+)/(%d+)%s+(.*)")
         if m and d and y then
             t_sort = string.format("20%s/%s/%s %s", y, m, d, t)
         end
    end
    
    msg.time_sort = t_sort
    return msg
end
-- ===========================================

function M.get_sms(config)
    local port = get_fm350_port("read")
    
    if os.execute("ls /tmp/modem_at.lock >/dev/null 2>&1") == 0 then
        return { messages = {}, storage = { used = 0, total = 20 }, status = "busy" }
    end

    local messages = {}
    local total_used = 0
    local total_cap = 0
    
    local storages = {"SM", "ME"}
    local seen_msgs = {} -- For deduplication
    
    for _, s in ipairs(storages) do
        local cmd = "/usr/bin/sms_tool -d " .. port .. " -s " .. s .. " -j recv 2>/dev/null"
        local raw = exec(cmd)
        
        if raw and raw ~= "" then
            local ok, parsed = pcall(json.parse, raw)
            if ok and parsed then
                local msgs = parsed.messages or parsed.msg or {}
                if #msgs == 0 and #parsed > 0 then msgs = parsed end
                
                for _, msg in ipairs(msgs) do
                    -- Create a signature for deduplication
                    local sig = (msg.sender or "") .. (msg.timestamp or msg.timestamp or "") .. (msg.content or "")
                    if not seen_msgs[sig] then
                        table.insert(messages, normalize_msg_obj({
                            index = s .. "_" .. msg.index,
                            number = msg.sender,
                            time = msg.timestamp or msg.date,
                            text = msg.content,
                            status = "received",
                            type = "received", -- UI uses this
                            storage = s,
                            is_status_report = false, -- fm350/sms_tool handle reports differently
                            -- Add fields for stitching
                            ref = msg.reference,
                            part = msg.part,
                            total = msg.total
                        }))
                        seen_msgs[sig] = true
                    end
                end
                
                if parsed.storage then
                    total_used = total_used + (parsed.storage.used or #msgs)
                    total_cap = total_cap + (parsed.storage.total or 40)
                end
            end
        end
    end
    
    -- Merge Local Sent Messages
    local sent_msgs = read_sent_msgs()
    for _, m in ipairs(sent_msgs) do
        -- Ensure local messages have type='sent'
        m.type = "sent" 
        m.status = "sent"
        table.insert(messages, normalize_msg_obj(m)) 
    end
    
    -- 1. Merge Multi-part Messages
    local merged_messages = {}
    local ref_map = {} 
    
    for _, msg in ipairs(messages) do
        -- Check if it's a multi-part message (Modem Only)
        if msg.ref and msg.total and msg.total > 1 then
            local key = msg.number .. "_" .. msg.ref
            if not ref_map[key] then
                ref_map[key] = {
                    parts = {},
                    number = msg.number,
                    time = msg.time, 
                    time_sort = msg.time_sort,
                    storage = msg.storage,
                    status = msg.status,
                    type = msg.type,
                    total = msg.total
                }
                table.insert(merged_messages, ref_map[key])
            end
            
            ref_map[key].parts[msg.part] = msg.text
            if (msg.time_sort or "") > (ref_map[key].time_sort or "") then
                ref_map[key].time = msg.time
                ref_map[key].time_sort = msg.time_sort
            end
        else
            table.insert(merged_messages, msg)
        end
    end
    
    -- Finalize merged content
    local final_messages = {}
    for _, item in ipairs(merged_messages) do
        if item.parts then
            local full_text = ""
            local missing_parts = {}
            for i = 1, item.total do
                if item.parts[i] then
                    full_text = full_text .. item.parts[i]
                else
                    table.insert(missing_parts, tostring(i))
                end
            end
            
            -- Warning for incomplete messages
            if #missing_parts > 0 then
                full_text = "[⚠️ Thiếu phần " .. table.concat(missing_parts, ", ") .. "/" .. item.total .. "] " .. full_text
            end
            
            item.text = full_text
            item.parts = nil 
            item.index = "grouped" 
        end
        table.insert(final_messages, item)
    end

    -- 2. Sort messages (Newest first using normalized time)
    table.sort(final_messages, function(a, b) 
        return (a.time_sort or "") > (b.time_sort or "") 
    end)
    
    -- 3. Limit to 20 messages
    local limited_msgs = {}
    for i=1, math.min(20, #final_messages) do
        table.insert(limited_msgs, final_messages[i])
    end
    
    -- User wants limit 20. 
    -- We report 'used' as the total number of merged messages.
    -- We report 'total' as 20.
    return {
        messages = limited_msgs,
        storage = { used = #final_messages, total = 20 }
    }
end

function M.send_sms(config, number, content)
    local port = get_fm350_port("send")
    
    -- 1. Acquire Lock
    os.execute("touch /tmp/modem_at.lock")
    
    -- 2. Check registration first
    local reg_cmd = string.format("/usr/bin/sms_tool -d %s at 'AT+CREG?' 2>&1", port)
    local reg_out = exec(reg_cmd) or ""
    
    -- 3. Escaping content
    local safe_content = content:gsub("'", "'\\''")
    
    -- 4. Execute Blind Write to ttyUSB3 (ATC standard)
    -- We don't read from the port because atc.sh is already reading it.
    -- We'll check the log for confirmation instead.
    local f = io.open(port, "w")
    if not f then
        os.execute("rm -f /tmp/modem_at.lock")
        return { status = "error", message = "Không thể mở cổng gửi tin" }
    end
    
    f:write("AT+CMGF=1\r")
    f:flush()
    os.execute("sleep 1")
    f:write("AT+CMGS=\"" .. number .. "\"\r")
    f:flush()
    os.execute("sleep 1")
    f:write(safe_content .. "\26")
    f:flush()
    f:close()
    
    -- 5. Wait and Check Log for confirmation from atc.sh
    os.execute("sleep 3")
    local check_cmd = "logread | tail -n 20 | grep 'SMS successfully sent' | tail -n 1"
    local log_out = exec(check_cmd) or ""
    
    -- 6. Release Lock
    os.execute("rm -f /tmp/modem_at.lock")
    
    -- Logging for debug
    local log_f = io.open("/tmp/sms_send.log", "a")
    if log_f then
        log_f:write(string.format("[%s] Sending to %s (Hybrid Blind)\n", os.date(), number))
        log_f:write("Log check output: " .. log_out .. "\n")
        log_f:close()
    end
    
    -- If we see the success log in the last few seconds
    if log_out:find("SMS successfully sent") then
        save_sent_msg(number, content) -- SAVE TO LOCAL STORAGE
        return { status = "success" }
    else
        return { status = "error", message = "Gửi tin nhắn đang xử lý hoặc gặp lỗi modem" }
    end
end

function M.delete_sms(config, index)
    local port = get_fm350_port("delete")
    
    -- 1. Handle Local/All Deletion
    if index == "all" then
        delete_sent_msg("all")
        -- Continue to delete modem messages below
    elseif index:find("^LOCAL_") then
        if delete_sent_msg(index) then
            return { status = "success" }
        else
            return { status = "error", message = "Không tìm thấy tin nhắn đã gửi" }
        end
    end

    -- 2. Acquire Lock (for Modem Deletion)
    os.execute("touch /tmp/modem_at.lock")
    
    local ok = true
    if index == "all" then
        -- Attempt to delete from both common storages
        os.execute(string.format("/usr/bin/sms_tool -d %s -s SM delete all >/dev/null 2>&1", port))
        os.execute(string.format("/usr/bin/sms_tool -d %s -s ME delete all >/dev/null 2>&1", port))
    else
        local storage, real_index = index:match("^(.-)_(%d+)$")
        local cmd = ""
        if storage and real_index then
            cmd = string.format("/usr/bin/sms_tool -d %s -s %s delete %s 2>&1", port, storage, real_index)
        else
            cmd = string.format("/usr/bin/sms_tool -d %s delete %s 2>&1", port, index)
        end
        
        local f = io.popen(cmd)
        local out = f:read("*a")
        ok = f:close()
        
        -- Logging for debug
        local log_f = io.open("/tmp/sms_delete.log", "a")
        if log_f then
            log_f:write(string.format("[%s] Deleting index %s\n", os.date(), index))
            log_f:write("Output: " .. (out or "nil") .. "\n")
            log_f:write("Status: " .. tostring(ok) .. "\n")
            log_f:close()
        end
    end
    
    -- 2. Release Lock
    os.execute("rm -f /tmp/modem_at.lock")
    
    if ok then
        return { status = "success" }
    else
        return { status = "error", message = "Modem bận hoặc không thể xóa" }
    end
end

return M
