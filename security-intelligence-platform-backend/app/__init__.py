from flask import Flask
from flasgger import Swagger
from flask_cors import CORS
from config import Config

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize Extensions
    CORS(app)
    Swagger(app)

    # Register Blueprints
    from app.api import bp as api_bp
    app.register_blueprint(api_bp, url_prefix='/api/v1')

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
