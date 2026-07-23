#!/usr/bin/env powershell
# ==============================================================================
# DeepInv - Wazuh Agent Enrollment Verifier
# Run this on your HOST MACHINE (Windows) to check registered agents.
# ==============================================================================

Write-Host ""
Write-Host "=== Wazuh Agent Enrollment Status ===" -ForegroundColor Cyan
Write-Host ""

# List all registered agents
Write-Host "[*] Registered Agents:" -ForegroundColor Yellow
docker exec wazuh.manager /var/ossec/bin/agent_control -l

Write-Host ""
Write-Host "[*] Active Agents Only:" -ForegroundColor Yellow
docker exec wazuh.manager /var/ossec/bin/agent_control -l -a

Write-Host ""
Write-Host "[*] Recent Wazuh Alerts (last 10):" -ForegroundColor Yellow
docker exec wazuh.manager tail -n 20 /var/ossec/logs/alerts/alerts.log 2>/dev/null || `
    Write-Host "  No alerts yet. Agents may still be syncing." -ForegroundColor Gray

Write-Host ""
Write-Host "=== Tips ===" -ForegroundColor Cyan
Write-Host "If your agent shows as 'Never connected':" -ForegroundColor White
Write-Host "  1. Check firewall: ports 1514 and 1515 must be open from VM to this host" -ForegroundColor White
Write-Host "  2. Check the VM can ping this host" -ForegroundColor White
Write-Host "  3. On VM, check: sudo tail -f /var/ossec/logs/ossec.log" -ForegroundColor White
Write-Host ""
Write-Host "To open firewall ports on this Windows host (run as Admin):" -ForegroundColor Yellow
Write-Host '  New-NetFirewallRule -DisplayName "Wazuh Agent 1514" -Direction Inbound -Protocol TCP -LocalPort 1514 -Action Allow' -ForegroundColor Gray
Write-Host '  New-NetFirewallRule -DisplayName "Wazuh Agent 1515" -Direction Inbound -Protocol TCP -LocalPort 1515 -Action Allow' -ForegroundColor Gray
