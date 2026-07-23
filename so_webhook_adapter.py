"""
Security Onion → SOC-AI Webhook Adapter
========================================
Run this on your Windows host machine.

It listens on port 8002 for incoming webhook POSTs from Security Onion (via Elastalert),
unwraps the Elasticsearch envelope, and forwards clean normalized payloads to the
SOC-AI container on port 8001.

Install dependencies:
    pip install flask requests

Run:
    python so_webhook_adapter.py
"""

from flask import Flask, request, jsonify
import requests
import json
import logging
from datetime import datetime, timezone

# ── Config ────────────────────────────────────────────────────────────────────
AI_CONTAINER_URL = "http://127.0.0.1:8001/api/v1/alerts/manual"
LISTEN_PORT      = 8002
LISTEN_HOST      = "0.0.0.0"   # Reachable from the Security Onion VM
# ──────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("so-adapter")

app = Flask(__name__)


def detect_source_system(event: dict) -> str:
    """
    Detect whether this is a Suricata or Wazuh event.
    Handles both ECS format (event.module) and legacy Suricata/Wazuh formats.
    """
    # ECS format (Security Onion primary): check event.module
    event_meta = event.get("event", {})
    if isinstance(event_meta, dict):
        module = event_meta.get("module", "").lower()
        if "suricata" in module:
            return "suricata"
        if "wazuh" in module or "ossec" in module:
            return "wazuh"

    # Legacy Suricata eve.json: event_type at root
    if "event_type" in event:
        return "suricata"

    # Wazuh: rule block with level
    if "rule" in event and "level" in event.get("rule", {}):
        return "wazuh"

    # Index name hint
    index = event.get("_index", "")
    if "suricata" in index.lower():
        return "suricata"
    if "wazuh" in index.lower() or "ossec" in index.lower():
        return "wazuh"

    # Default — Security Onion primary source is Suricata
    return "suricata"


def unwrap_payload(raw_body: dict) -> list:
    """
    Elastalert and Security Onion webhooks can send alerts in multiple formats.
    This function normalizes all of them and returns a LIST of raw event dicts.
    
    Supported formats:
      1. Elastalert flat hits:        {"hits": [{"_source": {...}}, ...]}
      2. ES nested hits:              {"hits": {"hits": [{"_source": {...}}]}}
      3. Single ES document:          {"_source": {...}}
      4. Raw event (no envelope):     {...alert fields...}
    """
    # Format 1: Elastalert flat list {"hits": [{...}, ...]}
    hits_val = raw_body.get("hits")
    if isinstance(hits_val, list) and hits_val:
        log.info(f"Format 1 (Elastalert flat hits): {len(hits_val)} event(s)")
        return [h.get("_source", h) for h in hits_val if isinstance(h, dict)]

    # Format 2: Nested ES hits {"hits": {"hits": [...]}}
    if isinstance(hits_val, dict):
        nested = hits_val.get("hits", [])
        if nested and isinstance(nested, list):
            log.info(f"Format 2 (ES nested hits): {len(nested)} event(s)")
            return [h.get("_source", h) for h in nested if isinstance(h, dict)]

    # Format 3: Single document {"_source": {...}}
    if "_source" in raw_body:
        log.info("Format 3 (single ES document)")
        return [raw_body["_source"]]

    # Format 4: Raw event
    log.info("Format 4 (raw event — no envelope detected)")
    return [raw_body]


def get_alert_name(event: dict) -> str:
    """Extract the best human-readable name from ECS or legacy fields."""
    # ECS: rule.name
    rule = event.get("rule", {})
    if isinstance(rule, dict) and rule.get("name"):
        return rule["name"]
    # Suricata legacy: alert.signature
    alert_block = event.get("alert", {})
    if isinstance(alert_block, dict) and alert_block.get("signature"):
        return alert_block["signature"]
    # Wazuh: rule.description
    if isinstance(rule, dict) and rule.get("description"):
        return rule["description"]
    # ECS: message field
    if event.get("message"):
        return str(event["message"])[:120]
    return "Unknown Alert"


def is_valid_alert(event: dict) -> bool:
    """
    Returns True if this event represents an actual security alert.
    Filters out Suricata flow/stats/heartbeat records.
    """
    # For legacy Suricata events, check event_type
    event_type = event.get("event_type", "")
    if event_type and event_type not in ("alert", "dns", "http", "tls", "smtp", ""):
        log.info(f"Skipping Suricata non-alert event_type='{event_type}'")
        return False

    # For ECS events, event.kind must be 'alert' or 'event' (not 'metric' or 'state')
    event_meta = event.get("event", {})
    if isinstance(event_meta, dict):
        kind = event_meta.get("kind", "")
        if kind and kind not in ("alert", "event", ""):
            log.info(f"Skipping ECS event with kind='{kind}'")
            return False

    return True


@app.route("/webhook", methods=["POST"])
def handle_webhook():
    """Main webhook receiver for Security Onion / Elastalert alert events."""
    try:
        raw_body = request.get_json(force=True, silent=True)

        if raw_body is None:
            log.warning("Received empty or non-JSON body")
            return jsonify({"error": "Invalid JSON body"}), 400

        log.info(f"Received webhook from {request.remote_addr} | top-level keys: {list(raw_body.keys())}")

        # 1. Unwrap — may return multiple events
        events = unwrap_payload(raw_body)
        log.info(f"Extracted {len(events)} event(s) from payload")

        forwarded = 0
        skipped   = 0

        for event in events:
            # 2. Skip non-alert events (flows, heartbeats, etc.)
            if not is_valid_alert(event):
                skipped += 1
                continue

            # 3. Detect source
            source_system = detect_source_system(event)
            alert_name    = get_alert_name(event)

            # 4. Build SOC-AI payload
            ai_payload = {
                "source_system": source_system,
                "timestamp": (
                    event.get("@timestamp")
                    or event.get("timestamp")
                    or datetime.now(timezone.utc).isoformat()
                ),
                "original_data": event
            }

            log.info(f"→ [{source_system.upper()}] {alert_name}")

            # 5. Forward
            response = requests.post(AI_CONTAINER_URL, json=ai_payload, timeout=8)
            log.info(f"  SOC-AI HTTP {response.status_code}: {response.text[:120]}")

            if response.ok:
                forwarded += 1
            else:
                skipped += 1

        return jsonify({
            "status": "processed",
            "total_events": len(events),
            "forwarded": forwarded,
            "skipped": skipped
        }), 200

    except requests.exceptions.ConnectionError:
        log.error("Could not reach SOC-AI container at port 8001. Is it running?")
        return jsonify({"error": "SOC-AI container unreachable"}), 503
    except Exception as e:
        log.exception(f"Unexpected error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "running",
        "adapter": "Security Onion → SOC-AI",
        "listening_on": f"0.0.0.0:{LISTEN_PORT}",
        "forwarding_to": AI_CONTAINER_URL
    })


@app.route("/test", methods=["POST"])
def test_alert():
    """
    Send a synthetic Suricata alert to test the full pipeline.
    Run: curl -X POST http://localhost:8002/test
    """
    demo_alert = {
        "event_type": "alert",
        "@timestamp": datetime.now(timezone.utc).isoformat(),
        "src_ip": "10.0.0.50",
        "dest_ip": "192.168.1.10",
        "src_port": 54321,
        "dest_port": 443,
        "proto": "TCP",
        "app_proto": "tls",
        "alert": {
            "signature": "ET EXPLOIT Apache Log4j RCE Attempt (JNDI Lookup)",
            "category": "Attempted Administrator Privilege Gain",
            "severity": 1,
            "signature_id": 2034647,
        }
    }
    ai_payload = {
        "source_system": "suricata",
        "timestamp": demo_alert["@timestamp"],
        "original_data": demo_alert
    }
    try:
        response = requests.post(AI_CONTAINER_URL, json=ai_payload, timeout=8)
        return jsonify({
            "status": "test_sent",
            "ai_response_code": response.status_code,
            "ai_response": response.json() if response.ok else response.text
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    log.info("=" * 60)
    log.info("  Security Onion → SOC-AI Webhook Adapter  (v2)")
    log.info(f"  Listening on : http://{LISTEN_HOST}:{LISTEN_PORT}/webhook")
    log.info(f"  Forwarding to: {AI_CONTAINER_URL}")
    log.info(f"  Health check : http://localhost:{LISTEN_PORT}/health")
    log.info(f"  Pipeline test: curl -X POST http://localhost:{LISTEN_PORT}/test")
    log.info("=" * 60)
    app.run(host=LISTEN_HOST, port=LISTEN_PORT, debug=False)
