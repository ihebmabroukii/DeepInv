"""
Audit Log API Endpoints
Super admin only - view and analyze user activity logs.
"""

from flask import Blueprint, request, jsonify
from app.local_db import LocalClient
import datetime

audit_bp = Blueprint('audit', __name__)
supabase = LocalClient()

def is_super_admin(request):
    """Check if the current user is a super admin."""
    # In production, this would check the JWT token or session
    # For now, we'll check a header (you should integrate with your auth system)
    user_role = request.headers.get('X-User-Role')
    return user_role == 'super_admin'

@audit_bp.route('/logs', methods=['GET'])
def get_audit_logs():
    """
    Get audit logs with filtering and pagination.
    Super admin only.
    """
    try:
        # Check authorization
        if not is_super_admin(request):
            return jsonify({"error": "Forbidden - Super admin access required"}), 403
        
        # Get query parameters
        user_id = request.args.get('user_id')
        action = request.args.get('action')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        
        # Build query
        query = supabase.table('audit_logs').select("*")
        
        if user_id:
            query = query.eq("user_id", user_id)
        if action:
            query = query.eq("action", action)
        if start_date:
            query = query.gte("timestamp", start_date)
        if end_date:
            query = query.lte("timestamp", end_date)
        
        # Execute with pagination
        response = query.order("timestamp", desc=True).range(offset, offset + limit - 1).execute()
        
        return jsonify({
            "logs": response.data,
            "count": len(response.data),
            "offset": offset,
            "limit": limit
        }), 200
        
    except Exception as e:
        print(f"Audit logs error: {e}")
        return jsonify({"error": str(e)}), 500

@audit_bp.route('/stats', methods=['GET'])
def get_audit_stats():
    """
    Get audit log statistics.
    Super admin only.
    """
    try:
        # Check authorization
        if not is_super_admin(request):
            return jsonify({"error": "Forbidden - Super admin access required"}), 403
        
        # Get activity counts by action
        # Note: This is a simplified version. In production, use SQL aggregations
        all_logs = supabase.table('audit_logs').select("action, user_email").execute()
        
        action_counts = {}
        user_counts = {}
        
        for log in all_logs.data:
            action = log.get('action', 'unknown')
            user = log.get('user_email', 'unknown')
            
            action_counts[action] = action_counts.get(action, 0) + 1
            user_counts[user] = user_counts.get(user, 0) + 1
        
        return jsonify({
            "total_logs": len(all_logs.data),
            "by_action": action_counts,
            "by_user": user_counts
        }), 200
        
    except Exception as e:
        print(f"Audit stats error: {e}")
        return jsonify({"error": str(e)}), 500

@audit_bp.route('/users', methods=['GET'])
def get_audit_users():
    """
    Get list of users who have activity in audit logs.
    Super admin only.
    """
    try:
        # Check authorization
        if not is_super_admin(request):
            return jsonify({"error": "Forbidden - Super admin access required"}), 403
        
        # Get distinct users
        response = supabase.table('audit_logs').select("user_id, user_email, user_role").execute()
        
        # Deduplicate
        users_map = {}
        for log in response.data:
            user_id = log.get('user_id')
            if user_id and user_id not in users_map:
                users_map[user_id] = {
                    "user_id": user_id,
                    "email": log.get('user_email'),
                    "role": log.get('user_role')
                }
        
        return jsonify({"users": list(users_map.values())}), 200
        
    except Exception as e:
        print(f"Audit users error: {e}")
        return jsonify({"error": str(e)}), 500
