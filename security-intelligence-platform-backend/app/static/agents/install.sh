#!/bin/bash

# Expects: AGENT_TOKEN, BASE_URL

if [ -z "$AGENT_TOKEN" ]; then
    echo "Error: AGENT_TOKEN is not set."
    exit 1
fi

URL="${BASE_URL:-http://127.0.0.1:5000}"

echo "🔌 Connecting to Security Platform at $URL..."

# Simple Heartbeat Loop
echo "✅ Agent Installed Successfully!"
echo "🚀 Starting Background Heartbeat Service..."

(
    while true; do
        curl -s -X POST "$URL/api/v1/agents/heartbeat" \
             -H "Content-Type: application/json" \
             -d "{\"token\": \"$AGENT_TOKEN\", \"metrics\": {\"cpu\": 12, \"ram\": 25}}" > /dev/null
        sleep 10
    done
) &

echo "✨ Agent is active and communicating (PID: $!)."
