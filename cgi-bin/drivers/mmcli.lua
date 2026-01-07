local M = {}
local json = require "luci.jsonc"

local function exec(cmd)
    local handle = io.popen(cmd .. " 2>&1")
    local result = handle:read("*a")
    handle:close()
    return result or ""
end

function M.send_sms(config, number, text)
    local m_idx = "0"
    if config.modem_index then
        m_idx = config.modem_index
    else
        local handle = io.popen("mmcli -L 2>/dev/null")
        local output = handle:read("*a")
        handle:close()
        m_idx = output:match("/Modem/(%d+)") or "0"
    end

    local safe_text = text:gsub("'", "'\\''")
    local safe_number = number:gsub("'", "")

    local create_cmd = string.format("mmcli -m %s --messaging-create-sms=\"text='%s',number='%s'\"", m_idx, safe_text, safe_number)
    local create_out = exec(create_cmd)
    local sms_id = create_out:match("/SMS/(%d+)")

    if sms_id then
        local send_cmd = "mmcli -s " .. sms_id .. " --send"
        local send_out = exec(send_cmd)
        if send_out and send_out:find("successfully sent") then
            return { status = "success", message = "Sent via mmcli", id = sms_id }
        else
            return { status = "error", message = "Created but failed to send", debug = send_out }
        end
    else
        return { status = "error", message = "Could not create SMS", debug = create_out }
    end
end

function M.get_sms(config)
    local m_idx = config.modem_index or "0"
    local messages = {}
    
    local list_cmd = string.format("mmcli -m %s --messaging-list-sms", m_idx)
    local list_out = exec(list_cmd)

    for sms_path in list_out:gmatch("/SMS/(%d+)") do
        local read_cmd = string.format("mmcli -s %s -J", sms_path)
        local read_out = exec(read_cmd)
        
        local data = json.parse(read_out)
        
        local sender_val = "Unknown"
        local text_val = ""
        local time_val = ""
        local type_val = "received"
        
        if data and data.sms then
            if data.sms.content then
                sender_val = data.sms.content.number or "Unknown"
                text_val = data.sms.content.text or ""
            end
            if data.sms.properties then
                -- Lấy thời gian gốc
                time_val = data.sms.properties.timestamp or ""
                
                -- XỬ LÝ LÀM ĐẸP TIME
                if time_val == "--" then 
                    time_val = "" -- Nếu là -- thì để rỗng cho Web tự xử lý
                elseif #time_val > 18 then
                    -- Cắt chuỗi ISO: 2026-01-05T20:58:52+07 -> 2026-01-05 20:58:52
                    time_val = time_val:sub(1, 19):gsub("T", " ")
                end
                
                -- Kiểm tra loại tin (nếu pdu-type là submit thì là tin gửi đi)
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
    local m_idx = "0"
    if config.modem_index then
        m_idx = config.modem_index
    else
        local handle = io.popen("mmcli -L 2>/dev/null")
        local output = handle:read("*a")
        handle:close()
        m_idx = output:match("/Modem/(%d+)") or "0"
    end

    local cmd = string.format("mmcli -m %s --messaging-delete-sms=%s", m_idx, index)
    os.execute(cmd)
    
    return { status = "success" }
end

return M