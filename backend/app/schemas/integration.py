from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


from app.core.datetime_utils import utc_now


class GoogleIntegrationStatus(BaseModel):
    is_connected: bool
    email: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    synced_events_count: int = 0


class GoogleConnectRequest(BaseModel):
    server_auth_code: str = Field(..., description="OAuth 2.0 authorization code from mobile Google Sign-In")


class GoogleSyncRequest(BaseModel):
    sync_official_events: bool = True
    sync_personal_tasks: bool = False
    semester_id: Optional[str] = None


class GoogleSyncResponse(BaseModel):
    pushed_events_count: int
    updated_events_count: int
    failed_events_count: int
    synced_at: datetime = Field(default_factory=utc_now)
