$source = "c:\Users\Vietter\Desktop\cv\dev\vwrt"
$destinations = @(
    "\\wsl.localhost\Ubuntu-20.04\home\v\zx7981\files\www\vwrt",
    "\\wsl.localhost\Ubuntu-20.04\home\v\x-wrt\package\base-files\files\www\vwrt"
)

# List of directories to exclude from sync
$excludeDirs = @(".git", ".gemini", "tmp", "deploy_tool", ".agent", ".vscode", "node_modules")
$excludeFiles = @(".editorconfig", ".gitattributes", ".gitignore", "README.md", "task.md", "implementation_plan.md", "walkthrough.md")

Write-Host "Starting Deep Permission Sync to WSL (Reliable Mode)..." -ForegroundColor Cyan

foreach ($dest in $destinations) {
    Write-Host "`n>>> Processing Destination: $dest" -ForegroundColor Yellow
    
    $wslPath = $dest -replace "^\\\\wsl\.localhost\\[^\\]+", "" -replace "\\", "/"
    $distro = "Ubuntu-20.04"

    # 1. Clean Replacement
    Write-Host "Cleaning target directory via WSL: $wslPath"
    if ($wslPath -match "^/(home|var|tmp|root|mnt)/") {
        wsl -d $distro rm -rf "$wslPath"
        wsl -d $distro mkdir -p "$wslPath"
    } else {
        Write-Error "WSL path seems suspicious: $wslPath"
        continue
    }

    # 2. Copy Files
    Write-Host "Syncing essential files..."
    robocopy $source $dest /MIR /FFT /NP /XD $excludeDirs /XF $excludeFiles /R:2 /W:5
    
    if ($LASTEXITCODE -ge 8) {
        Write-Error "Robocopy failed at $dest"
        continue
    }

    # 3. Restore Symlinks & System Scripts
    Write-Host "Syncing system scripts (init.d) to build trees..."
    # Determine the "files" root (parent of /www)
    # If $dest is .../files/www/vwrt, then files root is .../files/
    $filesRoot = ($dest -split "\\www\\vwrt")[0]
    $etcInitDir = Join-Path $filesRoot "etc\init.d"
    
    if (Test-Path -Path (Join-Path $source "services\init.d")) {
        $etcWslPath = ($etcInitDir -replace "^\\\\wsl\.localhost\\[^\\]+", "" -replace "\\", "/")
        wsl -d $distro -u root mkdir -p $etcWslPath
        Get-ChildItem -Path (Join-Path $source "services\init.d") -File | ForEach-Object {
            $targetFileWsl = "$etcWslPath/$($_.Name)"
            # Use wsl to write content to bypass permission issues on root-owned folders
            Get-Content $_.FullName | wsl -d $distro -u root sh -c "tr -d '\r' > $targetFileWsl"
            Write-Host "  -> Installed sys-init: $($_.Name)"
        }
    }

    # 3.1 Sync uci-defaults (For automatic enable on first boot)
    $uciDefaultsWslDir = Join-Path $filesRoot "etc\uci-defaults"
    if (Test-Path -Path (Join-Path $source "services\uci-defaults")) {
        $uciWslPath = ($uciDefaultsWslDir -replace "^\\\\wsl\.localhost\\[^\\]+", "" -replace "\\", "/")
        wsl -d $distro -u root mkdir -p $uciWslPath
        Get-ChildItem -Path (Join-Path $source "services\uci-defaults") -File | ForEach-Object {
            $targetFileWsl = "$uciWslPath/$($_.Name)"
            # Use wsl to write content to bypass permission issues on root-owned folders
            Get-Content $_.FullName | wsl -d $distro -u root sh -c "tr -d '\r' > $targetFileWsl"
            Write-Host "  -> Installed uci-default: $($_.Name)"
        }
    }

    Write-Host "Restoring symlinks..."
    # Ensure local dummy target exists (requires root for /www)
    wsl -d $distro -u root mkdir -p /www/luci-static
    wsl -d $distro ln -sfn /www/luci-static "$wslPath/luci-static"
    
    # 4. Deep Permissions & LF Conversion
    Write-Host "Applying recursive chmod +x and LF conversion..."
    
    # Simpler way to set execution bit for scripts
    wsl -d $distro chmod -R +x "$wslPath/cgi-bin"
    wsl -d $distro chmod -R +x "$wslPath/services"
    
    wsl -d $distro -u root chmod -R +x "$etcWslPath"
    wsl -d $distro -u root chmod -R +x "$uciWslPath"
    
    # Standard LF conversion for text files
    $extensions = @(".lua", ".sh", ".cgi", ".js", ".css", ".html", ".json", ".conf")
    Get-ChildItem -Path $dest -Recurse -File | ForEach-Object {
        if ($extensions -contains $_.Extension -or $_.Name -eq "luci") {
            try {
                $content = [IO.File]::ReadAllText($_.FullName)
                if ($content -match "`r`n") {
                    $newContent = $content -replace "`r`n", "`n"
                    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
                    [IO.File]::WriteAllText($_.FullName, $newContent, $utf8NoBom)
                }
            } catch {
                Write-Warning "Failed to convert LF: $($_.Name)"
            }
        }
    }
}

Write-Host "`nDeep Sync & Permission Fix Completed Successfully!" -ForegroundColor Green
