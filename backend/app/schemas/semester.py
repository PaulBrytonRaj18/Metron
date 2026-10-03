from datetime import date
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import TimestampSchema


class SemesterBase(BaseModel):
    title: str = Field(..., description="e.g. 'Semester 5 (Fall 2026)'")
    academic_year: str = Field(..., description="e.g. '2026-2027'")
    semester_number: int = Field(..., ge=1, le=12)
    department: Optional[str] = None
    programme: Optional[str] = None
    section: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: bool = True


class SemesterCreate(SemesterBase):
    pass


class SemesterUpdate(BaseModel):
    title: Optional[str] = None
    academic_year: Optional[str] = None
    semester_number: Optional[int] = None
    department: Optional[str] = None
    programme: Optional[str] = None
    section: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class SemesterResponse(SemesterBase, TimestampSchema):
    id: str
    user_id: str
