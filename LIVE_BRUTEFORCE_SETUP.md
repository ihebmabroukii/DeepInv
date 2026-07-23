# Live SSH Brute-Force Test — Victim VM + Security Onion Setup

Goal: a single real SSH brute-force that lights up **both** detection layers
simultaneously — Wazuh (host) and Security Onion (network) — then flows through
the AI engine → TheHive → OpenCTI/Cortex, exactly like the documented Sprint 6 test.

This produces the 3 figures still missing from the report:
`live_bruteforce_wazuh.png`, `live_bruteforce_seconion.png`, `thehive_case_bruteforce.png`.

---

## 0. Network topology (the key to two-layer detection)

Security Onion has two NICs:
- **NAT (VMnet8 → 192.168.126.0/24)** = management (the web UI at `192.168.126.128`).
- **Host-only (VMnet1 → 192.168.132.0/24)** = its **monitor/sniffing** interface.

So the attack traffic must cross **VMnet1 (Host-only, 192.168.132.x)** for Suricata/Zeek to see it.

### Victim VM adapters (VMware → VM Settings → Network Adapter)
1. **Adapter 1 → NAT (VMnet8)** — gives internet (to install the agent) + reaches the Wazuh manager.
2. **Add → Adapter 2 → Host-only (VMnet1)** — the segment SO monitors; the attack targets THIS IP.

Keep the victim VM small (**~2 GB RAM**) — it's just sshd + agent.

### Make sure the monitored vSwitch allows sniffing
In VMware **Virtual Network Editor**, on **VMnet1 (Host-only)**, promiscuous mode must be permitted
(SO sets its own monitor NIC promiscuous; the vSwitch just has to allow it). This already worked in
your Sprint 6 test, so the VMnet1 config is correct.

---

## 1. On the VICTIM VM — get the two IPs
```bash
ip -brief addr
# Expect: ens33 -> 192.168.126.x (NAT)   and   ens34/ens37 -> 192.168.132.x (Host-only)
```
Note the **Host-only IP** (192.168.132.x) — that is the attack target.

---

## 2. On the VICTIM VM — install + connect the Wazuh agent
The manager's enrollment/comms ports (1514/1515) are published on the Windows host.
Point the agent at the host's VMnet8 IP (`192.168.126.1`).

```bash
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | sudo gpg --no-default-keyring \
  --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import && sudo chmod 644 /usr/share/keyrings/wazuh.gpg
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | \
  sudo tee /etc/apt/sources.list.d/wazuh.list
sudo apt-get update
sudo WAZUH_MANAGER="192.168.126.1" apt-get install -y wazuh-agent
sudo /var/ossec/bin/agent-auth -m 192.168.126.1 -A victim-linux
sudo systemctl daemon-reload && sudo systemctl enable --now wazuh-agent
```
Verify on the host:
```bash
docker exec wazuh.manager /var/ossec/bin/agent_control -l   # victim-linux should be Active
```

---

## 3. On the VICTIM VM — SSH server + a weak account (so the attack "succeeds")
```bash
sudo apt-get install -y openssh-server
sudo sed -i 's/#\?PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo systemctl restart ssh
# deliberately weak demo creds:
sudo useradd -m -s /bin/bash iheb.mabrouki 2>/dev/null; echo 'iheb.mabrouki:Password123' | sudo chpasswd
```

---

## 4. From the ATTACKER (your Windows host) — run the brute force
Install hydra (e.g. in WSL/Git Bash, or any Linux box on VMnet1), then target the **Host-only IP**:
```bash
# wordlist with the real password near the end so it ends in a success
printf 'admin\nroot\n123456\nqwerty\nletmein\nPassword1\nPassword123\n' > pw.txt
hydra -l iheb.mabrouki -P pw.txt ssh://192.168.132.<VICTIM_HOSTONLY_IP> -t 4 -V
```
This generates: many failed SSH logins + one success → Wazuh rule 5710/5712 + 5715,
and Suricata/Zeek SSH brute-force on the network side.

---

## 5. Watch it flow end-to-end
- **Wazuh dashboard** (`https://localhost:5601`, admin/admin) → Security Events: failed logins escalating to a successful login. → screenshot **`live_bruteforce_wazuh.png`**
- **Security Onion** (`https://192.168.126.128`) → Alerts/Hunt: Suricata SSH brute-force + Zeek conn logs. → screenshot **`live_bruteforce_seconion.png`**
- **SOC-AI** picks both up (WazuhReader + SOElasticReader) → builds one incident → AI report appears in the dashboard.
- **TheHive** (`http://localhost:9000`) → an investigation case is auto-created. → screenshot **`thehive_case_bruteforce.png`**

Save those 3 PNGs into `C:\Users\Mega-PC\Desktop\latex\` to complete the report figures.

---

## Quick reference — credentials & URLs
| Service | URL | Login |
|---|---|---|
| Wazuh dashboard | https://localhost:5601 | admin / admin |
| Wazuh manager API | (internal) wazuh.manager:55000 | wazuh-wui / wazuh-wui |
| Security Onion | https://192.168.126.128 | (your SO setup account) |
| TheHive | http://localhost:9000 | (your TheHive account) |
| SOC-AI dashboard | http://localhost:3000 | admin@attijari.tn / admin (fallback admin/admin) |

If the agent can't reach `192.168.126.1:1515`, allow it on the Windows host:
```powershell
New-NetFirewallRule -DisplayName "Wazuh agent" -Direction Inbound -Protocol TCP -LocalPort 1514,1515 -Action Allow
```
