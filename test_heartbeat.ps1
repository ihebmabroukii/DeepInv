# Test Heartbeat Manually
$Token = "MsPVMnNiw-GBUEYJUSNyR1hGjgTx1bNFXn29i8EUun8"
$Url = "https://localhost"

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

Write-Host "Testing Heartbeat..." -ForegroundColor Cyan
try {
    $Body = @{token=$Token} | ConvertTo-Json
    $Response = Invoke-RestMethod -Uri "$Url/api/v1/agents/heartbeat" -Method Post -Body $Body -ContentType "application/json" -Verbose
    Write-Host "SUCCESS: $($Response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}
