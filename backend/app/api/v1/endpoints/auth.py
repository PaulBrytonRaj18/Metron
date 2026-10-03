from fastapi import APIRouter, Depends, Body
from typing import Dict, Any
from app.schemas.common import MessageResponse
from app.api.deps import get_current_user_id

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/session")
async def create_or_validate_session(
    payload: Dict[str, Any] = Body(default={}),
    user_id: str = Depends(get_current_user_id),
):
    """Initializes or validates user session with Supabase auth token."""
    return {
        "status": "authenticated",
        "user_id": user_id,
        "session_expires_at": "2099-12-31T23:59:59Z",
        "profile": {
            "id": user_id,
            "preferences": {
                "theme": "dark",
                "flame_accent": True,
            }
        }
    }
