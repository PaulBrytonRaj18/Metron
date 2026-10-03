from datetime import date
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.common import TimestampSchema


class ExperimentBase(BaseModel):
    experiment_number: int = Field(..., ge=1)
    title: str = Field(..., description="e.g. 'CPU Scheduling Algorithms - FCFS & SJF'")
    date_conducted: Optional[date] = None
    observation_status: str = Field(default="pending", description="pending | completed | signed")
    record_status: str = Field(default="pending", description="pending | written | submitted | approved")
    viva_notes: Optional[str] = None
    marks: Optional[float] = None
    max_marks: float = 10.0


class ExperimentCreate(ExperimentBase):
    pass


class ExperimentUpdate(BaseModel):
    experiment_number: Optional[int] = None
    title: Optional[str] = None
    date_conducted: Optional[date] = None
    observation_status: Optional[str] = None
    record_status: Optional[str] = None
    viva_notes: Optional[str] = None
    marks: Optional[float] = None
    max_marks: Optional[float] = None


class ExperimentResponse(ExperimentBase, TimestampSchema):
    id: str
    subject_id: str
    user_id: str
