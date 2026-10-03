from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import TimestampSchema


class AcademicEventBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    category: str = Field(default="instructional", description="instructional | holiday | cat_exam | semester_exam | deadline | internal_submission | other")
    semester_id: str
    is_official: bool = True
    google_event_id: Optional[str] = None


class AcademicEventCreate(AcademicEventBase):
    pass


class AcademicEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category: Optional[str] = None
    is_official: Optional[bool] = None
    google_event_id: Optional[str] = None


class AcademicEventResponse(AcademicEventBase, TimestampSchema):
    id: str
    user_id: str
