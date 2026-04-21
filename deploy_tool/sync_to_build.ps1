$sourceRoot = "c:\Users\Vietter\Desktop\cv\dev\vwrt"
$destRoot = "\\wsl.localhost\Ubuntu-20.04\home\v\x-wrt\package\base-files\files\www\vwrt"

Write-Host ">>> SYNC TO BUILD STARTED" -ForegroundColor Cyan
Write-Host "Source: $sourceRoot"
Write-Host "Dest:   $destRoot"

# 0. Cleanup Destination (Mandatory for Clean Sync)
Write-Host "`n[0/4] Cleaning up destination..."
if (Test-Path $destRoot) {
    Remove-Item -Recurse -Force $destRoot
}
New-Item -ItemType Directory -Force -Path $destRoot | Out-Null

# 1. Deploy Frontend (Root files, js, css)
Write-Host "[1/4] Deploying files..."
$excludeList = "^(deploy_tool|dist|.git.*|.agent|.vscode|.editorconfig|package.*)$"

# Copy core folders and files
Get-ChildItem -Path $sourceRoot | Where-Object { $_.Name -notmatch $excludeList } | ForEach-Object {
    if ($_.PSIsContainer) {
        robocopy $_.FullName "$destRoot\$($_.Name)" /E /FFT /NP /R:3 /W:1 /XO | Out-Null
    } else {
        Copy-Item $_.FullName "$destRoot\" -Force
    }
}

# 2. LF Conversion (Crucial for Linux Build)
Write-Host "[2/4] Enforcing LF Line Endings..."
$extensions = @(".lua", ".sh", ".cgi", ".js", ".css", ".html", ".json", ".conf")

Get-ChildItem -Path $destRoot -Recurse -File | ForEach-Object {
    if ($_.Attributes -match "ReparsePoint") { return }
    if ($extensions -contains $_.Extension -or [string]::IsNullOrEmpty($_.Extension)) {
        $path = $_.FullName
        $content = Get-Content -Path $path -Raw
        if ($content -match "`r`n") {
            try {
                $newContent = $content.Replace("`r`n", "`n")
                $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
                [IO.File]::WriteAllText($path, $newContent, $utf8NoBom)
            } catch {
                Write-Error "Error converting $path"
            }
        }
    }
}

# 3. Set Permissions (chmod +x)
Write-Host "[3/4] Setting Linux permissions via WSL..."
try {
    $wslDistro = "Ubuntu-20.04"
    $linuxPath = "/home/v/x-wrt/package/base-files/files/www/vwrt"
    wsl -d $wslDistro -u root -- bash -c "chmod -R +x $linuxPath/cgi-bin $linuxPath/services"
    Write-Host "Permissions set successfully!"
} catch {
    Write-Warning "Could not set permissions via WSL automatically."
}

Write-Host "`nSync to Build Completed! ✅"
