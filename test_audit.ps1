# Test Audit Log System

Write-Host "Testing Audit Log System..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Create a test audit log entry
Write-Host "[1/3] Creating test audit log..." -ForegroundColor Yellow
docker exec security_platform_db psql -U admin -d security_platform -c "INSERT INTO audit_logs (user_email, user_role, action, resource_type, details) VALUES ('test@bank.tn', 'super_admin', 'test.action', 'test_resource', '{\"test\": true}'::jsonb);"

# Test 2: Verify table structure
Write-Host ""
Write-Host "[2/3] Verifying audit_logs table..." -ForegroundColor Yellow
docker exec security_platform_db psql -U admin -d security_platform -c "\d audit_logs"

# Test 3: Query audit logs
Write-Host ""
Write-Host "[3/3] Querying recent audit logs..." -ForegroundColor Yellow
docker exec security_platform_db psql -U admin -d security_platform -c "SELECT user_email, action, resource_type, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 5;"

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Green
