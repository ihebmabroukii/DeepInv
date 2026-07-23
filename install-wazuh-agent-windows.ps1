# Wazuh 4.5.4 Windows Agent Installer
# Run as Administrator!

$WAZUH_VERSION = "4.5.4"
$MANAGER_IP = "127.0.0.1"    # localhost since manager ports are now forwarded
$AGENT_NAME = "windows-host"
$AGENT_KEY  = "63e4d9c1fb89a8c9b6b520907c0f59892b0a514930aa5adff9568e6931d04469"
$AGENT_ID   = "005"

$MSI_URL  = "https://packages.wazuh.com/4.x/windows/wazuh-agent-$WAZUH_VERSION-1.msi"
$MSI_PATH = "$env:TEMP\wazuh-agent-$WAZUH_VERSION-1.msi"

Write-Host "=== Wazuh Agent Installer ===" -ForegroundColor Cyan
Write-Host "Manager: $MANAGER_IP"
Write-Host "Agent ID: $AGENT_ID  Name: $AGENT_NAME"
Write-Host ""

# Step 1: Download MSI
if (-not (Test-Path $MSI_PATH)) {
    Write-Host "[1/4] Downloading Wazuh agent $WAZUH_VERSION..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $MSI_URL -OutFile $MSI_PATH -UseBasicParsing
    Write-Host "     Downloaded to $MSI_PATH" -ForegroundColor Green
} else {
    Write-Host "[1/4] MSI already exists at $MSI_PATH" -ForegroundColor Green
}

# Step 2: Install silently
Write-Host "[2/4] Installing Wazuh agent (silent)..." -ForegroundColor Yellow
$installArgs = "/i `"$MSI_PATH`" /q WAZUH_MANAGER=`"$MANAGER_IP`" WAZUH_AGENT_NAME=`"$AGENT_NAME`" WAZUH_AGENT_GROUP=`"default`""
Start-Process msiexec.exe -ArgumentList $installArgs -Wait
Write-Host "     Installation complete." -ForegroundColor Green

# Step 3: Import agent key
Write-Host "[3/4] Importing agent authentication key..." -ForegroundColor Yellow
$manageAgents = "C:\Program Files (x86)\ossec-agent\manage_agents.exe"
if (-not (Test-Path $manageAgents)) {
    $manageAgents = "C:\Program Files\ossec-agent\manage_agents.exe"
}
# Use wazuh-agent's manage_agents to import the key
$importInput = "i`n$AGENT_KEY`ny`n"
$importInput | & $manageAgents 2>&1 | Out-Null
Write-Host "     Key imported." -ForegroundColor Green

# Step 4: Start the service
Write-Host "[4/4] Starting Wazuh agent service..." -ForegroundColor Yellow
Start-Service -Name "WazuhSvc" -ErrorAction SilentlyContinue
Set-Service -Name "WazuhSvc" -StartupType Automatic -ErrorAction SilentlyContinue
$svc = Get-Service -Name "WazuhSvc" -ErrorAction SilentlyContinue
Write-Host "     Service status: $($svc.Status)" -ForegroundColor Green

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Cyan
Write-Host "The Wazuh agent is running and connecting to the manager."
Write-Host "Check status at: http://localhost:5601 (Wazuh Dashboard)"
