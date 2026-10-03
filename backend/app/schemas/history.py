from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import TimestampSchema
from app.core.datetime_utils import utc_now


class HistoryBase(BaseModel):
    action_type: str = Field(..., description="assignment_submitted | experiment_approved | chapter_revised | study_session | exam_completed")
    title: str
    description: Optional[str] = None
    subject_id: Optional[str] = None
    chapter_id: Optional[str] = None
    duration_minutes: Optional[int] = None
    logged_at: datetime = Field(default_factory=utc_now)


class HistoryCreate(HistoryBase):
    pass


class HistoryUpdate(BaseModel):
    action_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    subject_id: Optional[str] = None
    chapter_id: Optional[str] = None
    duration_minutes: Optional[int] = None
    logged_at: Optional[datetime] = None


class HistoryResponse(HistoryBase, TimestampSchema):
    id: str
    user_id: str
