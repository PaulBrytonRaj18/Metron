from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.common import TimestampSchema


class ChapterBase(BaseModel):
    title: str = Field(..., description="e.g. 'Unit 1: Process Management'")
    unit_number: int = Field(default=1, ge=1)
    learning_progress_percent: float = Field(default=0.0, ge=0.0, le=100.0, description="Manual slider progress")
    confidence_rating: int = Field(default=5, ge=1, le=10, description="Manual confidence rating 1-10")
    key_topics: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


class ChapterCreate(ChapterBase):
    pass


class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    unit_number: Optional[int] = None
    learning_progress_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    confidence_rating: Optional[int] = Field(None, ge=1, le=10)
    key_topics: Optional[List[str]] = None
    notes: Optional[str] = None


class ChapterResponse(ChapterBase, TimestampSchema):
    id: str
    subject_id: str
    user_id: str
