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

-- Helper: Trim whitespace
local function trim(s)
    return (s or ""):gsub("^%s*(.-)%s*$", "%1")
end

-- Helper: Read from serial port with timeout
local function read_serial_until(f, patterns, timeout)
    local content = ""
    local start = os.time()
    while os.time() - start < timeout do
        local chunk = f:read(1)
        if chunk then
            content = content .. chunk
            for _, p in ipairs(patterns) do
                if content:find(p) then return content, p end
            end
        end
    end
    return content, nil
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

-- Helper: Kiểm tra path là character device (KHÔNG phải file thường)
-- Quan trọng: Ngăn việc ghi đè device node thành regular file
-- Sử dụng 'test -c' vì busybox/OpenWrt có thể không có 'stat' đầy đủ
local function is_valid_device(path)
    local ret = os.execute("test -c " .. path .. " 2>/dev/null")
    return (ret == 0 or ret == true)
end

-- ===== LOCKING MECHANISM =====
local LOCK_FILE = "/tmp/modem_at.lock"

local function acquire_lock()
    -- Busy wait for lock if exists and not stale
    for i = 1, 5 do
        local f = io.open(LOCK_FILE, "r")
        if f then
            local ts = tonumber(f:read("*all") or "0")
            f:close()
            if os.time() - (ts or 0) < 30 then
                os.execute("sleep 1")
            else
                break
            end
        else
            break
        end
    end
    -- Create lock with timestamp
    local f = io.open(LOCK_FILE, "w")
    if f then
        f:write(tostring(os.time()))
        f:close()
        return true
    end
    return false
end

local function release_lock()
    os.remove(LOCK_FILE)
end

-- Helper: Get configured AT port dynamic
local function get_fm350_port(purpose)
    -- SINGLE PORT STRATEGY (FALLBACK)
    -- ttyUSB1/2 are unresponsive. We must use ttyUSB3 for everything.
    return "/dev/ttyUSB3"
end

-- Local storage for sent messages is deprecated in favor of SMS Archive service

-- Sentinel for removal
 
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
    
    if not acquire_lock() then
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
                    -- Detect Direction from modem status
                    local m_type = "received"
                    local m_status = string.lower(msg.status or "")
                    if m_status:find("sent") or m_status:find("mo") then
                        m_type = "sent"
                    end

                    -- Create a signature for deduplication
                    local sig = (msg.sender or "") .. (msg.timestamp or "") .. (msg.content or "")
                    if not seen_msgs[sig] then
                        table.insert(messages, normalize_msg_obj({
                            index = s .. "_" .. msg.index,
                            number = msg.sender,
                            time = msg.timestamp or msg.date,
                            text = msg.content,
                            status = m_status,
                            type = m_type,
                            direction = m_type, -- Sync service uses this
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
    
    -- Local storage merging removed (Sync Service handling Archive instead)
    
    -- 1. Merge Multi-part Messages
    local merged_messages = {}
    local ref_map = {} 
    
    for _, msg in ipairs(messages) do
        -- Check if it's a multi-part message (Modem Only)
        if msg.ref and msg.total and msg.total > 1 then
            -- NEW: Group by number, ref AND approximate time (hourly) to avoid ref wrap-around collision
            local time_key = (msg.time or ""):match("^(%d+/%d+/%d+%s+%d+:%d+)") or ""
            local key = msg.number .. "_" .. msg.ref .. "_" .. time_key
            if not ref_map[key] then
                ref_map[key] = {
                    parts = {},
                    raw_indexes = {}, -- NEW: Track all indexes for deletion
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
            table.insert(ref_map[key].raw_indexes, msg.index) -- Store real index
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
            -- IMPORTANT: Set index to the comma-separated list of physical indexes
            -- This allows the delete_sms function to work without knowing it's a 'grouped' message
            item.index = table.concat(item.raw_indexes, ",") 
            item.raw_indices = item.index
        end
        table.insert(final_messages, item)
    end

    release_lock()
    
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
    
    -- 0. Kiểm tra device hợp lệ (character device, không phải regular file)
    if not is_valid_device(port) then
        return { status = "error", message = "Modem chưa sẵn sàng (" .. port .. " không hợp lệ)" }
    end
    
    -- 1. Acquire Lock
    if not acquire_lock() then
        return { status = "error", message = "Modem đang bận xử lý tác vụ khác" }
    end
    
    -- 2. Native Send Implementation (Replaces sms_tool)
    local function send_native(p_num)
        -- Set Text Mode, Charset GSM, Verbose Errors
        os.execute("echo 'AT+CMGF=1;+CSCS=\"GSM\";+CMEE=2' > " .. port)
        os.execute("sleep 0.2")

        local f_w = io.open(port, "w")
        local f_r = io.open(port, "r")
        if not f_w or not f_r then return "Failed to open port" end

        f_w:write("AT+CMGS=\"" .. p_num .. "\"\r\n")
        f_w:flush()

        -- Wait for prompt >
        local patterns_prompt = {">", "\r\nERROR", "+CMS ERROR: ", "+CME ERROR: "}
        local res, match = read_serial_until(f_r, patterns_prompt, 5)
        
        if match == ">" then
            f_w:write(content .. string.char(26))
            f_w:flush()
            -- Improve patterns to avoid partial matches
            local patterns = {"\r\nOK", "\r\nERROR", "+CMS ERROR: ", "+CME ERROR: "}
            local res2, match2 = read_serial_until(f_r, patterns, 20)
            f_w:close(); f_r:close()
            return res2
        else
            f_w:close(); f_r:close()
            return "Prompt Timeout: " .. res
        end
    end

    local result = send_native(number)
    
    -- Retry with +84 if failed
    if result:find("ERROR") and number:sub(1,1) == "0" then
        local alt_num = "+84" .. number:sub(2)
        local log_f = io.open("/tmp/sms_send.log", "a")
        if log_f then log_f:write("Retrying with " .. alt_num .. "\n"); log_f:close() end
        result = send_native(alt_num)
    end
    
    -- 4. Release Lock
    release_lock()
    
    -- 5. Logging for debug
    local log_f = io.open("/tmp/sms_send.log", "a")
    if log_f then
        log_f:write(string.format("[%s] Sending to %s via Native AT\n", os.date(), number))
        log_f:write("Result: " .. result .. "\n")
        log_f:close()
    end
    
    -- 6. Check result
    if result:find("Ok") or result:find("OK") or result:find("+CMGS") then
        -- save_sent_msg removed (Archive handles this now)
        return { status = "success" }
    else
        return { status = "error", message = "Gửi thất bại (Native): " .. result:gsub("[\r\n]+", " ") }
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
    if not acquire_lock() then
        return { status = "error", message = "Modem đang bận, vui lòng thử lại sau" }
    end
    
    local ok = true
    if index == "all" then
        -- Attempt Global Delete on all storages to clear junk
        -- Using AT+CMGD=1,4 (Delete all read, unread, sent, unsent)
        os.execute(string.format("COMMAND='AT+CPMS=\"SM\",\"SM\",\"SM\";+CMGD=1,4' gcom -d %s -s /etc/gcom/run_at.gcom >/dev/null 2>&1", port))
        os.execute(string.format("COMMAND='AT+CPMS=\"ME\",\"ME\",\"ME\";+CMGD=1,4' gcom -d %s -s /etc/gcom/run_at.gcom >/dev/null 2>&1", port))
        -- Fallback to sms_tool for completeness
        os.execute(string.format("/usr/bin/sms_tool -d %s -s SM delete all >/dev/null 2>&1", port))
        os.execute(string.format("/usr/bin/sms_tool -d %s -s ME delete all >/dev/null 2>&1", port))
    else
        -- Support multiple indexes separated by comma (for multipart)
        for sub_index in index:gmatch("([^,]+)") do
            local storage, real_index = sub_index:match("^(.-)_(%d+)$")
            local cmd = ""
            if storage and real_index then
                -- Try AT command first for precision
                local at_cmd = string.format("AT+CPMS=\"%s\",\"%s\",\"%s\";+CMGD=%s", storage, storage, storage, real_index)
                os.execute(string.format("COMMAND='%s' gcom -d %s -s /etc/gcom/run_at.gcom >/dev/null 2>&1", at_cmd, port))
                
                -- Then use sms_tool as fallback
                cmd = string.format("/usr/bin/sms_tool -d %s -s %s delete %s 2>&1", port, storage, real_index)
            else
                cmd = string.format("/usr/bin/sms_tool -d %s delete %s 2>&1", port, sub_index)
            end
            
            local f = io.popen(cmd)
            local res = f:close()
            if not res then ok = false end
        end
    end
    
    -- 2. Release Lock
    release_lock()
    
    if ok then
        return { status = "success" }
    else
        return { status = "error", message = "Modem bận hoặc không thể xóa" }
    end
end

return M
