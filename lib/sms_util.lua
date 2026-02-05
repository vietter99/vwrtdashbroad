local M = {}

-- Standardized Fingerprint generation
-- Using Number, Time, and first 20 chars of content (no whitespace)
function M.get_fingerprint(msg)
    if not msg then return nil end
    local number = tostring(msg.number or "ukn")
    local time = tostring(msg.time or "0000-00-00 00:00:00")
    -- Standardize time: Keep only digits to avoid format differences (T, space, /, -)
    time = time:gsub("%D", "")
    
    -- Standardize number: Remove leading '+' or '00' to match different reporting formats
    number = number:gsub("^%+", ""):gsub("^00", "")
    local text = tostring(msg.text or "")
    
    -- Clean text for fingerprint (remove whitespace, limit 20 chars)
    local clean_text = text:gsub("%s+", ""):sub(1, 20)
    
    return string.format("%s_%s_%s", number, time, clean_text)
end

return M
