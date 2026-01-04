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
        base_url = "http://127.0.0.1:5000" 
        
        # Proper one-liner for Windows
        # 1. Download script. 2. Execute it via iex. 3. Call function.
        # Note: 'iex' executes the script which defines Register-Agent. Then we call it.
        windows_cmd = f"iwr {base_url}/static/agents/install.ps1 | iex ; Register-Agent -Token '{install_token}' -Url '{base_url}'"

        linux_cmd = f"curl -fsSL {base_url}/static/agents/install.sh | AGENT_TOKEN='{install_token}' BASE_URL='{base_url}' bash"

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
