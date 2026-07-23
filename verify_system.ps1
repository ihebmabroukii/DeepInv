# ✅ AGENT CONNECTION VERIFICATION CHECKLIST
# Run this to verify everything is working before creating a new agent

Write-Host "=== DeepInv Agent System Health Check ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check Docker Containers
Write-Host "[1/5] Checking Docker Containers..." -ForegroundColor Yellow
$containers = docker ps --filter "name=security_platform" --format "{{.Names}}: {{.Status}}"
if ($containers) {
    $containers | ForEach-Object { Write-Host "  ✓ $_" -ForegroundColor Green }
} else {
    Write-Host "  ✗ No containers running!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. Check Backend Health
Write-Host "[2/5] Checking Backend Health..." -ForegroundColor Yellow
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
    $health = Invoke-RestMethod -Uri "https://localhost/health" -ErrorAction Stop
    Write-Host "  ✓ Backend is healthy: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Backend health check failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 3. Check Install Script Availability
Write-Host "[3/5] Checking Install Script..." -ForegroundColor Yellow
try {
    $script = Invoke-WebRequest -Uri "https://localhost/static/agents/install.ps1" -UseBasicParsing
    if ($script.Content -match "Register-Agent") {
        Write-Host "  ✓ Install script is accessible" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Install script format invalid" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ Cannot download install script: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. Check Database Connection
Write-Host "[4/5] Checking Database..." -ForegroundColor Yellow
try {
    $dbCheck = docker exec security_platform_db psql -U admin -d security_platform -c 'SELECT 1;' 2>&1
    if ($dbCheck -match "1 row") {
        Write-Host "  ✓ Database is accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Database check failed" -ForegroundColor Red
}
Write-Host ""

# 5. Check Nginx Configuration
Write-Host "[5/5] Checking Nginx Routes..." -ForegroundColor Yellow
$routes = @(
    @{Path="/health"; Name="Health Check"},
    @{Path="/api/v1/agents/bootstrap"; Name="Bootstrap Endpoint"},
    @{Path="/static/agents/install.ps1"; Name="Install Script"}
)

foreach ($route in $routes) {
    try {
        $response = Invoke-WebRequest -Uri "https://localhost$($route.Path)" -Method Head -SkipCertificateCheck -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 405) {
            Write-Host "  ✓ $($route.Name) is accessible" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ✗ $($route.Name) failed" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "=== System Status: READY ===" -ForegroundColor Green
Write-Host ""
Write-Host "You can now create a new agent and run the installation command." -ForegroundColor Cyan
Write-Host "The agent should:" -ForegroundColor Cyan
Write-Host "  1. Bootstrap successfully (get certificates)" -ForegroundColor White
Write-Host "  2. Start heartbeat service" -ForegroundColor White
Write-Host "  3. Show as 'Active' in dashboard within 10 seconds" -ForegroundColor White
