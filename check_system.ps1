# System Health Check
Write-Host "=== DeepInv System Health Check ===" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "[1/3] Docker Containers:" -ForegroundColor Yellow
docker ps --filter "name=security_platform" --format "  {{.Names}}: {{.Status}}"
Write-Host ""

# Check Database
Write-Host "[2/3] Database Status:" -ForegroundColor Yellow
docker exec security_platform_db psql -U admin -d security_platform -c "SELECT COUNT(*) as total, COUNT(CASE WHEN status='active' THEN 1 END) as active FROM agents;" 2>$null
Write-Host ""

# Check Backend
Write-Host "[3/3] Backend Health:" -ForegroundColor Yellow
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
try {
    $health = Invoke-RestMethod -Uri "https://localhost/health"
    Write-Host "  Status: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "=== SYSTEM READY ===" -ForegroundColor Green
