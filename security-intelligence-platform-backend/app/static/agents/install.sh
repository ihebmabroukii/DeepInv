
#!/bin/bash
set -e

# Default URL
URL="${BASE_URL:-https://localhost}"
TOKEN="${AGENT_TOKEN}"

if [ -z "$TOKEN" ]; then
    echo "❌ Error: AGENT_TOKEN is required."
    exit 1
fi

echo "🔌 Initializing Agent Security..."

# Path setup
AGENT_DATA_DIR="/var/lib/security-agent"
# If running without sudo, use local dir
if [ "$EUID" -ne 0 ]; then
    AGENT_DATA_DIR="$HOME/.security-agent"
fi
CERTS_DIR="$AGENT_DATA_DIR/certs"

mkdir -p "$CERTS_DIR"

CLIENT_CERT="$CERTS_DIR/client.crt"
CLIENT_KEY="$CERTS_DIR/client.key"
CA_CERT="$CERTS_DIR/root_ca.crt"

# --- Step 1: Bootstrap (Get Certificates) ---
if [ ! -f "$CLIENT_CERT" ]; then
    echo "🔒 Bootstrapping Trust (Fetching Certificate)..."
    
    # Bootstrap Call (One-way TLS allowed, skipping verification for self-signed dev certs)
    RESPONSE=$(curl -k -s -X POST "$URL/api/v1/agents/bootstrap" \
        -H "Content-Type: application/json" \
        -d "{\"token\": \"$TOKEN\"}")

    # Check for error
    if echo "$RESPONSE" | grep -q "error"; then
        echo "❌ Bootstrap Failed: $RESPONSE"
        exit 1
    fi

    # Extract Certs (Using jq would be better, but basic parsing for portability)
    # Ideally: echo "$RESPONSE" | jq -r .client_key > "$CLIENT_KEY"
    # Fallback to python for JSON parsing since python is likely installed if the backend is python
    
    echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['client_key'])" > "$CLIENT_KEY"
    echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['client_cert'])" > "$CLIENT_CERT"
    echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['ca_cert'])" > "$CA_CERT"

    echo "✅ Identity Certificates Acquired."
else
    echo "✅ Identity Found."
fi

# --- Step 2: Agent Loop ---
echo "✅ Agent Installed Successfully! Starting Heartbeat..."

(
    while true; do
        # Heartbeat with mTLS
        # Using the fetched certs
        curl -s -k \
            --cert "$CLIENT_CERT" \
            --key "$CLIENT_KEY" \
            -X POST "$URL/api/v1/agents/heartbeat" \
            -H "Content-Type: application/json" \
            -d "{\"token\": \"$TOKEN\", \"metrics\": {\"cpu\": 10}}" > /dev/null
        
        sleep 10
    done
) &

echo "✨ Service Started in Background."
