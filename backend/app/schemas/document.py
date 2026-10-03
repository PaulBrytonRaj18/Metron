from datetime import date, datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from app.schemas.common import TimestampSchema


class ExtractedEvent(BaseModel):
    title: str
    date: str = Field(..., description="ISO 8601 date YYYY-MM-DD or date range")
    category: str = Field(..., description="instructional | holiday | cat_exam | semester_exam | deadline | other")
    description: Optional[str] = None
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)
    raw_text: Optional[str] = None


class ExtractedSubject(BaseModel):
    code: Optional[str] = None
    name: str
    category: str = Field(default="Theory", description="Theory | Laboratory | Hybrid")
    credits: Optional[float] = None
    faculty: Optional[str] = None


class ExtractedExam(BaseModel):
    subject_name: str
    subject_code: Optional[str] = None
    exam_type: str = Field(..., description="CAT1 | CAT2 | CAT3 | SemesterFinal | Model | Lab")
    exam_date: str
    session: Optional[str] = Field(None, description="FN | AN | Morning | Afternoon")
    programme: Optional[str] = None
    section: Optional[str] = None


class DocumentExtractionContract(BaseModel):
    document_type: str = Field(..., description="academic_calendar | exam_timetable | syllabus | other")
    overall_confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    institution_name: Optional[str] = None
    academic_year: Optional[str] = None
    semester_info: Optional[str] = None
    events: List[ExtractedEvent] = Field(default_factory=list)
    subjects: List[ExtractedSubject] = Field(default_factory=list)
    exams: List[ExtractedExam] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentResponse(TimestampSchema):
    id: str
    user_id: str
    semester_id: str
    file_name: str
    file_url: str
    file_type: str
    status: str = Field(default="uploaded", description="uploaded | processing | completed | failed")
    error_message: Optional[str] = None
    extraction_result: Optional[DocumentExtractionContract] = None


class DocumentImportRequest(BaseModel):
    confirmed_events: List[ExtractedEvent] = Field(default_factory=list)
    confirmed_subjects: List[ExtractedSubject] = Field(default_factory=list)
    confirmed_exams: List[ExtractedExam] = Field(default_factory=list)
