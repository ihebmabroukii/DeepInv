from flask import jsonify
from app.api import bp
from app.auth.middleware import token_required

@bp.route('/assets/graph', methods=['GET'])
@token_required
def get_asset_graph():
    """
    Get Asset & Trust Graph Data
    Returns nodes and edges for visualizing infrastructure trust relationships.
    ---
    tags:
      - Assets
    operationId: getAssetGraph
    security:
      - Bearer: []
    responses:
      200:
        description: Graph data object
        schema:
          type: object
          properties:
            nodes:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: string
                  label:
                    type: string
                  type:
                    type: string
                    enum: [server, database, load_balancer, firewall]
                  status:
                    type: string
                    enum: [healthy, warning, compromised]
            edges:
              type: array
              items:
                type: object
                properties:
                  source:
                    type: string
                  target:
                    type: string
                  type:
                    type: string
                    enum: [trust, connect]
                  status:
                    type: string
                    enum: [secure, insecure]
    """
    
    nodes = [
        {'id': 'lb-01', 'label': 'Load Balancer 01', 'type': 'load_balancer', 'status': 'healthy'},
        {'id': 'web-01', 'label': 'Web Server 01', 'type': 'server', 'status': 'warning'},
        {'id': 'web-02', 'label': 'Web Server 02', 'type': 'server', 'status': 'healthy'},
        {'id': 'db-01', 'label': 'Primary DB', 'type': 'database', 'status': 'healthy'},
        {'id': 'auth-svc', 'label': 'Auth Service', 'type': 'server', 'status': 'healthy'}
    ]
    
    edges = [
        {'source': 'lb-01', 'target': 'web-01', 'type': 'connect', 'status': 'insecure'}, # Creating a risk scenario
        {'source': 'lb-01', 'target': 'web-02', 'type': 'connect', 'status': 'secure'},
        {'source': 'web-01', 'target': 'db-01', 'type': 'trust', 'status': 'secure'},
        {'source': 'web-02', 'target': 'db-01', 'type': 'trust', 'status': 'secure'},
        {'source': 'web-01', 'target': 'auth-svc', 'type': 'connect', 'status': 'secure'}
    ]
    
    return jsonify({'nodes': nodes, 'edges': edges})
