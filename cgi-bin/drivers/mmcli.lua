local M = {}
local json = require "luci.jsonc"

-- Hàm thực thi lệnh shell
local function exec(cmd)
    local handle = io.popen(cmd .. " 2>&1")
    local result = handle:read("*a")
    handle:close()
    return result or ""
end

-- Hàm giải mã UCS-2 Hex (Dữ liệu text)
local function ucs2_to_utf8(hex)
    if not hex or #hex < 4 or hex == "--" then return nil end
    local res = {}
    for i = 1, #hex, 4 do
        local code = tonumber(hex:sub(i, i+3), 16)
        if code then
            if code < 128 then table.insert(res, string.char(code))
            elseif code < 2048 then
                table.insert(res, string.char(192 + math.floor(code / 64), 128 + (code % 64)))
            elseif code < 65536 then
                table.insert(res, string.char(224 + math.floor(code / 4096), 128 + (math.floor(code / 64) % 64), 128 + (code % 64)))
            end
        end
    end
    return table.concat(res)
end

local function get_text_from_cli(sms_path_id)
    local id = sms_path_id:match("/SMS/(%d+)")
    if not id then return nil end
    
    -- Chống Command Injection: validate ID is numeric only
    local security = require "lib.security"
    if not security.is_valid_id(id) then
        return nil
    end
    
    local cmd = string.format("mmcli -s %s", id)
    local out = exec(cmd)
    local text = out:match("Content.-text:%s*([^\n]+)")
    if not text then text = out:match("text:%s*([^\n]+)") end
    if text then text = text:gsub("^'", ""):gsub("'$", "") end
    return text
end

-- TỰ ĐỘNG DÒ TÌM MODEM INDEX
local function get_current_modem_index()
    local out = exec("mmcli -L 2>/dev/null")
    local idx = out:match("/Modem/(%d+)")
    return idx or "0"
end


-- Helper: Locking mechanism to prevent poller conflict
local function lock_poller()
    local f = io.open("/tmp/modem_at.lock", "w")
    if f then f:write(tostring(os.time())); f:close() end
end

local function unlock_poller()
    os.remove("/tmp/modem_at.lock")
end

function M.send_sms(config, number, text)
    -- Chống Command Injection: validate inputs
    local security = require "lib.security"
    
    if not security.is_valid_phone(number) then
        return { status = "error", message = "Invalid phone number format" }
    end
    
    -- Sanitize SMS text
    text = security.sanitize_sms_text(text)
    if text == "" then
        return { status = "error", message = "Invalid or empty SMS text" }
    end
    
    -- LOCK POLLER
    lock_poller()
    -- Safety delay: 10s (Poller cycle takes ~6s, so 10s is safe)
    os.execute("sleep 10")
    
    local m_idx = get_current_modem_index()
    
    -- Escape arguments properly for shell
    local safe_text = security.escape_shell_arg(text)
    local safe_number = security.escape_shell_arg(number)

    local cmd = string.format("mmcli -m %s --messaging-create-sms=\"text=%s,number=%s,delivery-report-request=yes\"", m_idx, safe_text, safe_number)
    local create_out = exec(cmd)
    local sms_id = create_out:match("/SMS/(%d+)")

    local res = nil
    if sms_id then
        local send_cmd = "mmcli -s " .. sms_id .. " --send"
        local send_out = exec(send_cmd)
        if send_out and send_out:find("successfully sent") then
            res = { status = "success", message = "Sent via mmcli", id = sms_id }
        else
            res = { status = "error", message = "Failed to send", debug = send_out }
        end
    else
        res = { status = "error", message = "Could not create SMS", debug = create_out }
    end
    
    -- UNLOCK POLLER removed to allow 30s receive window
    -- unlock_poller()
    return res
end


function M.get_sms(config)
    local m_idx = get_current_modem_index()
    local messages = {}
    local list_cmd = string.format("mmcli -m %s --messaging-list-sms", m_idx)
    local list_out = exec(list_cmd)

    for sms_path in list_out:gmatch("/SMS/(%d+)") do
        local read_cmd = string.format("mmcli -s %s -J", sms_path)
        local read_out = exec(read_cmd)
        
        local ok, data = pcall(json.parse, read_out)
        if not ok then data = nil end
        
        if data and data.sms and data.sms.properties and data.sms.properties.state ~= "receiving" then
            local pdu_type = data.sms.properties["pdu-type"] or ""
            
            local sender_val = (data.sms.content and data.sms.content.number) or "Unknown"
            local text_val = ""
            local time_val = data.sms.properties.timestamp or ""
            local type_val = "received"
            local delivery_status = ""
            local is_status_report = (pdu_type == "status-report")

            -- Lấy nội dung tin nhắn
            if not is_status_report and data.sms.content then
                    text_val = data.sms.content.text or ""
                    
                    if (text_val == "" or text_val == "--") then
                         local raw_text = get_text_from_cli(sms_path)
                         if raw_text and raw_text ~= "" and raw_text ~= "--" then text_val = raw_text end
                    end
                    if (text_val == "" or text_val == "--") and data.sms.content.data and data.sms.content.data ~= "--" then
                         local decoded = ucs2_to_utf8(data.sms.content.data)
                         if decoded and decoded ~= "" then text_val = decoded end
                    end
                end

                if (text_val ~= "" and text_val ~= "--") or is_status_report then
                    local storage_val = data.sms.properties.storage or "unknown"
                    if data.sms.properties["pdu-type"] == "submit" or data.sms.properties.state == "sent" then
                        type_val = "sent"
                        delivery_status = data.sms.properties["delivery-state"] or "unknown"
                    end

                    if time_val == "--" then time_val = "" 
                    elseif #time_val > 18 then time_val = time_val:sub(1, 19):gsub("T", " ") end

                    local msg_obj = {
                        index = sms_path,
                        number = sender_val,
                        time = time_val,
                        text = text_val,
                        type = type_val,
                        direction = type_val, -- Synchronize with sync service
                        storage = storage_val,
                        status = delivery_status,
                        is_status_report = is_status_report
                    }
                    table.insert(messages, msg_obj)
                end
            end
        end
    
    table.sort(messages, function(a, b) return tonumber(a.index) > tonumber(b.index) end)
    
    return {
        messages = messages,
        storage = {
            used = #messages,
            total = 10 -- Adjusted to 10 as per user request
        }
    }
end

function M.delete_sms(config, index)
    local m_idx = get_current_modem_index()
    local res = exec(string.format("mmcli -m %s --messaging-delete-sms=%s", m_idx, index))
    if res and res:find("successfully deleted") then return { status = "success" }
    else return { status = "error", message = res } end
end

function M.delete_all_sms(config)
    local msgs = M.get_sms(config)
    for _, msg in ipairs(msgs) do M.delete_sms(config, msg.index) end
    return { status = "success" }
end

return M