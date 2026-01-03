from flask import jsonify
from app.api import bp
from app.auth.middleware import token_required

@bp.route('/dashboard/overview', methods=['GET'])
@token_required
def get_dashboard_overview():
    """
    Get Overview Dashboard Data
    Includes Global Risk Score and high-level status.
    ---
    tags:
      - Dashboard
    operationId: getDashboardOverview
    security:
      - Bearer: []
    responses:
      200:
        description: Dashboard overview data
        schema:
          type: object
          properties:
            risk_score:
              type: integer
              description: Global Risk Score (0-100)
              example: 78
            risk_level:
              type: string
              description: specific risk level
              enum: [low, medium, high, critical]
              example: "medium"
            environment:
              type: string
              example: "Production"
            active_threats:
              type: integer
              example: 3
    """
    # Mock data for now
    data = {
        'risk_score': 78,
        'risk_level': 'medium',
        'environment': 'Production',
        'active_threats': 3
    }
    return jsonify(data)

@bp.route('/dashboard/insights', methods=['GET'])
@token_required
def get_ai_insights():
    """
    Get Top AI Insights
    Natural language insights about security posture.
    ---
    tags:
      - Dashboard
    operationId: getAiInsights
    security:
      - Bearer: []
    responses:
      200:
        description: List of AI insights
        schema:
          type: object
          properties:
            insights:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: string
                  severity:
                    type: string
                    enum: [critical, high, medium, low]
                  message:
                    type: string
                    example: "Your biggest risk today is outdated TLS on 2 production servers."
                  timestamp:
                    type: string
    """
    insights = [
        {
            'id': '1',
            'severity': 'high',
            'message': 'Your biggest risk today is outdated TLS on 2 production servers.',
            'timestamp': '2025-12-22T10:00:00Z'
        },
        {
            'id': '2',
            'severity': 'medium',
            'message': 'An unusual login pattern was detected from a new IP in the Finance subnet.',
            'timestamp': '2025-12-22T09:30:00Z'
        }
    ]
    return jsonify({'insights': insights})
