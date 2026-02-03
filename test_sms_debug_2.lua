package.path = "/www/vwrt/?.lua;/www/vwrt/cgi-bin/?.lua;" .. package.path
local driver = require "drivers.mmcli"
local json = require "luci.jsonc"

-- Redefine internal exec to debug
local function exec(cmd)
    local f = io.popen(cmd)
    local c = f:read("*all")
    f:close()
    return c
end

print("DEBUG MANUAL RUN:")
local list_out = exec("mmcli -m 0 --messaging-list-sms")
print("List Output: " .. list_out)

for sms_path in list_out:gmatch("/SMS/(%d+)") do
    print("Found SMS entry: " .. sms_path)
    local read_out = exec("mmcli -s " .. sms_path .. " -J")
    local ok, data = pcall(json.parse, read_out)
    
    if ok and data and data.sms and data.sms.properties then
        local st = data.sms.properties.state
        print("   State: " .. tostring(st))
        if st ~= "receiving" then
             print("   -> ACCEPTED")
        else
             print("   -> REJECTED (receiving)")
        end
    else
        print("   -> FAILED PARSE or NO PROPERTIES")
    end
end
