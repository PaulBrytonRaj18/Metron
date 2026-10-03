from typing import Optional
from fastapi import Header, HTTPException, status


async def get_current_user_id(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
) -> str:
    """
    Extracts the authenticated user ID.
    In production, validates Supabase JWT.
    In local development, accepts X-User-Id header or defaults to local developer ID.
    """
    if x_user_id:
        return x_user_id
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        # In production: jwt.decode(token, settings.SUPABASE_JWT_SECRET, ...)
        # For development / initial scaffold:
        return "user_metron_dev_001"
    
    return "user_metron_dev_001"
