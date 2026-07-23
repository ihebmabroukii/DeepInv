"""
SSH Brute Force Attack Simulation
===================================
Generates realistic Wazuh SSH brute-force alerts that flow through:
  Wazuh Manager alerts.json -> SOC-AI wazuh_reader -> AI analysis -> Dashboard

Usage (run inside soc-ai container):
  python simulate_bruteforce.py
  python simulate_bruteforce.py --attacker 192.168.10.50 --target 192.168.10.101 --user root --count 30
"""

import json
import random
import time
import argparse
from datetime import datetime, timezone, timedelta

# Path inside the soc-ai container (volume-mounted from wazuh.manager's wazuh-logs volume)
WAZUH_ALERTS_FILE = "/var/ossec/logs/alerts/alerts.json"

COMMON_USERS = [
    "root", "admin", "administrator", "ubuntu", "pi", "user", "test",
    "guest", "oracle", "postgres", "mysql", "ftpuser", "ansible", "deploy",
    "iheb", "iheb.mabrouki", "operator", "support", "backup", "sysadmin"
]


def generate_ssh_failure(attacker_ip, target_ip, target_hostname, username, port, timestamp):
    """Wazuh-format SSH authentication failure (rule 5716)."""
    return {
        "timestamp": timestamp,
        "rule": {
            "level": 5,
            "description": "sshd: authentication failed.",
            "id": "5716",
            "firedtimes": 1,
            "mail": False,
            "groups": ["syslog", "sshd", "authentication_failed"]
        },
        "agent": {"id": "003", "name": target_hostname, "ip": target_ip},
        "manager": {"name": "wazuh.manager"},
        "id": "1" + "".join([str(random.randint(0, 9)) for _ in range(9)]),
        "full_log": f"Failed password for {username} from {attacker_ip} port {port} ssh2",
        "predecoder": {
            "program_name": "sshd",
            "timestamp": timestamp,
            "hostname": target_hostname
        },
        "decoder": {"name": "sshd"},
        "data": {
            "srcip": attacker_ip,
            "srcport": str(port),
            "srcuser": username,
            "dstuser": username
        },
        "location": "/var/log/auth.log"
    }


def generate_brute_force_alert(attacker_ip, target_ip, target_hostname, username, count, timestamp):
    """Wazuh composite brute-force detection alert (rule 100002, level 10)."""
    return {
        "timestamp": timestamp,
        "rule": {
            "level": 10,
            "description": "SSH brute force attack detected: Multiple authentication failures from same source IP.",
            "id": "100002",
            "firedtimes": 1,
            "mail": True,
            "groups": ["authentication_failures", "brute_force"],
            "mitre": {
                "id": ["T1110.001", "T1078"],
                "tactic": ["Credential Access"],
                "technique": ["Brute Force: Password Guessing"]
            }
        },
        "agent": {"id": "003", "name": target_hostname, "ip": target_ip},
        "manager": {"name": "wazuh.manager"},
        "id": "1" + "".join([str(random.randint(0, 9)) for _ in range(9)]),
        "full_log": (
            f"Brute force attack from {attacker_ip}: {count} authentication failures "
            f"in last 2 minutes targeting user '{username}'"
        ),
        "predecoder": {
            "program_name": "sshd",
            "timestamp": timestamp,
            "hostname": target_hostname
        },
        "decoder": {"name": "sshd"},
        "data": {
            "srcip": attacker_ip,
            "srcuser": username,
            "dstuser": username,
            "extra_data": f"Brute force from {attacker_ip}: {count} attempts"
        },
        "location": "/var/log/auth.log"
    }


def generate_critical_alert(attacker_ip, target_ip, target_hostname, username, count, timestamp):
    """Critical brute-force alert — 20+ failures (rule 100003, level 14)."""
    return {
        "timestamp": timestamp,
        "rule": {
            "level": 14,
            "description": "SSH brute force CRITICAL: 20+ failures in 5 minutes from same source IP.",
            "id": "100003",
            "firedtimes": 1,
            "mail": True,
            "groups": ["authentication_failures", "brute_force", "high_volume"],
            "mitre": {
                "id": ["T1110", "T1110.001"],
                "tactic": ["Credential Access", "Initial Access"],
                "technique": ["Brute Force", "Brute Force: Password Guessing"]
            }
        },
        "agent": {"id": "003", "name": target_hostname, "ip": target_ip},
        "manager": {"name": "wazuh.manager"},
        "id": "1" + "".join([str(random.randint(0, 9)) for _ in range(9)]),
        "full_log": (
            f"CRITICAL: Sustained SSH brute force from {attacker_ip}: {count} auth failures"
        ),
        "predecoder": {
            "program_name": "sshd",
            "timestamp": timestamp,
            "hostname": target_hostname
        },
        "decoder": {"name": "sshd"},
        "data": {
            "srcip": attacker_ip,
            "srcuser": username,
            "dstuser": username,
        },
        "location": "/var/log/auth.log"
    }


def run_simulation(attacker_ip, target_ip, target_hostname, username, count, alerts_file):
    print(f"\n{'='*62}")
    print(f"  SSH BRUTE FORCE SIMULATION — Attijari CyberGuard")
    print(f"{'='*62}")
    print(f"  Attacker:   {attacker_ip}")
    print(f"  Target:     {target_hostname} ({target_ip})")
    print(f"  Username:   {username}")
    print(f"  Attempts:   {count}")
    print(f"  Alert file: {alerts_file}")
    print(f"{'='*62}\n")

    base_time = datetime.now(timezone.utc)
    recon_users = list(dict.fromkeys([username] + random.sample(COMMON_USERS, 5)))[:6]
    total = 0

    # Phase 1: Recon — probe common usernames
    print("[Phase 1] Reconnaissance — probing common usernames...")
    for i, uname in enumerate(recon_users):
        ts = (base_time + timedelta(seconds=i * 8)).strftime("%Y-%m-%dT%H:%M:%S.000") + "+00:00"
        port = random.randint(50000, 65000)
        alert = generate_ssh_failure(attacker_ip, target_ip, target_hostname, uname, port, ts)
        with open(alerts_file, "a") as f:
            f.write(json.dumps(alert) + "\n")
        print(f"  → [{total+1:3d}] FAIL  user={uname:<20} src={attacker_ip}:{port}")
        total += 1
        time.sleep(0.4)

    print()
    time.sleep(1)

    # Phase 2: Focused brute force on target username
    print(f"[Phase 2] Focused brute force — {count} attempts on '{username}'...")
    for i in range(count):
        ts = (base_time + timedelta(seconds=30 + i * 3)).strftime("%Y-%m-%dT%H:%M:%S.000") + "+00:00"
        port = random.randint(50000, 65000)
        alert = generate_ssh_failure(attacker_ip, target_ip, target_hostname, username, port, ts)
        with open(alerts_file, "a") as f:
            f.write(json.dumps(alert) + "\n")
        if (i + 1) % 5 == 0 or i == 0:
            print(f"  → [{total+1:3d}] FAIL  user={username:<20} attempt={i+1}/{count}")
        total += 1
        time.sleep(0.2)

    print()

    # Phase 3: Wazuh brute-force alert fires (rule 100002)
    print("[Phase 3] Brute-force pattern detected (level 10, rule 100002, T1110.001)...")
    ts = (base_time + timedelta(seconds=30 + count * 3 + 5)).strftime("%Y-%m-%dT%H:%M:%S.000") + "+00:00"
    bf_alert = generate_brute_force_alert(attacker_ip, target_ip, target_hostname, username, count, ts)
    with open(alerts_file, "a") as f:
        f.write(json.dumps(bf_alert) + "\n")
    print(f"  → [WAZUH ALERT] rule=100002 level=10 — Brute force from {attacker_ip}")
    total += 1
    time.sleep(0.5)

    # Phase 4: Critical alert if count is high enough
    if count >= 20:
        print("[Phase 4] Critical threshold reached (level 14, rule 100003)...")
        ts = (base_time + timedelta(seconds=30 + count * 3 + 15)).strftime("%Y-%m-%dT%H:%M:%S.000") + "+00:00"
        crit = generate_critical_alert(attacker_ip, target_ip, target_hostname, username, count, ts)
        with open(alerts_file, "a") as f:
            f.write(json.dumps(crit) + "\n")
        print(f"  → [CRITICAL]   rule=100003 level=14 — Sustained attack confirmed!")
        total += 1

    print()
    print("=" * 62)
    print(f"  DONE — {total} events injected")
    print(f"  SOC-AI wazuh_reader picks them up in real-time.")
    print(f"  Check the dashboard: http://localhost:3000")
    print(f"  AI analysis will complete in ~2-3 minutes (CPU Ollama).")
    print("=" * 62)


def main():
    parser = argparse.ArgumentParser(description="SSH Brute Force Simulation")
    parser.add_argument("--attacker", default="192.168.10.50",  help="Attacker IP")
    parser.add_argument("--target",   default="192.168.10.101", help="Target IP")
    parser.add_argument("--hostname", default="victim-linux",   help="Target hostname")
    parser.add_argument("--user",     default="root",           help="Username to brute-force")
    parser.add_argument("--count",    default=25, type=int,     help="Number of brute-force attempts")
    parser.add_argument("--file",     default=WAZUH_ALERTS_FILE, help="Wazuh alerts.json path")
    args = parser.parse_args()

    run_simulation(args.attacker, args.target, args.hostname, args.user, args.count, args.file)


if __name__ == "__main__":
    main()
