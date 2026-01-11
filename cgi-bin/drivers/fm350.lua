-- local M = {}
-- local json = require "luci.jsonc"

-- local PORT_DEFAULT = "/dev/ttyUSB1"
-- local SMS_TOOL = "tom_modem"
-- local SENT_BOX_FILE = "/root/sms_sent_history.json"

-- local function exec(cmd)
--     local handle = io.popen(cmd)
--     local result = handle:read("*a")
--     handle:close()
--     return result or ""
-- end

-- -- --- HÀM QUẢN LÝ HỘP THƯ ĐI ---
-- local function load_sent_box()
--     local f = io.open(SENT_BOX_FILE, "r")
--     if not f then return {} end
--     local content = f:read("*a")
--     f:close()
--     local data = json.parse(content)
--     return (data and data.messages) or {}
-- end

-- local function save_sent_msg(number, text)
--     local msgs = load_sent_box()
--     if #msgs >= 50 then table.remove(msgs, 1) end
--     table.insert(msgs, {
--         index = "local_" .. os.time(), 
--         number = number,
--         text = text,
--         time = os.date("%m/%d/%y %H:%M:%S"), 
--         type = "sent", 
--         status = "read"
--     })
--     local f = io.open(SENT_BOX_FILE, "w")
--     if f then
--         f:write(json.stringify({messages = msgs}))
--         f:close()
--     end
-- end

-- local function freeze_process(port, action)
--     local device_name = port:gsub("/dev/", "")
--     local my_pid = "0"
--     local f = io.open("/proc/self/stat", "r"); if f then my_pid = f:read("*n"); f:close() end

--     local cmd = "ls -l /proc/*/fd/* 2>/dev/null | grep " .. device_name
--     local output = exec(cmd)
--     local pids_handled = {}
    
--     for line in output:gmatch("[^\r\n]+") do
--         local pid = line:match("/proc/(%d+)/fd/")
--         if pid and pid ~= "" and pid ~= tostring(my_pid) then
--             if not pids_handled[pid] then
--                 pids_handled[pid] = true
--                 if action == "stop" then os.execute("kill -STOP " .. pid)
--                 elseif action == "cont" then os.execute("kill -CONT " .. pid) end
--             end
--         end
--     end

--     if action == "stop" then
--         os.execute("killall -STOP gcom >/dev/null 2>&1")
--         os.execute("killall -STOP chat >/dev/null 2>&1")
--         os.execute("killall -9 " .. SMS_TOOL .. " >/dev/null 2>&1")
--         os.execute("rm -f /var/lock/LCK.." .. device_name)
--     elseif action == "cont" then
--         os.execute("killall -CONT gcom >/dev/null 2>&1")
--         os.execute("killall -CONT chat >/dev/null 2>&1")
--     end
-- end

-- -- --- HÀM KHỞI TẠO MODEM ---
-- local function init_modem(port)
--     local p = io.open(port, "w")
--     if p then
--         p:write("\27\r"); p:flush(); os.execute("sleep 1")
--         p:write("AT\r"); p:flush(); os.execute("sleep 1")
--         p:close()
--     end
-- end

-- -- --- HÀM GỘP TIN NHẮN MULTIPART (FIX LỖI FONT/CẮT ĐOẠN) ---
-- local function reconstruct_sms(raw_list)
--     local multipart = {}
--     local singles = {}

--     for _, msg in ipairs(raw_list) do
--         -- Kiểm tra nếu là tin nhắn nhiều phần (Multipart)
--         if msg.total and msg.total > 1 and msg.reference then
--             local key = msg.sender .. "_" .. msg.reference
--             if not multipart[key] then
--                 multipart[key] = {
--                     total = msg.total,
--                     parts = {},
--                     sender = msg.sender,
--                     timestamp = msg.timestamp
--                 }
--             end
--             -- Đưa nội dung vào mảng theo đúng thứ tự part
--             multipart[key].parts[tonumber(msg.part)] = msg.content
--         else
--             table.insert(singles, msg)
--         end
--     end

--     -- Tiến hành gộp các nhóm tin nhắn
--     for _, mp in pairs(multipart) do
--         local complete = true
--         for i = 1, mp.total do
--             if not mp.parts[i] then complete = false; break end
--         end

--         if complete then
--             local full_content = ""
--             for i = 1, mp.total do full_content = full_content .. mp.parts[i] end
--             table.insert(singles, {
--                 sender = mp.sender,
--                 timestamp = mp.timestamp,
--                 content = full_content,
--                 multipart = true
--             })
--         else
--             -- Nếu chưa đủ phần, trả về các phần lẻ hiện có
--             for i = 1, mp.total do
--                 if mp.parts[i] then
--                     table.insert(singles, {
--                         sender = mp.sender,
--                         timestamp = mp.timestamp,
--                         content = mp.parts[i],
--                         incomplete = true
--                     })
--                 end
--             end
--         end
--     end
--     return singles
-- end

-- function M.send_sms(config, number, text)
--     if os.execute("which " .. SMS_TOOL .. " >/dev/null") ~= 0 then
--         return { status = "error", message = "QModem tool not found" }
--     end

--     local port = (config and config.at_port and config.at_port ~= "") and config.at_port or PORT_DEFAULT
--     if os.execute("[ -c " .. port .. " ]") ~= 0 then
--         return { status = "error", message = "Port not found: " .. port }
--     end

--     freeze_process(port, "stop")
    
--     local safe_text = text:gsub('"', '\\"')
--     local cmd = string.format("%s -d %s send \"%s\" \"%s\" 2>&1", SMS_TOOL, port, number, safe_text)
--     local output = exec(cmd)
    
--     if output:lower():find("error") then
--         init_modem(port)
--         output = exec(cmd) 
--     end

--     freeze_process(port, "cont")

--     if output:lower():find("error") or output:lower():find("fail") then
--         return { status = "error", message = "Send Failed", debug = output }
--     else
--         save_sent_msg(number, text)
--         return { status = "success", message = "Sent via QModem Tool", debug = output }
--     end
-- end

-- function M.get_sms(config)
--     local port = (config and config.at_port and config.at_port ~= "") and config.at_port or PORT_DEFAULT
--     if os.execute("[ -c " .. port .. " ]") ~= 0 then return {} end

--     freeze_process(port, "stop")
    
--     local function read_storage(mem_type)
--         local p = io.open(port, "w")
--         if p then
--             p:write('AT+CSCS="UTF-8"\r')
--             p:flush()
--             p:write(string.format('AT+CPMS="%s","%s","%s"\r', mem_type, mem_type, mem_type))
--             p:flush()
--             os.execute("sleep 0.5")
--             p:close()
--         end

--         local cmd = string.format("%s -d %s -j recv 2>/dev/null", SMS_TOOL, port)
--         local output = exec(cmd)
--         local raw = json.parse(output)
--         return (raw and raw.msg) or {}
--     end

--     -- Thu thập tin nhắn thô từ SM và ME
--     local raw_list = {}
--     local list_sm = read_storage("SM")
--     for _, m in ipairs(list_sm) do table.insert(raw_list, m) end
    
--     if #list_sm == 0 then
--         local list_me = read_storage("ME")
--         for _, m in ipairs(list_me) do table.insert(raw_list, m) end
--     end

--     freeze_process(port, "cont")

--     -- 1. Xử lý gộp tin nhắn
--     local processed_list = reconstruct_sms(raw_list)

--     -- 2. Chuyển đổi sang định dạng dashboard
--     local combined = {}
--     local list_sent = load_sent_box()
--     for i = #list_sent, 1, -1 do table.insert(combined, list_sent[i]) end

--     for _, msg in ipairs(processed_list) do
--         table.insert(combined, {
--             index = msg.index or os.time(),
--             status = "read",
--             number = msg.sender,           
--             time = msg.timestamp or os.date("%m/%d/%y %H:%M:%S"), 
--             text = msg.content,
--             type = "received",
--             multipart = msg.multipart
--         })
--     end
--     return combined
-- end

-- function M.get_storage_info(config)
--     local port = (config and config.at_port and config.at_port ~= "") and config.at_port or PORT_DEFAULT
--     freeze_process(port, "stop")
--     local cmd = string.format("%s -d %s -s SM status", SMS_TOOL, port)
--     local output = exec(cmd)
--     freeze_process(port, "cont")
--     local used, total = output:match("used: (%d+), total: (%d+)")
--     return { used = used or "0", total = total or "N/A", port = port }
-- end

-- function M.delete_sms(config, index)
--     if tostring(index):find("local_") then
--         local msgs = load_sent_box()
--         local new_msgs = {}
--         for _, m in ipairs(msgs) do
--             if tostring(m.index) ~= tostring(index) then table.insert(new_msgs, m) end
--         end
--         local f = io.open(SENT_BOX_FILE, "w")
--         if f then f:write(json.stringify({messages = new_msgs})); f:close() end
--         return { status = "success" }
--     end

--     local port = (config and config.at_port and config.at_port ~= "") and config.at_port or PORT_DEFAULT
--     freeze_process(port, "stop")
--     local p = io.open(port, "w")
--     if p then 
--         p:write('AT+CPMS="SM"\r'); p:flush(); os.execute("sleep 1")
--         p:close() 
--     end
--     local cmd = string.format("%s -d %s delete %s", SMS_TOOL, port, index)
--     exec(cmd)
--     freeze_process(port, "cont")
--     return { status = "success" }
-- end

-- return M