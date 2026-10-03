from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import TimestampSchema


class SubjectBase(BaseModel):
    code: Optional[str] = None
    name: str = Field(..., description="e.g. 'Operating Systems'")
    category: str = Field(default="Theory", description="Theory | Laboratory | Hybrid")
    credits: float = Field(default=3.0, ge=0.0)
    color_accent: Optional[str] = Field(default="#CD202C", description="Hex color token")
    faculty_name: Optional[str] = None
    syllabus_url: Optional[str] = None


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    credits: Optional[float] = None
    color_accent: Optional[str] = None
    faculty_name: Optional[str] = None
    syllabus_url: Optional[str] = None


class SubjectResponse(SubjectBase, TimestampSchema):
    id: str
    semester_id: str
    user_id: str
    learning_progress_percent: float = Field(default=0.0, description="Aggregated manual chapter progress")
    task_progress_percent: float = Field(default=0.0, description="Automatic aggregated task progress")
    average_confidence: float = Field(default=0.0, description="Average confidence across chapters")
