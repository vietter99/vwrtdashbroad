# make_release.ps1
# Script to create a clean .tar.gz release package for VWRT Dashboard

$ProjectRoot = Get-Location
$Version = (Get-Content "$ProjectRoot\version.json" | ConvertFrom-Json).dashboard.version
$ReleaseName = "vwrtdashboard-v$Version"
$DistDir = "$ProjectRoot\dist"
$TarFile = "$ProjectRoot\$ReleaseName.tar.gz"

Write-Host ">>> Creating Release Package for version $Version" -ForegroundColor Cyan

# 1. Cleanup old dist
if (Test-Path $DistDir) { Remove-Item -Recurse -Force $DistDir }
New-Item -ItemType Directory -Path $DistDir | Out-Null

# 2. Copy files to dist (Following the Flattened Structure)
Write-Host "[1/3] Gathering files..."
# Everything except development tools, artifacts, and editor configs
$ExcludeList = "deploy_tool|dist|.git|.agent|.vscode|.tar.gz|.zip|make_release.ps1|.editorconfig"
Get-ChildItem -Path $ProjectRoot | Where-Object { $_.Name -notmatch $ExcludeList } | ForEach-Object {
    if ($_.PSIsContainer) {
        Copy-Item -Path $_.FullName -Destination "$DistDir\$($_.Name)" -Recurse -Force
    } else {
        Copy-Item -Path $_.FullName -Destination "$DistDir\" -Force
    }
}

# 3. Create Tarball using WSL (to preserve Linux permissions)
Write-Host "[2/3] Packing into .tar.gz (via WSL)..."
# Fix: Use forward slashes for WSL compatibility
$WslDistPath = $(wsl wslpath "$($DistDir.Replace('\','/'))").Trim()
$WslOutputPath = $(wsl wslpath "$($TarFile.Replace('\','/'))").Trim()

# Run tar in WSL
wsl tar -czf $WslOutputPath -C $WslDistPath .

# 4. Cleanup
Write-Host "[3/3] Finalizing..."
# Remove-Item -Recurse -Force $DistDir

Write-Host "`nSUCCESS: Release package created at: $TarFile" -ForegroundColor Green
Write-Host "You can now upload this file to your GitHub Releases."
