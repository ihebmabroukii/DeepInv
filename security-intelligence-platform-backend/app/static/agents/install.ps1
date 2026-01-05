
function Register-Agent {
    param (
        [string]$Token,
        [string]$Url = "https://localhost"
    )

    $ErrorActionPreference = "Stop"

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    } catch {}

    if ([string]::IsNullOrEmpty($Token)) {
        Write-Error "Agent Token is required."
        return
    }

    Write-Host "Initializing Secure Agent Connection..." -ForegroundColor Cyan

    $AgentDataPath = "$env:ProgramData\SecurityAgent"
    $CertsPath = "$AgentDataPath\certs"
    if (-not (Test-Path $CertsPath)) {
        New-Item -ItemType Directory -Force -Path $CertsPath | Out-Null
    }

    $ClientCertPath = "$CertsPath\client.crt"
    $ClientKeyPath = "$CertsPath\client.key"
    $CaCertPath = "$CertsPath\root_ca.crt"

    # Step 1: Bootstrap - Fetch mTLS Certificates
    if (-not (Test-Path $ClientCertPath)) {
        Write-Host "Bootstrapping mTLS Identity..." -ForegroundColor Yellow
        try {
            $BootstrapUrl = "$Url/api/v1/agents/bootstrap"
            $Body = @{ token = $Token } | ConvertTo-Json
            
            $Response = Invoke-RestMethod -Uri $BootstrapUrl -Method Post -Body $Body -ContentType "application/json"
            
            $Response.client_cert | Out-File -FilePath $ClientCertPath -Encoding ASCII
            $Response.client_key | Out-File -FilePath $ClientKeyPath -Encoding ASCII
            $Response.ca_cert | Out-File -FilePath $CaCertPath -Encoding ASCII
            Write-Host "mTLS Certificates Acquired Successfully" -ForegroundColor Green
        }
        catch {
            Write-Error "Bootstrap Failed: $_"
            return
        }
    } else {
         Write-Host "mTLS Identity Already Configured" -ForegroundColor Green
    }
    
    # Step 2: Start Heartbeat Service with Task Processing
    Write-Host "Starting Secure Heartbeat Service..." -ForegroundColor Green
    
    $ScriptBlock = {
        param($Token, $Url)
        
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

        # Function to collect system fingerprint
        function Get-SystemFingerprint {
            try {
                $OS = Get-CimInstance Win32_OperatingSystem
                $CS = Get-CimInstance Win32_ComputerSystem
                $Net = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPAddress -ne $null }
                
                # Security Software (Antivirus)
                $AVList = @()
                try {
                    $AVs = Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntivirusProduct -ErrorAction SilentlyContinue
                    foreach ($av in $AVs) {
                        $AVList += $av.displayName
                    }
                } catch {
                    $AVList += "Detection Failed (Possible Server OS)"
                }
                
                # Network Interfaces
                $Interfaces = @()
                foreach ($n in $Net) {
                    $Interfaces += @{
                        description = $n.Description
                        ip = $n.IPAddress[0]
                        mac = $n.MACAddress
                    }
                }
                
                return @{
                    hostname = $CS.DNSHostName
                    os = "$($OS.Caption) ($($OS.Version))"
                    kernel = $OS.BuildNumber
                    uptime = ((Get-Date) - $OS.LastBootUpTime).ToString()
                    security_software = $AVList
                    interfaces = $Interfaces
                }
            } catch {
                return @{error = "Fingerprint collection failed: $_"}
            }
        }

        while ($true) {
             try {
                 # Send heartbeat and check for tasks
                 $Body = @{token=$Token} | ConvertTo-Json
                 $Response = Invoke-RestMethod -Uri "$Url/api/v1/agents/heartbeat" -Method Post -Body $Body -ContentType "application/json" -ErrorAction Stop
                 
                 # Process tasks if any
                 if ($Response.tasks -and $Response.tasks.Count -gt 0) {
                     foreach ($task in $Response.tasks) {
                         if ($task.type -eq "fingerprint") {
                             # Execute fingerprint scan
                             $FingerprintData = Get-SystemFingerprint
                             
                             # Send result back to server
                             $ResultBody = @{
                                 token = $Token
                                 task_id = $task.task_id
                                 result = $FingerprintData
                             } | ConvertTo-Json -Depth 5
                             
                             Invoke-RestMethod -Uri "$Url/api/v1/agents/tasks/result" -Method Post -Body $ResultBody -ContentType "application/json" -ErrorAction SilentlyContinue | Out-Null
                         }
                     }
                 }
             } catch {}
             Start-Sleep -Seconds 10
        }
    }
    
    Start-Job -ScriptBlock $ScriptBlock -ArgumentList $Token, $Url | Out-Null
    Write-Host "Agent Connected Successfully - Running in Background" -ForegroundColor Green
    Write-Host "Agent can now receive and execute tasks from the dashboard" -ForegroundColor Cyan
}
