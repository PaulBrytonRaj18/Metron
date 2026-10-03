from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


from app.core.datetime_utils import utc_now


class TimestampSchema(BaseModel):
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class SyncStatusSchema(BaseModel):
    sync_status: str = Field(default="synced", description="synced | pending_create | pending_update | pending_delete")
    last_synced_at: Optional[datetime] = None


class MessageResponse(BaseModel):
    message: str
    status: str = "success"
