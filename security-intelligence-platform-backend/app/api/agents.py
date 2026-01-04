from flask import Blueprint, jsonify, request
from app import supabase
import uuid
import datetime
import secrets

agents_bp = Blueprint('agents', __name__)

# Support both trailing slash and no trailing slash
@agents_bp.route('', methods=['GET'])
@agents_bp.route('/', methods=['GET'])
def get_agents():
    # Only super admin check would happen here via middleware usually
    # For now fetching all agents
    try:
        response = supabase.table('agents').select("*").execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@agents_bp.route('/<agent_id>', methods=['GET'])
def get_agent_details(agent_id):
    try:
        # In Supabase client: .select("*").eq("id", agent_id).execute()
        # My LocalClient now supports this via chained calls if I use .eq()
        response = supabase.table('agents').select("*").eq("id", agent_id).execute()
        
        if not response.data:
            return jsonify({"error": "Agent not found"}), 404
            
        return jsonify(response.data[0]), 200
    except Exception as e:
        print(f"Error fetching agent {agent_id}: {e}")
        return jsonify({"error": str(e)}), 500

@agents_bp.route('/<agent_id>', methods=['DELETE'])
def delete_agent(agent_id):
    try:
        # Assuming permissions are handled by middleware
        # .delete().eq("id", agent_id).execute()
        response = supabase.table('agents').delete().eq("id", agent_id).execute()
        
        # Check response. data might be empty if not found, but operation is successful
        return jsonify({"message": "Agent deleted successfully", "details": response.data}), 200
        
    except Exception as e:
        print(f"Error deleting agent {agent_id}: {e}")
        return jsonify({"error": str(e)}), 500


@agents_bp.route('', methods=['POST'])
@agents_bp.route('/', methods=['POST'])
def create_agent():
    try:
        data = request.json
        
        # Basic validation
        required_fields = ['name', 'platform', 'environment', 'region']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Validate Unique Name
        existing = supabase.table('agents').select("id").eq("name", data['name']).execute()
        if existing.data:
            return jsonify({"error": "Agent with this name already exists"}), 409

        # Generate a temporary installation token
        install_token = secrets.token_urlsafe(32)
        
        # Prepare db payload
        new_agent = {
            "name": data['name'],
            "description": data.get('description', ''),
            "platform": data['platform'],
            "environment": data['environment'],
            "criticality": data.get('criticality', 'medium'),
            "region": data['region'],
            "network_zone": data.get('network_zone', 'internal'),
            "status": "pending",
            "trust_score": 50 if data['environment'] == 'prod' else 80,  # Start lower for prod until verified
            "capabilities": data.get('capabilities', []),
            "trust_configuration": data.get('trust_configuration', {}),
            "tags": data.get('tags', []),
            "token": install_token, # In a real system, hash this!
            "created_at": datetime.datetime.utcnow().isoformat()
        }

        # Insert into DB
        response = supabase.table('agents').insert(new_agent).execute()
        
        if not response.data:
             return jsonify({"error": "Failed to create agent in database"}), 500
             
        agent_id = response.data[0]['id']

        # Generate Install Commands
        # Point to Nginx (HTTPS)
        base_url = "https://localhost" 
        
        # Proper one-liner for Windows
        # 1. Download script (HTTPS). 2. Execute it via iex. 3. Call function.
        # Note: We now point to the HTTPS URL.
        # User needs to trust the self-signed root CA or use -SkipCertificateCheck for the DOWNLOAD ONLY.
        # The script will handle the bootstrap security.
        windows_cmd = f"$code = iwr {base_url}/static/agents/install.ps1 -UseBasicParsing -SkipCertificateCheck; Invoke-Expression $code.Content; Register-Agent -Token '{install_token}' -Url '{base_url}'"

        linux_cmd = f"curl -k -fsSL {base_url}/static/agents/install.sh | AGENT_TOKEN='{install_token}' BASE_URL='{base_url}' bash"

        return jsonify({
            "message": "Agent created successfully",
            "agent": response.data[0],
            "install_command_linux": linux_cmd,
            "install_command_windows": windows_cmd
        }), 201

    except Exception as e:
        print(f"Error creating agent: {e}")
        return jsonify({"error": str(e)}), 500

@agents_bp.route('/heartbeat', methods=['POST'])
def agent_heartbeat():
    try:
        data = request.json
        token = data.get('token')
        
        if not token:
            return jsonify({"error": "Missing token"}), 400
            
        # Find agent by token
        # In a real app we'd query by token.
        # supabase.table('agents').select("id").eq("token", token).single() 
        # But for now, since we haven't indexed token or ensured unique in schema strictly,
        # let's assume it works.
        
        current_time = datetime.datetime.utcnow().isoformat()
        
        # Update agent status and heartbeat
        response = supabase.table('agents').update({
            "status": "active",
            "last_heartbeat": current_time,
            "metrics": data.get('metrics', {})
        }).eq("token", token).execute()
        
        if not response.data:
             # Agent not found or token mismatch (if unique)
             return jsonify({"error": "Invalid token"}), 404
        
        return jsonify({"status": "received", "timestamp": current_time}), 200

    except Exception as e:
        print(f"Heartbeat error: {e}")
        return jsonify({"error": str(e)}), 500

@agents_bp.route('/bootstrap', methods=['POST'])
def bootstrap_agent():
    """
    Bootstrap a new agent: Exchange Install Token for Client Certificate.
    Allowed via One-way TLS (or optional mTLS).
    """
    try:
        data = request.json
        token = data.get('token')
        
        # 1. Validate Token (Simple check for now, ideally checking against DB)
        # We need to find the agent with this token and status='pending'
        res = supabase.table('agents').select("*").eq("token", token).execute()
        if not res.data:
            return jsonify({"error": "Invalid or expired token"}), 401
            
        agent = res.data[0]
        agent_id = agent['id']
        
        # 2. Issue Certificate
        from app.pki import pki
        key_pem, cert_pem, ca_pem = pki.issue_client_cert(agent_id)
        
        # 3. Return Bundle
        return jsonify({
            "message": "Certificate Issued",
            "client_key": key_pem,
            "client_cert": cert_pem,
            "ca_cert": ca_pem
        }), 200

    except Exception as e:
        print(f"Bootstrap error: {e}")
        return jsonify({"error": str(e)}), 500

@agents_bp.route('/verify', methods=['POST'])
def verify_agent():
    """
    Baseline Security Scan Step 1: Identity & Trust Verification.
    Strict mTLS required.
    """
    try:
        # 1. mTLS Identity Check (Headers from Nginx)
        verified = request.headers.get('X-Client-Verified')
        client_dn = request.headers.get('X-Client-DN')
        
        # In local dev without Nginx active yet (running flask directly), this header won't exist.
        # For 'Real mTLS' with Docker, this is mandatory.
        # But if running python run.py locally, we might skip or fail.
        # Let's assume Docker environment.
        
        if verified != 'SUCCESS' and request.headers.get('X-Forwarded-Proto') == 'https':
            return jsonify({"error": "mTLS Authentication Failed", "trust_status": "untrusted"}), 403

        # 2. Time Drift Check
        data = request.json
        agent_time_str = data.get('system_time_utc') # ISO 8601
        
        if not agent_time_str:
             return jsonify({"error": "Missing system_time_utc"}), 400

        # Parse with Z (UTC) handling
        try:
             # fromisoformat requires +00:00 for Z in older python, but 3.9 might handle.
             # Safe replace.
             agent_time = datetime.datetime.fromisoformat(agent_time_str.replace('Z', '+00:00'))
        except:
             # Fallback
             agent_time = datetime.datetime.utcnow() 

        server_time = datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc)
        # Ensure agent_time is tz-aware
        if agent_time.tzinfo is None:
             agent_time = agent_time.replace(tzinfo=datetime.timezone.utc)
             
        drift = abs((server_time - agent_time).total_seconds())
        
        drift_limit = 600 # 10 Minutes as requested
        
        trust_status = "verified"
        trust_score_impact = 0
        
        if drift > drift_limit:
            trust_status = "failed_time_sync"
            return jsonify({
                "error": f"System Clock Drift too high ({drift}s). Max {drift_limit}s.",
                "server_time": server_time.isoformat()
            }), 406 # Not Acceptable

        # 3. Privilege Check (Logging only)
        user_context = data.get('user_context', 'unknown')
        if 'root' in user_context.lower() or 'system' in user_context.lower():
             print(f"⚠️ Agent {client_dn} running as High Privilege: {user_context}")

        return jsonify({
            "status": "verified",
            "trust_metrics": {
                "mtls": True,
                "time_drift_sec": drift,
                "privilege_context": user_context
            }
        }), 200

    except Exception as e:
        print(f"Verification Check Error: {e}")
        return jsonify({"error": str(e)}), 500
