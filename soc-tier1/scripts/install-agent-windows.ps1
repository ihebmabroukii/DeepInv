# ==============================================================================
# DeepInv - Wazuh Agent Installer for Windows VMs
# ==============================================================================
# Run this script on your dedicated Windows VM (as Administrator) to enroll it.
#
# Usage (run PowerShell as Administrator):
#   .\install-agent-windows.ps1 -ManagerIP <IP> [-AgentName <NAME>]
#
# Arguments:
#   -ManagerIP    IP of your Windows host running the Wazuh Manager
#                 Use your LAN IP or VMware NAT IP, e.g.:
#                   192.168.1.251  (Wi-Fi / LAN)
#                   192.168.126.1  (VMware NAT VMnet8)
#   -AgentName    Optional. Defaults to this machine's hostname.
#
# Example:
#   .\install-agent-windows.ps1 -ManagerIP 192.168.126.1 -AgentName "win-lab-vm"
# ==============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$ManagerIP,

    [Parameter(Mandatory=$false)]
    [string]$AgentName = $env:COMPUTERNAME,

    [Parameter(Mandatory=$false)]
    [string]$WazuhVersion = "4.5.4-1"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  DeepInv Wazuh Agent Installer (Windows)"   -ForegroundColor Cyan
Write-Host "  Manager IP  : $ManagerIP"                  -ForegroundColor White
Write-Host "  Agent Name  : $AgentName"                  -ForegroundColor White
Write-Host "  Wazuh Ver.  : $WazuhVersion"               -ForegroundColor White
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Test Connectivity to Manager ---
Write-Host "[1/4] Testing connectivity to Wazuh Manager at ${ManagerIP}:1514 ..." -ForegroundColor Yellow
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect($ManagerIP, 1515)
    $tcpClient.Close()
    Write-Host "  [OK] Manager reachable on port 1515 (authd enrollment)" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Cannot reach $ManagerIP on port 1515." -ForegroundColor Red
    Write-Host "  Make sure:" -ForegroundColor Yellow
    Write-Host "    1. The Wazuh Manager container is running" -ForegroundColor White
    Write-Host "    2. Windows Firewall allows port 1514 and 1515 inbound" -ForegroundColor White
    Write-Host "    3. You are using the correct manager IP" -ForegroundColor White
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") { exit 1 }
}

# --- Step 2: Download MSI ---
$InstallerUrl = "https://packages.wazuh.com/4.x/windows/wazuh-agent-${WazuhVersion}.msi"
$InstallerPath = "$env:TEMP\wazuh-agent.msi"

Write-Host "[2/4] Downloading Wazuh Agent MSI from packages.wazuh.com ..." -ForegroundColor Yellow
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $ProgressPreference = "SilentlyContinue"
    Invoke-WebRequest -Uri $InstallerUrl -OutFile $InstallerPath -UseBasicParsing
    Write-Host "  [OK] Downloaded to $InstallerPath" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Download failed: $_" -ForegroundColor Red
    exit 1
}

# --- Step 3: Install ---
Write-Host "[3/4] Installing Wazuh Agent (silent)..." -ForegroundColor Yellow
$MsiArgs = @(
    "/i", $InstallerPath,
    "/q",
    "WAZUH_MANAGER=`"$ManagerIP`"",
    "WAZUH_MANAGER_PORT=`"1514`"",
    "WAZUH_PROTOCOL=`"TCP`"",
    "WAZUH_AGENT_NAME=`"$AgentName`"",
    "WAZUH_REGISTRATION_SERVER=`"$ManagerIP`"",
    "WAZUH_REGISTRATION_PORT=`"1515`"",
    "/l*v", "$env:TEMP\wazuh-install.log"
)

$process = Start-Process "msiexec.exe" -ArgumentList $MsiArgs -Wait -PassThru
if ($process.ExitCode -ne 0) {
    Write-Host "  [ERROR] Installation failed. Exit code: $($process.ExitCode)" -ForegroundColor Red
    Write-Host "  Check log at: $env:TEMP\wazuh-install.log" -ForegroundColor Yellow
    exit 1
}
Write-Host "  [OK] Agent installed successfully" -ForegroundColor Green

# --- Step 4: Start Service ---
Write-Host "[4/4] Starting Wazuh Agent service..." -ForegroundColor Yellow
try {
    Start-Service -Name "WazuhSvc" -ErrorAction Stop
    Write-Host "  [OK] Wazuh Agent service started" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Could not start service automatically: $_" -ForegroundColor Yellow
    Write-Host "  Start manually: Start-Service WazuhSvc" -ForegroundColor White
}

# --- Final Status ---
Start-Sleep -Seconds 3
$service = Get-Service -Name "WazuhSvc" -ErrorAction SilentlyContinue
$statusColor = if ($service.Status -eq "Running") { "Green" } else { "Red" }

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Service Status : $($service.Status)" -ForegroundColor $statusColor
Write-Host "  Config File    : C:\Program Files (x86)\ossec-agent\ossec.conf" -ForegroundColor White
Write-Host "  Agent Logs     : C:\Program Files (x86)\ossec-agent\logs\ossec.log" -ForegroundColor White
Write-Host ""
Write-Host "To verify enrollment on the manager, run:" -ForegroundColor Yellow
Write-Host "  docker exec wazuh.manager /var/ossec/bin/agent_control -l" -ForegroundColor White
Write-Host ""
Write-Host "To view agent logs on this VM:" -ForegroundColor Yellow
Write-Host "  Get-Content 'C:\Program Files (x86)\ossec-agent\logs\ossec.log' -Tail 30" -ForegroundColor White
