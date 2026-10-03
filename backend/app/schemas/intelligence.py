from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class StudySuggestionItem(BaseModel):
    model_config = ConfigDict(extra="allow")

    title: str
    subject_name: Optional[str] = "Academic Course"
    subject_code: Optional[str] = None
    reason: str
    reasoning: Optional[str] = None
    urgency: str = Field(default="high", description="urgent | high | medium | low")
    suggested_minutes: int = 45
    suggested_duration_mins: Optional[int] = None
    action_type: str = Field(default="revise_unit", description="revise_unit | complete_assignment | practice_lab | exam_prep | study_weak_topic | complete_lab | review_exam_portion | calculate_target_grade")
    target_id: Optional[str] = None


class StudentContextPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    semester_id: Optional[str] = None
    semester_name: Optional[str] = None
    days_until_next_exam: Optional[int] = None
    chapters: List[Dict[str, Any]] = Field(default_factory=list)
    subjects: List[Dict[str, Any]] = Field(default_factory=list)
    pending_assignments: List[Dict[str, Any]] = Field(default_factory=list)
    upcoming_exams: List[Dict[str, Any]] = Field(default_factory=list)
    pending_assignments_count: Optional[int] = None
    pending_lab_records_count: Optional[int] = None
    overall_confidence: Optional[float] = None


class StudySuggestionResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    summary: str = "Tailored study suggestions based on student confidence and deadlines."
    suggestions: List[StudySuggestionItem] = Field(default_factory=list)
    recommendations: List[StudySuggestionItem] = Field(default_factory=list)
    model_source: str = "gemini_multimodal_reasoning"
    generated_by: Optional[str] = None

