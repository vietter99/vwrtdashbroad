# fix_formatting.ps1
$ProjectRoot = Get-Location
# Directories to scan recursively
$TargetDirs = @(".", "cgi-bin", "services", "js", "css", "lib") 

foreach ($d in $TargetDirs) {
    $Path = Join-Path $ProjectRoot $d
    if (Test-Path $Path) {
        Write-Host "Scanning: $Path"
        # Process files recursively, excluding binaries/packages
        Get-ChildItem -Path $Path -Recurse -File | Where-Object { 
            $_.FullName -notmatch "node_modules|\.git|dist|\.tar\.gz|\.zip|\.webp|\.png|\.jpg|\.ico" 
        } | ForEach-Object {
            $Content = [System.IO.File]::ReadAllText($_.FullName)
            # Deep Clean: Remove all carriage returns (\r) completely.
            # This handles both \r\n (converting to \n) and lone \r.
            $NewContent = $Content.Replace("`r", "")
            
            # Write if changed or to ensure NO BOM
            $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
            
            [System.IO.File]::WriteAllText($_.FullName, $NewContent, $Utf8NoBom)
            if ($Content.Length -ne $NewContent.Length -or $Content -ne $NewContent) {
                Write-Host "Deep Fixed (LF only): $($_.FullName)" -ForegroundColor Yellow
            }
        }
    }
}
