from flask import jsonify, request
from app.api import bp
from app.auth.middleware import token_required

@bp.route('/events', methods=['GET'])
@token_required
def get_security_events():
    """
    Get Security Events
    List of security events with AI reasoning.
    ---
    tags:
      - Events
    operationId: getSecurityEvents
    security:
      - Bearer: []
    responses:
      200:
        description: List of security events
        schema:
          type: object
          properties:
            events:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: string
                  type:
                    type: string
                  severity:
                    type: string
                  description:
                    type: string
                  ai_reasoning:
                    type: string
                  confidence_score:
                    type: integer
                  timestamp:
                    type: string
    """
    events = [
        {
            'id': 'evt-001',
            'type': 'TLS_VULNERABILITY',
            'severity': 'high',
            'description': 'TLS 1.0 detected on inbound connection',
            'ai_reasoning': 'Legacy protocol usage detects potential downgrade attack vector.',
            'confidence_score': 95,
            'timestamp': '2025-12-22T10:15:00Z'
        },
        {
            'id': 'evt-002',
            'type': 'ANOMALOUS_ACCESS',
            'severity': 'medium',
            'description': 'Access to sensitive financial DB from non-whitelisted IP',
            'ai_reasoning': 'Pattern deviation: User typically accesses from 10.0.1.x subnet.',
            'confidence_score': 88,
            'timestamp': '2025-12-22T11:00:00Z'
        }
    ]
    return jsonify({'events': events})

@bp.route('/events/<event_id>/remediate', methods=['POST'])
@token_required
def get_remediation(event_id):
    """
    Get AI Remediation Plan
    Returns specific shell commands or config fixes.
    ---
    tags:
      - Events
    operationId: remediateEvent
    security:
      - Bearer: []
    parameters:
      - name: event_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Remediation plan
        schema:
          type: object
          properties:
            action:
              type: string
            commands:
              type: array
              items:
                type: string
            explanation:
              type: string
    """
    # Mock intelligent response based on ID
    if 'evt-001' in event_id or True: # Default mock
        response = {
            'action': 'Disable TLS 1.0/1.1',
            'commands': [
                '# Update Nginx Configuration',
                'ssl_protocols TLSv1.2 TLSv1.3;',
                '# Restart Nginx',
                'systemctl restart nginx'
            ],
            'explanation': 'Disabling older protocols prevents downgrade attacks (POODLE, BEAST) and ensures compliance with PCI-DSS.'
        }
        return jsonify(response)
    
    return jsonify({'message': 'Remediation not found'}), 404
