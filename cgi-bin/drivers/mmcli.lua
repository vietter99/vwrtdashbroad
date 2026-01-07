local M = {}
local json = require "luci.jsonc"

local function exec(cmd)
    local handle = io.popen(cmd .. " 2>&1")
    local result = handle:read("*a")
    handle:close()
    return result or ""
end

local function decode_hex_data(hex)
    if not hex or hex == "" or hex == "--" then return nil end
    if hex:match("[^0-9a-fA-F]") then return hex end

    local result = ""
    for i = 1, #hex, 4 do
        local chunk = hex:sub(i, i+3)
        if #chunk == 4 then
            local code = tonumber(chunk, 16)
            if code then
                if code < 128 then
                    result = result .. string.char(code)
                else
                    result = result .. "&#" .. code .. ";"
                end
            end
        end
    end
    return result
end

function M.send_sms(config, number, text)
    local m_idx = config.modem_index or "0"
    if m_idx == "0" or m_idx == "" then
        local out = exec("mmcli -L 2>/dev/null")
        m_idx = out:match("/Modem/(%d+)") or "0"
    end

    local safe_text = text:gsub("'", "'\\''")
    local safe_number = number:gsub("'", "")

    local cmd = string.format("mmcli -m %s --messaging-create-sms=\"text='%s',number='%s'\"", m_idx, safe_text, safe_number)
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
        
        local sender_val = "Unknown"
        local text_val = ""
        local time_val = ""
        local type_val = "received"
        
        if data and data.sms then
            if data.sms.content then
                sender_val = data.sms.content.number or "Unknown"
                text_val = data.sms.content.text or ""
                
                if (text_val == "" or text_val == "--") then
                    if data.sms.content.data and data.sms.content.data ~= "--" then
                        local decoded = decode_hex_data(data.sms.content.data)
                        if decoded and decoded ~= "" then
                            text_val = decoded
                        else
                            text_val = "(Hex): " .. data.sms.content.data
                        end
                    else
                        text_val = "(Tin nhắn rỗng hoặc không hỗ trợ)"
                    end
                end
            end

            if data.sms.properties then
                time_val = data.sms.properties.timestamp or ""
                if time_val == "--" then time_val = "" 
                elseif #time_val > 18 then
                    time_val = time_val:sub(1, 19):gsub("T", " ")
                end
                
                if data.sms.properties["pdu-type"] == "submit" then
                    type_val = "sent"
                end
            end
        end
        
        table.insert(messages, {
            index = sms_path,
            number = sender_val,
            time = time_val,
            text = text_val,
            type = type_val 
        })
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
    exec(string.format("mmcli -m %s --messaging-delete-sms=%s", m_idx, index))
    return { status = "success" }
end

function M.delete_all_sms(config)
    local msgs = M.get_sms(config)
    for _, msg in ipairs(msgs) do
        M.delete_sms(config, msg.index)
    end
    return { status = "success" }
end

return M