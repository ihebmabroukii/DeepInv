#!/bin/bash
set -e

URL="${BASE_URL:-https://localhost}"
TOKEN="${AGENT_TOKEN}"

if [ -z "$TOKEN" ]; then
    echo "Error: AGENT_TOKEN is required."
    exit 1
fi

echo "Initializing Secure Agent Connection..."

AGENT_DATA_DIR="/var/lib/security-agent"
if [ "$EUID" -ne 0 ]; then
    AGENT_DATA_DIR="$HOME/.security-agent"
fi
CERTS_DIR="$AGENT_DATA_DIR/certs"

mkdir -p "$CERTS_DIR"

CLIENT_CERT="$CERTS_DIR/client.crt"
CLIENT_KEY="$CERTS_DIR/client.key"
CA_CERT="$CERTS_DIR/root_ca.crt"

# Step 1: Bootstrap - Fetch mTLS Certificates
if [ ! -f "$CLIENT_CERT" ]; then
    echo "Bootstrapping mTLS Identity..."
    RESPONSE=$(curl -k -s -X POST "$URL/api/v1/agents/bootstrap" -H "Content-Type: application/json" -d "{\"token\": \"$TOKEN\"}")

    if echo "$RESPONSE" | grep -q "error"; then
        echo "Bootstrap Failed: $RESPONSE"
        exit 1
    fi
    
    echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['client_key'])" > "$CLIENT_KEY"
    echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['client_cert'])" > "$CLIENT_CERT"
    echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['ca_cert'])" > "$CA_CERT"

    echo "mTLS Certificates Acquired Successfully"
else
    echo "mTLS Identity Already Configured"
fi

# Function to collect system fingerprint
get_fingerprint() {
    HOSTNAME=$(hostname)
    OS_NAME=$(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d'"' -f2 || uname -s)
    KERNEL=$(uname -r)
    UPTIME=$(uptime -p 2>/dev/null || uptime)
    
    # Security software detection
    AV_LIST="[]"
    if command -v clamscan &> /dev/null; then
        AV_LIST='["ClamAV"]'
    elif command -v sophos-av &> /dev/null; then
        AV_LIST='["Sophos"]'
    fi
    
    # Network interfaces
    if command -v ip &> /dev/null; then
        IP_INFO=$(ip -j addr 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps([{'ip': i['addr_info'][0]['local'], 'interface': i['ifname']} for i in data if i.get('addr_info')]))" 2>/dev/null || echo '[]')
    else
        IP_INFO='[]'
    fi
    
    # Return JSON
    python3 -c "import json; print(json.dumps({
        'hostname': '$HOSTNAME',
        'os': '$OS_NAME',
        'kernel': '$KERNEL',
        'uptime': '$UPTIME',
        'security_software': $AV_LIST,
        'interfaces': $IP_INFO
    }))"
}

# Step 2: Start Heartbeat Service with Task Processing
echo "Starting Secure Heartbeat Service..."

(
    while true; do
        # Send heartbeat and get tasks
        RESPONSE=$(curl -s -k \
            --cert "$CLIENT_CERT" \
            --key "$CLIENT_KEY" \
            -X POST "$URL/api/v1/agents/heartbeat" \
            -H "Content-Type: application/json" \
            -d "{\"token\": \"$TOKEN\", \"metrics\": {}}")
        
        # Check for tasks
        TASK_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('tasks', [])))" 2>/dev/null || echo "0")
        
        if [ "$TASK_COUNT" -gt 0 ]; then
            # Process each task
            for i in $(seq 0 $((TASK_COUNT - 1))); do
                TASK_TYPE=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['tasks'][$i]['type'])" 2>/dev/null)
                TASK_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['tasks'][$i]['task_id'])" 2>/dev/null)
                
                if [ "$TASK_TYPE" = "fingerprint" ]; then
                    # Execute fingerprint scan
                    FP_DATA=$(get_fingerprint)
                    
                    # Send result
                    RESULT_PAYLOAD=$(python3 -c "import json; print(json.dumps({
                        'token': '$TOKEN',
                        'task_id': '$TASK_ID',
                        'result': $FP_DATA
                    }))")
                    
                    curl -s -k \
                        --cert "$CLIENT_CERT" \
                        --key "$CLIENT_KEY" \
                        -X POST "$URL/api/v1/agents/tasks/result" \
                        -H "Content-Type: application/json" \
                        -d "$RESULT_PAYLOAD" > /dev/null
                fi
            done
        fi
        
        sleep 10
    done
) &

echo "Agent Connected Successfully - Running in Background"
echo "Agent can now receive and execute tasks from the dashboard"
