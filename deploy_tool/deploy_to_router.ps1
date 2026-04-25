# Router Deployment Script for VWRT (High-Fidelity Binary Transfer)
# Usage: .\deploy_to_router.ps1 [-Force]

param(
    [switch]$Force
)

$routerIp = "192.168.15.1"
$routerUser = "root"
$remoteRoot = "/www/vwrt"
$localRoot = Get-Location
$syncMarker = Join-Path $localRoot ".last_sync"

$lastSyncTime = [DateTime]::MinValue
if (Test-Path $syncMarker) {
    $lastSyncTime = Get-Date (Get-Content $syncMarker)
}

if ($Force) {
    Write-Host ">>> FORCE SYNC: Redploying all files..." -ForegroundColor Magenta
    $lastSyncTime = [DateTime]::MinValue
}

$excludeDirs = @(".git", ".gemini", "tmp", "deploy_tool", ".agent", ".vscode", "node_modules")
$excludeFiles = @(".editorconfig", ".gitattributes", ".gitignore", "README.md", "task.md", "implementation_plan.md", "walkthrough.md")

Write-Host ">>> Starting Smart Deployment to Router ($routerIp)..." -ForegroundColor Cyan
if ($lastSyncTime -ne [DateTime]::MinValue) {
    Write-Host ">>> Last sync was at: $lastSyncTime. Only modified files will be sent." -ForegroundColor Gray
}

function Publish-File {
    param($localPath, $remotePath)
    Write-Host "Deploying: $localPath -> $remotePath" -ForegroundColor Green
    $remoteDir = $remotePath.Substring(0, $remotePath.LastIndexOf("/"))
    ssh -o StrictHostKeyChecking=no "$routerUser@$routerIp" "mkdir -p $remoteDir"
    scp -O -o StrictHostKeyChecking=no $localPath "$routerUser@$routerIp`:$remotePath"
}

# 1. Folders to process
$folders = @(".", "cgi-bin", "services", "lib", "js", "css", "img")
$deployCount = 0

foreach ($folder in $folders) {
    $localFolder = Join-Path $localRoot $folder
    if (Test-Path $localFolder) {
        Get-ChildItem -Path $localFolder -Recurse -File | ForEach-Object {
            # Skip excluded files
            if ($excludeFiles -contains $_.Name) { return }
            
            if ($_.LastWriteTime -gt $lastSyncTime) {
                $relativePath = $_.FullName.Substring($localRoot.Path.Length + 1).Replace("\", "/")
                $remotePath = "$remoteRoot/$relativePath"
                
                # Prevent root files from being put into wrong subfolders if we are in "." loop
                if ($folder -eq "." -and $_.Directory.Name -ne (Split-Path $localRoot -Leaf)) { return }
                
                Publish-File $_.FullName $remotePath
                $deployCount++
            }
        }
    }
}

# 2. Finish
if ($deployCount -gt 0) {
    Get-Date | Out-File $syncMarker
    Write-Host "`n>>> $deployCount files copied successfully!" -ForegroundColor Green
} else {
    Write-Host "`n>>> No changes detected." -ForegroundColor Gray
}
