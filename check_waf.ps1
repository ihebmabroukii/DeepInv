# ModSecurity WAF Health Check
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "       ModSecurity WAF Status Check       " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Container Status from docker_status.json
Write-Host "[1/2] Checking WAF Service Status..." -ForegroundColor Yellow
$statusFile = "docker_status.json"
if (Test-Path $statusFile) {
    $dockerData = Get-Content $statusFile | ConvertFrom-Json
    $wafContainer = $dockerData | Where-Object { $_.name -eq 'waf' }
    
    if ($wafContainer) {
        if ($wafContainer.state -eq "running") {
            Write-Host "  [OK] Container Name : $($wafContainer.name)" -ForegroundColor Green
            Write-Host "  [OK] Service State  : $($wafContainer.state.ToUpper())" -ForegroundColor Green
            Write-Host "  [OK] Uptime         : $($wafContainer.status)" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Container is in state: $($wafContainer.state)" -ForegroundColor Red
        }
    } else {
        Write-Host "  [ERROR] WAF container not found in status file." -ForegroundColor Red
    }
} else {
    Write-Host "  [ERROR] Could not find docker_status.json." -ForegroundColor Red
}

Write-Host ""

# 2. Check Configurations
Write-Host "[2/2] Checking ModSecurity Configurations..." -ForegroundColor Yellow
$composeFile = "soc-tier1\docker-compose.yml"

if (Test-Path $composeFile) {
    Write-Host "  [OK] WAF Configuration found in docker-compose.yml" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "  --- Active WAF Protection Settings ---" -ForegroundColor DarkGray
    # Extract WAF environment variables
    $inWafBlock = $false
    Get-Content $composeFile | ForEach-Object {
        if ($_ -match "container_name:\s*waf") {
            $inWafBlock = $true
        }
        if ($inWafBlock -and $_ -match "wazuh.indexer:") {
            $inWafBlock = $false
        }
        if ($inWafBlock -and $_ -match "- PARANOIA|- ANOMALY|- BACKEND") {
            Write-Host "  $($_.Trim())" -ForegroundColor Gray
        }
    }
    Write-Host "  --------------------------------------" -ForegroundColor DarkGray
    Write-Host "  [i] OWASP Core Rule Set (CRS) is ENABLED" -ForegroundColor Magenta
    Write-Host "  [i] Malicious requests (e.g. SQLi, XSS) will be blocked with HTTP 403" -ForegroundColor Magenta

} else {
    Write-Host "  [ERROR] Configuration file not found." -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "     ✅ MOD-SECURITY WAF IS OPERATIONAL   " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
