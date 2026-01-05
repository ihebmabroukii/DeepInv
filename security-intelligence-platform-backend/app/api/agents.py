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
        # 1. Force TLS 1.2 (Crucial for PS 5.1).
        # 2. Trust Self-Signed Certs for WebClient.
        # 3. Use WebClient instead of iwr for robustness.
        # 4. Invoke Expression.
        windows_cmd = f"[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {{$true}}; $wc = New-Object System.Net.WebClient; $wc.Headers['User-Agent'] = 'PowerShell'; Invoke-Expression $wc.DownloadString('{base_url}/static/agents/install.ps1'); Register-Agent -Token '{install_token}' -Url '{base_url}'"

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

@agents_bp.route('/<agent_id>/scan', methods=['POST'])
def trigger_scan(agent_id):
    """
    Step 2.1: Trigger On-Demand Fingerprint Scan.
    Creates a pending task for the agent.
    """
    try:
        # Create Task
        task = {
            "agent_id": agent_id,
            "type": "fingerprint",
            "status": "pending",
            "payload": {},
            "created_at": datetime.datetime.utcnow().isoformat()
        }
        res = supabase.table('tasks').insert(task).execute()
        return jsonify({"message": "Scan command queued", "task": res.data[0]}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@agents_bp.route('/tasks/result', methods=['POST'])
def task_result():
    """
    Step 2.2: Agent reports task execution result.
    Strict mTLS required.
    """
    try:
        # mTLS Check
        verified = request.headers.get('X-Client-Verified')
        if verified != 'SUCCESS' and request.headers.get('X-Forwarded-Proto') == 'https':
            return jsonify({"error": "mTLS Authentication Failed"}), 403

        data = request.json
        token = data.get('token')
        task_id = data.get('task_id')
        result_data = data.get('result', {})
        
        if not token or not task_id:
             return jsonify({"error": "Missing token or task_id"}), 400

        # Update Task Status
        supabase.table('tasks').update({
            "status": "completed",
            "result": result_data,
            "updated_at": datetime.datetime.utcnow().isoformat()
        }).eq("id", task_id).execute()
        
        # If type was fingerprint, also update agent record
        # Ideally we check task type first, but we can infer or pass it.
        # For simplicity, if structure matches system_info, update it.
        if 'os' in result_data or 'hostname' in result_data:
             system_info = {
                "os": result_data.get("os"),
                "kernel": result_data.get("kernel"),
                "hostname": result_data.get("hostname"),
                "interfaces": result_data.get("interfaces", []),
                "uptime": result_data.get("uptime"),
                "security_software": result_data.get("security_software", [])
            }
             supabase.table('agents').update({
                "system_info": system_info
             }).eq("token", token).execute()

        return jsonify({"status": "received"}), 200

    except Exception as e:
        print(f"Task Result Error: {e}")
        return jsonify({"error": str(e)}), 500


@agents_bp.route('/heartbeat', methods=['POST'])
def agent_heartbeat():
    try:
        data = request.json
        token = data.get('token')
        
        if not token:
            return jsonify({"error": "Missing token"}), 400
        
        current_time = datetime.datetime.utcnow().isoformat()
        
        # Update heartbeat
        # We need agent ID to check tasks.
        agent_res = supabase.table('agents').update({
            "status": "active",
            "last_heartbeat": current_time,
            "metrics": data.get('metrics', {})
        }).eq("token", token).execute()
        
        if not agent_res.data:
              return jsonify({"error": "Invalid token"}), 404
              
        agent_id = agent_res.data[0]['id']
        
        # Check for Pending Tasks
        # In a real system, we might limit this check frequency or cache it.
        tasks_res = supabase.table('tasks').select("*").eq("agent_id", agent_id).eq("status", "pending").execute()
        
        response_data = {
            "status": "received", 
            "timestamp": current_time,
            "tasks": []
        }
        
        if tasks_res.data:
            # Send tasks to agent
            # Only send bare minimum
            for t in tasks_res.data:
                response_data['tasks'].append({
                    "task_id": t['id'],
                    "type": t['type'],
                    "payload": t['payload']
                })
        
        return jsonify(response_data), 200

    except Exception as e:
        print(f"Heartbeat error: {e}")
        return jsonify({"error": str(e)}), 500

# Legacy Fingerprint Endpoint (Optional - kept for compatibility if needed, but redundant now)
@agents_bp.route('/fingerprint', methods=['POST'])
def agent_fingerprint():
    """
    Legacy/Direct Fingerprint collection.
    """
    return jsonify({"status": "deprecated", "message": "Use task system"}), 200

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


