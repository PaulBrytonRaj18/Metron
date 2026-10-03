from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import TimestampSchema


class AssignmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: str = Field(default="not_started", description="not_started | in_progress | completed | submitted | graded")
    chapter_id: Optional[str] = None
    max_marks: Optional[float] = None
    obtained_marks: Optional[float] = None
    attachment_url: Optional[str] = None


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    chapter_id: Optional[str] = None
    max_marks: Optional[float] = None
    obtained_marks: Optional[float] = None
    attachment_url: Optional[str] = None


class AssignmentResponse(AssignmentBase, TimestampSchema):
    id: str
    subject_id: str
    user_id: str
