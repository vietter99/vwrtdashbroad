#!/usr/bin/lua
-- ============================================
-- VWRT Constants Library
-- ============================================
-- Centralized configuration for all file paths,
-- cache locations, and system constants.
-- This prevents hardcoding and makes maintenance easier.

local M = {}

M.VERSION = "1.1.2"

-- ============================================
-- FILE PATHS
-- ============================================
M.PATHS = {
    -- Cache Files (Temporary data storage)
    MOBILE_CACHE      = "/tmp/vwrt_mobile.json",
    MOBILE_CACHE_TEMP = "/tmp/vwrt_mobile_temp.json",
    SYSTEM_CACHE      = "/tmp/sysinfo_output.json",
    SMS_CACHE         = "/tmp/vwrt_sms.json",
    SMS_ARCHIVE       = "/overlay/vwrt_sms_archive.json",
    CPU_STAT          = "/tmp/cpu_last_stat",
    
    -- Configuration Files
    LED_CONFIG      = "/etc/vwrt_led.json",
    AUTO_LED_CONFIG = "/etc/vwrt_autoled.json",
    CLIENTS_CONFIG  = "/etc/config/vwrt",
    
    -- Lock Files
    MODEM_AT_LOCK   = "/tmp/modem_at.lock",
    
    -- System Info
    SYSINFO_MODEL   = "/tmp/sysinfo/model",
}

return M
