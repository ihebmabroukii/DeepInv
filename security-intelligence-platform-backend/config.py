import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_secret_key')
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    DEBUG = os.getenv('FLASK_DEBUG', 'False') == 'True'
    SWAGGER = {
        'title': 'Security Intelligence Platform API',
        'uiversion': 3,
        'version': '1.0',
        'description': 'API for the AI-Driven Security Intelligence Platform',
        'specs_route': '/apidocs/'
    }
