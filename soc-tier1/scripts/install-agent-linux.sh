#!/bin/bash
# ==============================================================================
# DeepInv - Wazuh Agent Installer for Linux VMs
# ==============================================================================
# Run this script on your dedicated Linux VM to enroll it as a Wazuh agent.
#
# Usage:
#   chmod +x install-agent-linux.sh
#   sudo ./install-agent-linux.sh <MANAGER_IP> [AGENT_NAME]
#
# Arguments:
#   MANAGER_IP   - IP of your Windows host running the Wazuh Manager
#                  Use your LAN IP or VMware NAT IP, e.g.:
#                    192.168.1.251  (Wi-Fi / LAN)
#                    192.168.126.1  (VMware NAT VMnet8)
#   AGENT_NAME   - Optional. Defaults to this machine's hostname.
#
# Example:
#   sudo ./install-agent-linux.sh 192.168.126.1 ubuntu-lab-vm
# ==============================================================================

set -e

MANAGER_IP="${1}"
AGENT_NAME="${2:-$(hostname)}"
WAZUH_VERSION="4.5.4"

# --- Validate Input ---
if [ -z "$MANAGER_IP" ]; then
    echo "[ERROR] Manager IP is required."
    echo "Usage: sudo ./install-agent-linux.sh <MANAGER_IP> [AGENT_NAME]"
    exit 1
fi

echo ""
echo "=============================================="
echo "  DeepInv Wazuh Agent Installer"
echo "  Manager IP  : $MANAGER_IP"
echo "  Agent Name  : $AGENT_NAME"
echo "  Wazuh Ver.  : $WAZUH_VERSION"
echo "=============================================="
echo ""

# --- Detect OS ---
if [ -f /etc/debian_version ]; then
    OS_FAMILY="debian"
elif [ -f /etc/redhat-release ]; then
    OS_FAMILY="redhat"
else
    echo "[ERROR] Unsupported OS. Only Debian/Ubuntu and RedHat/CentOS supported."
    exit 1
fi

# --- Install Wazuh Agent ---
echo "[1/4] Adding Wazuh repository..."

if [ "$OS_FAMILY" = "debian" ]; then
    curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --dearmor | tee /usr/share/keyrings/wazuh.gpg > /dev/null
    echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list
    apt-get update -qq
    echo "[2/4] Installing wazuh-agent..."
    WAZUH_MANAGER="$MANAGER_IP" WAZUH_AGENT_NAME="$AGENT_NAME" apt-get install -y wazuh-agent="${WAZUH_VERSION}-1"
else
    rpm --import https://packages.wazuh.com/key/GPG-KEY-WAZUH
    cat > /etc/yum.repos.d/wazuh.repo << EOF
[wazuh]
gpgcheck=1
gpgkey=https://packages.wazuh.com/key/GPG-KEY-WAZUH
enabled=1
name=EL-\$releasever - Wazuh
baseurl=https://packages.wazuh.com/4.x/yum/
protect=1
EOF
    echo "[2/4] Installing wazuh-agent..."
    WAZUH_MANAGER="$MANAGER_IP" WAZUH_AGENT_NAME="$AGENT_NAME" yum install -y wazuh-agent-"${WAZUH_VERSION}"-1
fi

# --- Configure Agent ---
echo "[3/4] Configuring agent to connect to manager at $MANAGER_IP ..."
cat > /var/ossec/etc/ossec.conf << EOF
<ossec_config>
  <client>
    <server>
      <address>$MANAGER_IP</address>
      <port>1514</port>
      <protocol>tcp</protocol>
    </server>
    <config-profile>ubuntu, ubuntu20</config-profile>
    <notify_time>10</notify_time>
    <time-reconnect>60</time-reconnect>
    <auto_restart>yes</auto_restart>
    <crypto_method>aes</crypto_method>
  </client>

  <!-- Agent name -->
  <client_buffer>
    <disabled>no</disabled>
    <queue_size>5000</queue_size>
    <events_per_second>500</events_per_second>
  </client_buffer>

  <!-- File Integrity Monitoring -->
  <syscheck>
    <disabled>no</disabled>
    <frequency>43200</frequency>
    <scan_on_start>yes</scan_on_start>
    <alert_new_files>yes</alert_new_files>
    <auto_ignore>no</auto_ignore>
    <directories>/etc,/usr/bin,/usr/sbin</directories>
    <directories>/bin,/sbin,/boot</directories>
    <ignore>/etc/mtab</ignore>
    <ignore type="sregex">.log$|.swp$</ignore>
  </syscheck>

  <!-- Rootkit detection -->
  <rootcheck>
    <disabled>no</disabled>
    <frequency>43200</frequency>
  </rootcheck>

  <!-- System inventory -->
  <wodle name="syscollector">
    <disabled>no</disabled>
    <interval>1h</interval>
    <scan_on_start>yes</scan_on_start>
    <hardware>yes</hardware>
    <os>yes</os>
    <network>yes</network>
    <packages>yes</packages>
    <ports all="no">yes</ports>
    <processes>yes</processes>
  </wodle>

  <!-- Log collection -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/auth.log</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/syslog</location>
  </localfile>

  <localfile>
    <log_format>command</log_format>
    <command>df -P</command>
    <frequency>360</frequency>
  </localfile>

  <localfile>
    <log_format>full_command</log_format>
    <command>last -n 10</command>
    <frequency>360</frequency>
  </localfile>
</ossec_config>
EOF

# --- Enable & Start Agent ---
echo "[4/4] Enabling and starting wazuh-agent service..."
systemctl daemon-reload
systemctl enable wazuh-agent
systemctl start wazuh-agent

# --- Status Check ---
sleep 3
echo ""
echo "=============================================="
echo "  Installation Complete!"
echo "=============================================="
systemctl status wazuh-agent --no-pager
echo ""
echo "Check agent enrollment on your manager:"
echo "  docker exec wazuh.manager /var/ossec/bin/agent_control -l"
echo ""
echo "View agent logs on this VM:"
echo "  tail -f /var/ossec/logs/ossec.log"
