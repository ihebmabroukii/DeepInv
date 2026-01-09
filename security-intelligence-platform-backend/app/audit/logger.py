"""
Audit Logging Middleware
Tracks all user activities for compliance and security monitoring.
"""

from app.local_db import LocalClient
import datetime

supabase = LocalClient()

def log_activity(user_id, user_email, user_role, action, resource_type=None, resource_id=None, details=None, request=None):
    """
    Log user activity to audit_logs table.
    
    Args:
        user_id: UUID of the user performing the action
        user_email: Email of the user
        user_role: Role of the user (super_admin, soc_analyst, etc.)
        action: Action performed (e.g., 'agent.create', 'user.delete')
        resource_type: Type of resource affected (e.g., 'agent', 'user')
        resource_id: ID of the resource affected
        details: Additional details as dictionary
        request: Flask request object (to extract IP and user agent)
    """
    try:
        ip_address = None
        user_agent = None
        
        if request:
            # Get IP address (handle proxy headers)
            ip_address = request.headers.get('X-Real-IP') or \
                        request.headers.get('X-Forwarded-For') or \
                        request.remote_addr
            user_agent = request.headers.get('User-Agent')
        
        audit_entry = {
            "user_id": user_id,
            "user_email": user_email,
            "user_role": user_role,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details or {},
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        
        supabase.table('audit_logs').insert(audit_entry).execute()
        
    except Exception as e:
        # Don't fail the main operation if audit logging fails
        print(f"Audit logging error: {e}")
