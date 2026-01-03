from app import create_app
import json
import os

# Set dummy env vars to avoid startup errors if keys are missing
os.environ['SUPABASE_URL'] = 'https://example.supabase.co'
os.environ['SUPABASE_KEY'] = 'dummy-key'

app = create_app()

with app.app_context():
    swag = app.swag
    # This generates the full spec
    spec = swag.get_apispecs()
    
    with open('swagger.json', 'w') as f:
        json.dump(spec, f, indent=2)
    print("Swagger JSON exported to swagger.json")
