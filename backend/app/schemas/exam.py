from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.common import TimestampSchema


class ExamBase(BaseModel):
    title: Optional[str] = Field(None, description="e.g. 'CAT-1: Continuous Assessment Test 1'")
    exam_type: str = Field(default="CAT1", description="CAT1 | CAT2 | CAT3 | SemesterFinal | Model | Lab")
    exam_date: datetime
    session: Optional[str] = Field(default="FN", description="FN | AN | Morning | Afternoon")
    room_number: Optional[str] = None
    portions: Optional[str] = Field(None, description="e.g. 'Units 1 and 2, Chapters 1-4'")
    portion_units: Optional[List[str]] = Field(default_factory=list)
    programme: Optional[str] = Field(None, description="e.g. 'B.Tech CSE'")
    section: Optional[str] = Field(None, description="e.g. 'A'")
    max_marks: float = 50.0
    obtained_marks: Optional[float] = None
    target_marks: Optional[float] = None
    weightage_percent: Optional[float] = None


class ExamCreate(ExamBase):
    subject_id: Optional[str] = None


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    exam_type: Optional[str] = None
    exam_date: Optional[datetime] = None
    session: Optional[str] = None
    room_number: Optional[str] = None
    portions: Optional[str] = None
    portion_units: Optional[List[str]] = None
    programme: Optional[str] = None
    section: Optional[str] = None
    max_marks: Optional[float] = None
    obtained_marks: Optional[float] = None
    target_marks: Optional[float] = None
    weightage_percent: Optional[float] = None


class ExamResponse(ExamBase, TimestampSchema):
    id: str
    subject_id: str
    user_id: str

