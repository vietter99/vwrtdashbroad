@echo off
title VWRT Deploy Tool
cls
echo ==================================================
echo        VWRT DEPLOYMENT TOOL (All-in-One)
echo ==================================================
echo.
echo 1. Sync 1 Lan (Full Deployment)
echo 2. Sync Tu Dong (Live Watcher)
echo.
set /p opt="Chon che do (1/2): "

if "%opt%"=="1" goto run_once
if "%opt%"=="2" goto run_live
goto end

:run_once
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync_manager.ps1"
goto end

:run_live
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync_manager.ps1" -Live
goto end

:end
echo.
echo XONG!
pause
