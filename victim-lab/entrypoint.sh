#!/bin/bash
set -e

MANAGER="${WAZUH_MANAGER:-wazuh.manager}"
echo "[victim] Enrolling Wazuh agent with manager: $MANAGER"

# Point the agent at the manager and auto-enroll via wazuh-authd (manager :1515).
sed -i "s|<address>.*</address>|<address>${MANAGER}</address>|" /var/ossec/etc/ossec.conf || true
/var/ossec/bin/agent-auth -m "$MANAGER" -A "victim-linux" || echo "[victim] agent-auth failed (will still start; may already be registered)"

# Start the Wazuh agent.
/var/ossec/bin/wazuh-control start || true

# Start sshd in the foreground so the container stays alive and logs are visible.
echo "[victim] Starting sshd on port 22 (user: iheb.mabrouki / weak password)"
exec /usr/sbin/sshd -D -e
