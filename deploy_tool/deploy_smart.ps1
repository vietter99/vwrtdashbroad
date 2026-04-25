$sourceRoot = "c:\Users\Vietter\Desktop\cv\dev\vwrt"
$destRoot = "\\wsl.localhost\Ubuntu-20.04\home\v\zx798x\files\www\vwrt"

Write-Host "Starting Smart Deployment..."
Write-Host "Source: $sourceRoot"
Write-Host "Dest:   $destRoot"

# Function to copy and convert
function Deploy-Folder ($srcPath, $dstPath) {
    if (!(Test-Path $srcPath)) { Write-Warning "Source path not found: $srcPath"; return }
    if (!(Test-Path $dstPath)) { New-Item -ItemType Directory -Force -Path $dstPath | Out-Null }
    
    # Robocopy with /MIR might be dangerous if we are merging into root. 
    # Use /E (Copy subdirectories) and manual LF conversion.
    # We use Robocopy for speed, but be careful not to purge unrelated files if merging frontend to root.
    # Actually, frontend content IS the root content essentially.
    
    robocopy $srcPath $dstPath /E /FFT /NP /R:3 /W:1 /XO
}

# 0. Cleanup Destination (Mandatory for Clean Sync)
Write-Host "`n[0/3] Cleaning up destination (WSL)..."
try {
    # Use WSL's rm -rf as root to avoid permission issues and "Directory not empty" errors
    $wslDistro = "Ubuntu-20.04"
    $linuxPath = "/home/v/zx798x/files/www/vwrt"
    wsl -d $wslDistro -u root -- bash -c "rm -rf $linuxPath/*"
    Write-Host "Old files removed via WSL (Root)."
} catch {
    Write-Warning "Cleanup failed, trying PowerShell..."
    if (Test-Path $destRoot) {
        Get-ChildItem -Path $destRoot | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 1. Deploy Frontend (Root files, js, css)
Write-Host "`n[1/3] Deploying Frontend..."
# We copy everything except backend, deployment tools, git files, and docs
$excludeList = "^(cgi-bin|services|deploy_tool|dist|.git.*|.agent|.vscode|.editorconfig|README.md|LICENSE|package.*)$"
Get-ChildItem -Path $sourceRoot | Where-Object { $_.Name -notmatch $excludeList } | ForEach-Object {
    if ($_.PSIsContainer) {
        Deploy-Folder $_.FullName "$destRoot\$($_.Name)"
    } else {
        Copy-Item $_.FullName "$destRoot\" -Force
    }
}

# 2. Deploy Backend API & Services
Write-Host "`n[2/3] Deploying Backend API & Services..."
Deploy-Folder "$sourceRoot\cgi-bin" "$destRoot\cgi-bin"
Deploy-Folder "$sourceRoot\services" "$destRoot\services"

# 2.1 Copy version.json (already handled by loop above, but to be explicit if needed)
# Copy-Item "$sourceRoot\version.json" "$destRoot\version.json" -Force

# 3. LF Conversion (Crucial for Linux)
Write-Host "`n[3/3] Enforcing LF Line Endings..."
$extensions = @(".lua", ".sh", ".cgi", ".js", ".css", ".html", ".json", ".conf")

Get-ChildItem -Path $destRoot -Recurse -File | ForEach-Object {
    # Skip symlinks/reparse points as they can't be read easily over UNC and don't need LF fix
    if ($_.Attributes -match "ReparsePoint") { return }
    
    if ($extensions -contains $_.Extension -or [string]::IsNullOrEmpty($_.Extension)) {
        $path = $_.FullName
        # Use Get-Content -Raw for better compatibility with network/UNC paths
        $content = Get-Content -Path $path -Raw
        
        # Check if contains CRLF
        if ($content -match "`r`n") {
            try {
                $newContent = $content.Replace("`r`n", "`n")
                $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
                [IO.File]::WriteAllText($path, $newContent, $utf8NoBom)
                Write-Host "Converted: $path"
            } catch {
                Write-Error "Error converting $path"
            }
        }
    }
}

# 4. Set Permissions (chmod +x)
Write-Host "`n[4/4] Setting Linux permissions (chmod +x)..."
try {
    # Convert Windows network path to WSL path
    # \\wsl.localhost\Ubuntu-20.04\home\v\... -> /home/v/...
    $wslDistro = "Ubuntu-20.04"
    $wslUser = "v"
    $linuxPath = "/home/v/zx798x/files/www/vwrt"
    
    # Run chmod via WSL
    wsl -d $wslDistro -u root -- bash -c "chmod -R +x $linuxPath/cgi-bin $linuxPath/services"
    # Fix LuCI 404 when home is /www/vwrt
    wsl -d $wslDistro -u root -- bash -c "ln -snf /www/luci-static $linuxPath/luci-static"
    Write-Host "Permissions and LuCI symlink set successfully!"
} catch {
    Write-Warning "Could not set permissions via WSL automatically. Please run: chmod -R +x cgi-bin services inside WSL."
}

Write-Host "`nDeployment Completed!"
