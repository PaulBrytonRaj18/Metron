from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import TimestampSchema


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = Field(default="medium", description="low | medium | high | urgent")
    status: str = Field(default="pending", description="pending | completed")
    due_date: Optional[datetime] = None
    subject_id: Optional[str] = None
    chapter_id: Optional[str] = None
    assignment_id: Optional[str] = None
    experiment_id: Optional[str] = None
    is_next_action: bool = False
    reminder_at: Optional[datetime] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    subject_id: Optional[str] = None
    chapter_id: Optional[str] = None
    assignment_id: Optional[str] = None
    experiment_id: Optional[str] = None
    is_next_action: Optional[bool] = None
    reminder_at: Optional[datetime] = None


class TaskResponse(TaskBase, TimestampSchema):
    id: str
    user_id: str
