# Restart Agent Heartbeat Service
$Token = "MsPVMnNiw-GBUEYJUSNyR1hGjgTx1bNFXn29i8EUun8"
$Url = "https://localhost"

# Stop any existing jobs
Get-Job | Where-Object { $_.Command -like "*heartbeat*" } | Stop-Job
Get-Job | Where-Object { $_.Command -like "*heartbeat*" } | Remove-Job

Write-Host "Starting Agent Heartbeat Service..." -ForegroundColor Green

$ScriptBlock = {
    param($Token, $Url)
    
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

    while ($true) {
         try {
             $Body = @{token=$Token} | ConvertTo-Json
             Invoke-RestMethod -Uri "$Url/api/v1/agents/heartbeat" -Method Post -Body $Body -ContentType "application/json" -ErrorAction Stop | Out-Null
         } catch {}
         Start-Sleep -Seconds 10
    }
}

Start-Job -ScriptBlock $ScriptBlock -ArgumentList $Token, $Url | Out-Null
Write-Host "Agent Connected Successfully - Running in Background" -ForegroundColor Green
Write-Host ""
Write-Host "To check status: Get-Job" -ForegroundColor Cyan
Write-Host "To stop: Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor Cyan
