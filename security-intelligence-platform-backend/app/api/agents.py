from flask import Blueprint, jsonify, request
from app import supabase
import uuid
import datetime
import secrets

agents_bp = Blueprint('agents', __name__)

@agents_bp.route('/', methods=['GET'])
def get_agents():
    # Only super admin check would happen here via middleware usually
    # For now fetching all agents
    try:
        response = supabase.table('agents').select("*").execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
        # In a real scenario, the URL would point to the actual backend
        base_url = "https://platform.bank.tn" 
        
        linux_cmd = f"curl -fsSL {base_url}/agent/install.sh | sudo AGENT_TOKEN={install_token} bash"
        windows_cmd = f"iwr {base_url}/agent/install.ps1 | iex ; Register-Agent -Token {install_token}"

        return jsonify({
            "message": "Agent created successfully",
            "agent": response.data[0],
            "install_command_linux": linux_cmd,
            "install_command_windows": windows_cmd
        }), 201

    except Exception as e:
        print(f"Error creating agent: {e}")
        return jsonify({"error": str(e)}), 500
