import subprocess
import json

try:
    result = subprocess.run(
        ['docker', 'ps', '-a', '--format', '{"name":"{{.Names}}","state":"{{.State}}","status":"{{.Status}}"}'],
        capture_output=True, text=True, check=True
    )
    containers = []
    for line in result.stdout.strip().split('\n'):
        if line:
            containers.append(json.loads(line))
            
    with open('docker_status.json', 'w') as f:
        json.dump(containers, f, indent=2)
    print("Successfully wrote docker_status.json")
except Exception as e:
    print(f"Error: {e}")
