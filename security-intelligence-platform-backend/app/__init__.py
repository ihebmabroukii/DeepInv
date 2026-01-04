from flask import Flask
from flasgger import Swagger
from flask_cors import CORS
from config import Config
import os

# Define the db client variable globally for import by other modules
supabase = None

def create_app(config_class=Config):
    global supabase
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize Extensions
    CORS(app)
    Swagger(app)

    # Initialize Database Client
    if app.config.get('USE_LOCAL_DB', True):
        from app.local_db import LocalClient
        print("Using Local Database (PostgreSQL)")
        print("Using Local Database (PostgreSQL)")
        supabase = LocalClient()
        
        # Initialize PKI (Generate CA if missing)
        from app.pki import pki
        if app.config.get('FLASK_ENV') != 'development' or True: # Always init for this demo
             pki.ensure_root_ca()
             pki.generate_server_cert(hostname="localhost")
             pki.generate_server_cert(hostname="platform.bank.tn")
    else:
        from supabase import create_client
        print("Using Remote Supabase")
        url = app.config['SUPABASE_URL']
        key = app.config['SUPABASE_KEY']
        if not url or not key:
            print("WARNING: Supabase URL/Key missing but USE_LOCAL_DB is False.")
        supabase = create_client(url, key)

    # Register Blueprints
    from app.api import bp as api_bp
    app.register_blueprint(api_bp, url_prefix='/api/v1')
    
    from app.api.agents import agents_bp
    app.register_blueprint(agents_bp, url_prefix='/api/v1/agents')

    @app.route('/')
    def index():
        return {
            "message": "Security Intelligence Platform API",
            "docs": "/apidocs",
            "health": "/health",
            "status": "online"
        }, 200

    @app.route('/health')
    def health_check():
        """
        Health Check Endpoint
        ---
        tags:
          - System
        responses:
          200:
            description: API is healthy
            schema:
              type: object
              properties:
                status:
                  type: string
                  example: "healthy"
        """
        return {'status': 'healthy'}, 200

    return app
