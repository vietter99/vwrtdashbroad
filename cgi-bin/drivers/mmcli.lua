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

-- Hàm lấy text từ CLI
local function get_text_from_cli(sms_path_id)
    local id = sms_path_id:match("/SMS/(%d+)")
    if not id then return nil end
    local cmd = string.format("mmcli -s %s", id)
    local out = exec(cmd)
    local text = out:match("Content.-text:%s*([^\n]+)")
    if not text then text = out:match("text:%s*([^\n]+)") end
    if text then text = text:gsub("^'", ""):gsub("'$", "") end
    return text
end

function M.send_sms(config, number, text)
    local m_idx = config.modem_index or "0"
    if m_idx == "0" or m_idx == "" then
        local out = exec("mmcli -L 2>/dev/null")
        m_idx = out:match("/Modem/(%d+)") or "0"
    end

    local safe_text = text:gsub("'", "'\\''")
    local safe_number = number:gsub("'", "")

    -- THAY ĐỔI: Thêm cờ 'delivery-report-request=yes'
    local cmd = string.format("mmcli -m %s --messaging-create-sms=\"text='%s',number='%s',delivery-report-request=yes\"", m_idx, safe_text, safe_number)
    local create_out = exec(cmd)
    local sms_id = create_out:match("/SMS/(%d+)")

    if sms_id then
        local send_cmd = "mmcli -s " .. sms_id .. " --send"
        local send_out = exec(send_cmd)
        if send_out and send_out:find("successfully sent") then
            return { status = "success", message = "Sent via mmcli", id = sms_id }
        else
            return { status = "error", message = "Failed to send", debug = send_out }
        end
    else
        return { status = "error", message = "Could not create SMS", debug = create_out }
    end
end

function M.get_sms(config)
    local m_idx = config.modem_index or "0"
    if m_idx == "0" or m_idx == "" then
        local out = exec("mmcli -L 2>/dev/null")
        m_idx = out:match("/Modem/(%d+)") or "0"
    end

    local messages = {}
    local list_cmd = string.format("mmcli -m %s --messaging-list-sms", m_idx)
    local list_out = exec(list_cmd)

    for sms_path in list_out:gmatch("/SMS/(%d+)") do
        local read_cmd = string.format("mmcli -s %s -J", sms_path)
        local read_out = exec(read_cmd)
        
        local ok, data = pcall(json.parse, read_out)
        if not ok then data = nil end
        
        -- Lọc tin nhắn đang nhận
        local state_val = "unknown"
        if data and data.sms and data.sms.properties then
            state_val = data.sms.properties.state or "unknown"
        end

        if state_val ~= "receiving" then
            local sender_val = "Unknown"
            local text_val = ""
            local time_val = ""
            local type_val = "received"
            local delivery_status = "" -- Thêm biến trạng thái giao hàng

            if data and data.sms then
                if data.sms.content then
                    sender_val = data.sms.content.number or "Unknown"
                    text_val = data.sms.content.text or ""
                    
                    if (text_val == "" or text_val == "--") then
                         local raw_text = get_text_from_cli(sms_path)
                         if raw_text and raw_text ~= "" and raw_text ~= "--" then text_val = raw_text end
                    end
                    if (text_val == "" or text_val == "--") and data.sms.content.data and data.sms.content.data ~= "--" then
                         local decoded = ucs2_to_utf8(data.sms.content.data)
                         if decoded and decoded ~= "" then text_val = decoded end
                    end
                    if text_val == "" or text_val == "--" then text_val = "(Tin nhắn rỗng)" end
                end

                if data.sms.properties then
                    time_val = data.sms.properties.timestamp or ""
                    if time_val == "--" then time_val = "" 
                    elseif #time_val > 18 then time_val = time_val:sub(1, 19):gsub("T", " ") end
                    
                    if data.sms.properties["pdu-type"] == "submit" then
                        type_val = "sent"
                        -- THAY ĐỔI: Lấy trạng thái giao hàng
                        delivery_status = data.sms.properties["delivery-state"] or "unknown"
                    end
                end
            end
            
            table.insert(messages, {
                index = sms_path,
                number = sender_val,
                time = time_val,
                text = text_val,
                type = type_val,
                status = delivery_status -- Trả về frontend
            })
        end
    end
    
    table.sort(messages, function(a, b) return tonumber(a.index) > tonumber(b.index) end)
    return messages
end

function M.delete_sms(config, index)
    local m_idx = config.modem_index or "0"
    if m_idx == "0" or m_idx == "" then
        local out = exec("mmcli -L 2>/dev/null")
        m_idx = out:match("/Modem/(%d+)") or "0"
    end
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