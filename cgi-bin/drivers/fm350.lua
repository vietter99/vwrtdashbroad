local M = {}
local json = require "luci.jsonc"

-- CẤU HÌNH
local PORT_FIXED = "/dev/ttyUSB3"
local SMS_TOOL = "sms_tool_q"
local SENT_BOX_FILE = "/root/sms_sent_history.json"

local function exec(cmd)
    local handle = io.popen(cmd)
    local result = handle:read("*a")
    handle:close()
    return result or ""
end

-- --- HÀM QUẢN LÝ HỘP THƯ ĐI (Lưu tin gửi vào file) ---
local function load_sent_box()
    local f = io.open(SENT_BOX_FILE, "r")
    if not f then return {} end
    local content = f:read("*a")
    f:close()
    local data = json.parse(content)
    return (data and data.messages) or {}
end

local function save_sent_msg(number, text)
    local msgs = load_sent_box()
    -- Giới hạn lưu 50 tin gần nhất để không đầy bộ nhớ
    if #msgs >= 50 then table.remove(msgs, 1) end
    
    table.insert(msgs, {
        index = "local_" .. os.time(), 
        number = number,
        text = text,
        -- Định dạng giờ giống modem: MM/DD/YY HH:MM:SS
        time = os.date("%m/%d/%y %H:%M:%S"), 
        type = "sent", 
        status = "read"
    })
    
    local f = io.open(SENT_BOX_FILE, "w")
    if f then
        f:write(json.stringify({messages = msgs}))
        f:close()
    end
end

-- --- HÀM DỌN DẸP ---
local function freeze_process(action)
    local device_name = PORT_FIXED:gsub("/dev/", "")
    local my_pid = "0"
    local f = io.open("/proc/self/stat", "r"); if f then my_pid = f:read("*n"); f:close() end

    local cmd = "ls -l /proc/*/fd/* 2>/dev/null | grep " .. device_name
    local output = exec(cmd)
    local pids_handled = {}
    
    for line in output:gmatch("[^\r\n]+") do
        local pid = line:match("/proc/(%d+)/fd/")
        if pid and pid ~= "" and pid ~= tostring(my_pid) then
            if not pids_handled[pid] then
                pids_handled[pid] = true
                if action == "stop" then os.execute("kill -STOP " .. pid)
                elseif action == "cont" then os.execute("kill -CONT " .. pid) end
            end
        end
    end

    if action == "stop" then
        os.execute("killall -STOP gcom >/dev/null 2>&1")
        os.execute("killall -STOP chat >/dev/null 2>&1")
        os.execute("killall -9 sms_tool_q >/dev/null 2>&1")
        os.execute("rm -f /var/lock/LCK.." .. device_name)
    elseif action == "cont" then
        os.execute("killall -CONT gcom >/dev/null 2>&1")
        os.execute("killall -CONT chat >/dev/null 2>&1")
    end
end

-- --- HÀM KHỞI TẠO MODEM ---
local function init_modem(port)
    local p = io.open(port, "w")
    if p then
        p:write("\27\r"); p:flush(); os.execute("sleep 1")
        p:write("AT\r"); p:flush(); os.execute("sleep 1")
        p:close()
    end
end

function M.send_sms(config, number, text)
    if os.execute("which " .. SMS_TOOL .. " >/dev/null") ~= 0 then
        return { status = "error", message = "QModem tool not found" }
    end

    local port = PORT_FIXED
    if os.execute("[ -c " .. port .. " ]") ~= 0 then
        if os.execute("[ -c /dev/ttyUSB2 ]") == 0 then port = "/dev/ttyUSB2" 
        else return { status = "error", message = "Port not found: " .. port } end
    end

    freeze_process("stop")
    
    local safe_text = text:gsub('"', '\\"')
    local cmd = string.format("%s -d %s send \"%s\" \"%s\" 2>&1", SMS_TOOL, port, number, safe_text)
    local output = exec(cmd)
    
    if output:lower():find("error") then
        init_modem(port)
        output = exec(cmd) 
    end

    freeze_process("cont")

    if output:lower():find("error") or output:lower():find("fail") then
        return { status = "error", message = "Send Failed", debug = output }
    else
        save_sent_msg(number, text)
        return { status = "success", message = "Sent via QModem Tool", debug = output }
    end
end

-- --- ĐỌC TIN NHẮN (Gộp Inbox + Sent Box) ---
function M.get_sms(config)
    local port = PORT_FIXED
    if os.execute("[ -c " .. port .. " ]") ~= 0 then return {} end
    if os.execute("which " .. SMS_TOOL .. " >/dev/null") ~= 0 then return {} end

    freeze_process("stop")
    
    local function read_storage(mem_type)
        local p = io.open(port, "w")
        if p then
            p:write(string.format('AT+CPMS="%s","%s","%s"\r', mem_type, mem_type, mem_type))
            p:flush()
            os.execute("sleep 0.5")
            p:close()
        end

        local cmd = string.format("%s -d %s -j recv 2>/dev/null", SMS_TOOL, port)
        local output = exec(cmd)
        local raw = json.parse(output)
        if raw and raw.msg then return raw.msg else return {} end
    end

    local list_sm = read_storage("SM")
    local list_me = {}
    if #list_sm == 0 then list_me = read_storage("ME") end

    freeze_process("cont")

    local list_sent = load_sent_box()

    local combined = {}
    
    for i = #list_sent, 1, -1 do
        table.insert(combined, list_sent[i])
    end

    for _, list in ipairs({list_sm, list_me}) do
        for _, msg in ipairs(list) do
            table.insert(combined, {
                index = msg.index,
                status = "read",
                number = msg.sender,           
                time = msg.timestamp or "N/A", 
                text = msg.content,
                type = "received" 
            })
        end
    end

    return combined
end

function M.get_storage_info(config)
    local port = PORT_FIXED
    freeze_process("stop")
    local cmd = string.format("%s -d %s -s SM status", SMS_TOOL, port)
    local output = exec(cmd)
    freeze_process("cont")
    local used, total = output:match("used: (%d+), total: (%d+)")
    return { used = used or "0", total = total or "N/A", port = port }
end

function M.delete_sms(config, index)
    -- Xóa tin Sent (Local)
    if tostring(index):find("local_") then
        local msgs = load_sent_box()
        local new_msgs = {}
        for _, m in ipairs(msgs) do
            if tostring(m.index) ~= tostring(index) then table.insert(new_msgs, m) end
        end
        local f = io.open(SENT_BOX_FILE, "w")
        if f then f:write(json.stringify({messages = new_msgs})); f:close() end
        return { status = "success" }
    end

    -- Xóa tin Inbox (Modem)
    local port = PORT_FIXED
    freeze_process("stop")
    local p = io.open(port, "w")
    if p then 
        p:write('AT+CPMS="SM"\r'); p:flush(); os.execute("sleep 1")
        p:close() 
    end
    local cmd = string.format("%s -d %s delete %s", SMS_TOOL, port, index)
    exec(cmd)
    freeze_process("cont")
    return { status = "success" }
end

return M