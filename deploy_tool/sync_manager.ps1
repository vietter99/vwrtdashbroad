param(
    [switch]$Live
)

$RouterIP = "192.168.15.1"
$User = "root"
$LocalRoot = (Get-Item $PSScriptRoot).Parent.FullName
$RemoteRoot = "/www/vwrt"
$TempDir = "$PSScriptRoot\temp_dist"
$TarFile = "$PSScriptRoot\deploy.tar.gz"

# === HELPER FUNCTIONS ===
function Run-SSH {
    param($cmd)
    ssh -o StrictHostKeyChecking=no ${User}@${RouterIP} $cmd
}

function Sync-Everything {
    Write-Host ">>> VWRT OPTIMIZED DEPLOYMENT STARTED" -ForegroundColor Cyan
    
    # 1. Prepare Local Staging Area
    Write-Host "[1/5] Preparing local files..." -ForegroundColor Yellow
    if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
    New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
    
    # Copy all valid files to temp dir
    Get-ChildItem -Path $LocalRoot | Where-Object { $_.Name -notmatch "deploy_tool|dist|temp_dist|.git|.agent|.vscode|node_modules" } | ForEach-Object {
        if ($_.PSIsContainer) {
            Copy-Item -Path $_.FullName -Destination "$TempDir\$($_.Name)" -Recurse -Force
        } else {
            Copy-Item -Path $_.FullName -Destination "$TempDir\" -Force
        }
    }

    # 1.5 Sanitize Files (CRLF -> LF, Remove BOM)
    Write-Host "[1.5/5] Sanitizing file endings..." -ForegroundColor Yellow
    $Utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $False
    
    Get-ChildItem -Path $TempDir -Recurse -File | ForEach-Object {
        $ext = $_.Extension.ToLower()
        # Heuristic to identify text/script files that need fixing
        # All files in cgi-bin and services are likely scripts without extensions or with .lua
        $isScriptDir = ($_.FullName -match "\\cgi-bin\\" -or $_.FullName -match "\\services\\")
        $isTextFile = $ext -in ".lua", ".sh", ".js", ".css", ".html", ".json", ".conf"
        
        if ($isScriptDir -or $isTextFile) {
            try {
                # Read text (handles existing BOM or UTF8)
                $content = [System.IO.File]::ReadAllText($_.FullName)
                
                # Normalize line endings to LF
                if ($content -match "`r`n") {
                    $content = $content -replace "`r`n", "`n"
                }

                # Write back using UTF8-NoBOM
                [System.IO.File]::WriteAllText($_.FullName, $content, $Utf8NoBomEncoding)
            } catch {
                Write-Warning "Could not sanitize $($_.Name): $_"
            }
        }
    }

    # 2. Create Tarball
    Write-Host "[2/5] Creating compressed package..." -ForegroundColor Yellow
    # Check if tar is available (Windows 10+ has it)
    try {
        # -C changes to directory so we don't include the full path
        tar -czf $TarFile -C $TempDir .
    } catch {
        Write-Error "Error running tar. Make sure tar is installed or in PATH."
        return
    }

    # 3. Upload Tarball
    Write-Host "[3/5] Uploading package (Single Connection)..." -ForegroundColor Yellow
    scp -O -o StrictHostKeyChecking=no -q $TarFile "${User}@${RouterIP}:/tmp/deploy.tar.gz"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "SCP Failed. Check connection."
        return
    }

    # 4. Extract & Install on Router
    Write-Host "[4/5] Installing on router..." -ForegroundColor Yellow
    # We do a safe install: unpack to temp, then move? Or just overwrite?
    # Overwrite is fine for dev. 
    # Logic:
    # 1. Create target dir if missing.
    # 2. Unpack.
    # 3. Fix line endings (dos2unix equivalent using sed).
    # 4. Fix permissions.
    # 5. Restart services.
    
    $Cmd = "mkdir -p ${RemoteRoot}; " +
           "tar -xzf /tmp/deploy.tar.gz -C ${RemoteRoot}/; " +
           "rm /tmp/deploy.tar.gz; " +
           "find ${RemoteRoot}/cgi-bin ${RemoteRoot}/services -type f -exec chmod +x {} +; " +
           "find ${RemoteRoot}/cgi-bin ${RemoteRoot}/services -type f -exec sed -i 's/\r$//' {} +; " +
           "find ${RemoteRoot} -type f \( -name '*.lua' -o -name '*.sh' -o -name '*.js' -o -name '*.css' \) -exec sed -i 's/\r$//' {} +; " +
           "ln -sfn /www/luci-static ${RemoteRoot}/luci-static; " +
           "killall lua 2>/dev/null; " +
           "sleep 1; " +
           "${RemoteRoot}/services/mobile_poller.lua > /dev/null 2>&1 & " +
           "${RemoteRoot}/services/sms_sync.lua > /dev/null 2>&1 &"
           
    Run-SSH $Cmd
    
    # 5. Cleanup Local
    Remove-Item -Recurse -Force $TempDir
    Remove-Item -Force $TarFile

    # 6. Verify
    Write-Host "[5/5] Verifying..." -ForegroundColor Yellow
    Start-Sleep -Seconds 1
    $Check = Run-SSH "ps | grep mobile_poller | grep -v grep"

    if ($Check) {
        Write-Host "✅ DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
    } else {
        Write-Host "⚠️ SERVICE STARTED BUT NOT DETECTED (Might be sleeping)" -ForegroundColor Yellow
    }
}

function Global:Sync-Single-File {
    # Keep the single file sync for "Live Mode" as it is fast enough for 1 file.
    param($Path, $ChangeType)
    
    $RelPath = $Path.Substring($LocalRoot.Length)
    if ($RelPath.StartsWith("\")) { $RelPath = $RelPath.Substring(1) }
    
    # Similar logic to before for quick updates
    $RemotePath = "$RemoteRoot/" + $RelPath.Replace("\", "/")
    
    # Normalize slashes
    $RemotePath = $RemotePath.Replace("//", "/")

    if ($RelPath -match "deploy_tool|dist|.git|.agent|.vscode|temp_dist") { return }

    $Time = Get-Date -Format "HH:mm:ss"
    Write-Host "[$Time] ${ChangeType}: $RelPath" -NoNewline

    try {
        scp -O -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -q $Path "${User}@${RouterIP}:${RemotePath}"
        if ($LASTEXITCODE -eq 0) {
            Write-Host " -> OK" -ForegroundColor Green
            # Quick separate command for permission/CRLF if it's a script
            if ($RelPath -match "\.(lua|sh)$") {
                ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${User}@${RouterIP} "chmod +x $RemotePath; sed -i 's/\r$//' $RemotePath" 
                if ($RelPath -match "mobile_poller") {
                     ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${User}@${RouterIP} "killall lua 2>/dev/null; /www/vwrt/services/mobile_poller.lua > /dev/null 2>&1 &"
                }
            }
        } else { Write-Host " -> FAIL" -ForegroundColor Red }
    } catch { Write-Host " -> ERR: $_" -ForegroundColor Red }
}

# === MAIN LOGIC ===

# Always do a full sync first
Sync-Everything

if ($Live) {
    Write-Host "`n>>> LIVE SYNC MODE ACTIVE" -ForegroundColor Cyan
    Write-Host "Watching: $LocalRoot" -ForegroundColor Gray
    Write-Host "Press Ctrl+C to stop.`n" -ForegroundColor DarkGray

    $watcher = New-Object System.IO.FileSystemWatcher
    $watcher.Path = $LocalRoot
    $watcher.IncludeSubdirectories = $true
    $watcher.EnableRaisingEvents = $true

    Register-ObjectEvent $watcher "Changed" -Action { Sync-Single-File $Event.SourceEventArgs.FullPath "Modified" } | Out-Null
    Register-ObjectEvent $watcher "Created" -Action { Sync-Single-File $Event.SourceEventArgs.FullPath "Created" } | Out-Null
    
    while ($true) { Start-Sleep -Milliseconds 500 }
}
