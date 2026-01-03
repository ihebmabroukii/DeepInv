from functools import wraps
from flask import request, jsonify, current_app
try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            # Initialize Supabase client
            url = current_app.config['SUPABASE_URL']
            key = current_app.config['SUPABASE_KEY']
            
            if not url or not key:
                 # If config is missing, maybe allow in dev or fail? failing is safer.
                 # For now, verify using getUser which verifies the token
                 return jsonify({'message': 'Server configuration error'}), 500

            supabase: Client = create_client(url, key)
            
            # Verify token by getting the user
            user = supabase.auth.get_user(token)
            
            if not user:
                 raise Exception("Invalid token")
                 
            # Store user info in request context if needed (e.g. g.user = user)

        except Exception as e:
            return jsonify({'message': 'Token is invalid!', 'error': str(e)}), 401

        return f(*args, **kwargs)

    return decorated
