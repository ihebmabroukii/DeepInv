# Fix and Start Windows Wazuh Agent
# Run this script as Administrator!
# Right-click PowerShell -> "Run as Administrator", then run:
# Set-ExecutionPolicy Bypass -Scope Process -Force
# .\fix-wazuh-agent-windows.ps1

$wazuhPath = if (Test-Path "C:\Program Files (x86)\ossec-agent") {
    "C:\Program Files (x86)\ossec-agent"
} else {
    "C:\Program Files\ossec-agent"
}

# The correct base64 agent key from the manager (agent ID 005, name windows-host)
$AGENT_KEY = "MDA1IHdpbmRvd3MtaG9zdCBhbnkgNjNlNGQ5YzFmYjg5YThjOWI2YjUyMDkwN2MwZjU5ODkyYjBhNTE0OTMwYWE1YWRmZjk1NjhlNjkzMWQwNDQ2OQ=="
$MANAGER_IP = "127.0.0.1"

Write-Host "=== Wazuh Agent Fix ===" -ForegroundColor Cyan
Write-Host "Agent path: $wazuhPath"

if (-not (Test-Path $wazuhPath)) {
    Write-Host "ERROR: Wazuh agent not found at $wazuhPath" -ForegroundColor Red
    exit 1
}

# Stop service if running
Stop-Service -Name "WazuhSvc" -Force -ErrorAction SilentlyContinue

# Import the correct agent key
Write-Host "[1/3] Importing agent key..." -ForegroundColor Yellow
$manageAgents = "$wazuhPath\manage_agents.exe"
if (Test-Path $manageAgents) {
    $importInput = "i`n$AGENT_KEY`ny`n"
    $importInput | & $manageAgents 2>&1 | Out-Null
    Write-Host "      Key imported." -ForegroundColor Green
}

# Verify/update ossec.conf with correct manager address
Write-Host "[2/3] Verifying ossec.conf..." -ForegroundColor Yellow
$confPath = "$wazuhPath\ossec.conf"
if (Test-Path $confPath) {
    $conf = Get-Content $confPath -Raw
    if ($conf -match "<address>.*</address>") {
        $conf = $conf -replace "<address>.*</address>", "<address>$MANAGER_IP</address>"
        Set-Content $confPath $conf -Encoding UTF8
        Write-Host "      Manager address set to $MANAGER_IP" -ForegroundColor Green
    }
}

# Start the service
Write-Host "[3/3] Starting WazuhSvc..." -ForegroundColor Yellow
Start-Service -Name "WazuhSvc" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
$svc = Get-Service -Name "WazuhSvc" -ErrorAction SilentlyContinue
Write-Host "      Service status: $($svc.Status)" -ForegroundColor $(if ($svc.Status -eq 'Running') { 'Green' } else { 'Red' })

if ($svc.Status -eq 'Running') {
    Write-Host ""
    Write-Host "=== SUCCESS ===" -ForegroundColor Green
    Write-Host "Windows host is now a Wazuh agent (ID 005)."
    Write-Host "Check agent status at: http://localhost:5601"
    Write-Host "Agent will appear as 'windows-host' in the Wazuh dashboard."
} else {
    Write-Host ""
    Write-Host "Service failed to start. Checking logs..." -ForegroundColor Yellow
    if (Test-Path "$wazuhPath\ossec.log") {
        Get-Content "$wazuhPath\ossec.log" -Tail 10
    }
}
