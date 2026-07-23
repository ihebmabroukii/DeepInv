import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_secret_key')
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    USE_LOCAL_DB = os.getenv('USE_LOCAL_DB', 'True') == 'True'
    LOCAL_DB_URL = os.getenv('LOCAL_DB_URL', 'postgresql://admin:change_me@localhost:5432/security_platform')
    DEBUG = os.getenv('FLASK_DEBUG', 'False') == 'True'
    SWAGGER = {
        'title': 'Security Intelligence Platform API',
        'uiversion': 3,
        'version': '1.0',
        'description': 'API for the AI-Driven Security Intelligence Platform',
        'specs_route': '/apidocs/'
    }
