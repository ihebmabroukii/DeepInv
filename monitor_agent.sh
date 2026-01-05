#!/bin/bash
# Quick test script to monitor agent connection

echo "=== Real-Time Agent Connection Monitor ==="
echo ""
echo "1. Backend Logs (Heartbeats):"
docker logs -f security_platform_backend --tail 20 | grep -i "heartbeat\|bootstrap"
