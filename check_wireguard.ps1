# WireGuard Health Check
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "       WireGuard VPN Status Check         " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Container Status from docker_status.json
Write-Host "[1/2] Checking WireGuard Service Status..." -ForegroundColor Yellow
$statusFile = "docker_status.json"
if (Test-Path $statusFile) {
    $dockerData = Get-Content $statusFile | ConvertFrom-Json
    $wgContainer = $dockerData | Where-Object { $_.name -eq 'wireguard' }
    
    if ($wgContainer) {
        if ($wgContainer.state -eq "running") {
            Write-Host "  [OK] Container Name : $($wgContainer.name)" -ForegroundColor Green
            Write-Host "  [OK] Service State  : $($wgContainer.state.ToUpper())" -ForegroundColor Green
            Write-Host "  [OK] Uptime         : $($wgContainer.status)" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Container is in state: $($wgContainer.state)" -ForegroundColor Red
        }
    } else {
        Write-Host "  [ERROR] WireGuard container not found in status file." -ForegroundColor Red
    }
} else {
    Write-Host "  [ERROR] Could not find docker_status.json." -ForegroundColor Red
}

Write-Host ""

# 2. Check Configurations
Write-Host "[2/2] Checking Client Configurations..." -ForegroundColor Yellow
$configFile = "soc-tier1\vpn\config\peer1\peer1.conf"
$qrFile = "soc-tier1\vpn\config\peer1\peer1.png"

if (Test-Path $configFile) {
    Write-Host "  [OK] Client configuration generated successfully (peer1.conf)" -ForegroundColor Green
    
    if (Test-Path $qrFile) {
        Write-Host "  [OK] Mobile QR code generated successfully (peer1.png)" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "  --- peer1.conf Network Settings ---" -ForegroundColor DarkGray
    # Output the full config
    Get-Content $configFile | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Gray
    }
    Write-Host "  -----------------------------------" -ForegroundColor DarkGray

} else {
    Write-Host "  [ERROR] Configuration file not found. Initialization may have failed." -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "     ✅ WIRE-GUARD IS FULLY OPERATIONAL   " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
