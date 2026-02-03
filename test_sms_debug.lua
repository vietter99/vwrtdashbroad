package.path = "/www/vwrt/?.lua;/www/vwrt/cgi-bin/?.lua;" .. package.path
local driver = require "drivers.mmcli"
print("Driver loaded")

local config = {modem_index = "0"}
local result = driver.get_sms(config)
print("Get SMS Result Status: " .. type(result))

if result and result.messages then
    print("Get SMS Count: " .. #result.messages)
    for i, msg in ipairs(result.messages) do
        print("Msg Index: " .. tostring(msg.index))
        print("   Storage: " .. tostring(msg.storage))
        print("   Text: " .. tostring(msg.text))
        
        -- Try delete simulation
        local st = string.upper(msg.storage or "NIL")
        print("   Upper Storage: " .. st)
        if msg.index and (st == "SM" or st == "ME" or st == "MT") then
             print("   -> WOULD DELETE: " .. msg.index)
        else
             print("   -> SKIP DELETE")
        end
    end
else
    print("Result.messages is nil")
end
