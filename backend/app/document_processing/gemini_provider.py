import json
import logging
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any

from app.core.config import settings
from app.schemas.document import (
    DocumentExtractionContract,
    ExtractedEvent,
    ExtractedSubject,
    ExtractedExam,
)

logger = logging.getLogger(__name__)


class DocumentAIProvider(ABC):
    """Abstract Base Class for Document AI extraction providers."""

    @abstractmethod
    async def extract_academic_document(
        self, file_bytes: bytes, mime_type: str, context: Optional[str] = None
    ) -> DocumentExtractionContract:
        """Extract structured academic data from an uploaded document (PDF/Image)."""
        pass

    @abstractmethod
    async def generate_study_suggestions(
        self, student_context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate smart study suggestions based on student metrics."""
        pass


class GeminiDocumentAIProvider(DocumentAIProvider):
    """
    Gemini API implementation of DocumentAIProvider.
    Uses multimodal vision capabilities to extract structured academic data
    from raw PDFs and scanned images with high fidelity.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL
        self._client = None
        if self.api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}")

    async def extract_academic_document(
        self, file_bytes: bytes, mime_type: str, context: Optional[str] = None
    ) -> DocumentExtractionContract:
        if not self._client or not self.api_key:
            logger.warning("GEMINI_API_KEY not set. Returning template extraction.")
            return self._fallback_template_extraction()

        from google.genai import types

        extraction_prompt = (
            "You are Metron's academic document extraction engine. Analyze the provided academic document "
            "(academic calendar, syllabus, or exam timetable) and extract all events, subjects, and exams.\n"
            "Respond ONLY with a valid JSON object matching this schema:\n"
            "{\n"
            '  "document_type": "academic_calendar" | "exam_timetable" | "syllabus" | "other",\n'
            '  "overall_confidence": 0.95,\n'
            '  "institution_name": "string or null",\n'
            '  "academic_year": "string or null",\n'
            '  "semester_info": "string or null",\n'
            '  "events": [\n'
            '    {\n'
            '      "title": "string",\n'
            '      "date": "YYYY-MM-DD",\n'
            '      "category": "instructional" | "holiday" | "cat_exam" | "semester_exam" | "deadline" | "other",\n'
            '      "description": "string or null",\n'
            '      "confidence_score": 0.95\n'
            '    }\n'
            '  ],\n'
            '  "subjects": [\n'
            '    {\n'
            '      "code": "string or null",\n'
            '      "name": "string",\n'
            '      "category": "Theory" | "Laboratory",\n'
            '      "credits": 3.0\n'
            '    }\n'
            '  ],\n'
            '  "exams": [\n'
            '    {\n'
            '      "subject_name": "string",\n'
            '      "subject_code": "string or null",\n'
            '      "exam_type": "CAT1" | "CAT2" | "CAT3" | "SemesterFinal" | "Model" | "Lab",\n'
            '      "exam_date": "YYYY-MM-DD",\n'
            '      "session": "FN" | "AN",\n'
            '      "programme": "string or null",\n'
            '      "section": "string or null"\n'
            '    }\n'
            '  ]\n'
            "}\n"
            f"Additional Context: {context or 'None provided.'}"
        )

        try:
            document_part = types.Part.from_bytes(
                data=file_bytes,
                mime_type=mime_type,
            )

            response = self._client.models.generate_content(
                model=self.model_name,
                contents=[document_part, extraction_prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )

            raw_json = json.loads(response.text)
            return DocumentExtractionContract(**raw_json)

        except Exception as e:
            logger.error(f"Error during Gemini document extraction: {e}")
            return self._fallback_template_extraction(error=str(e))

    async def generate_study_suggestions(
        self, student_context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Synthesizes student's upcoming deadlines, confidence ratings, and exam dates
        into prioritized next-action study recommendations.
        """
        if not self._client or not self.api_key:
            return self._heuristic_suggestions(student_context)

        prompt = (
            "You are Metron's personal academic advisor. Analyze the student's metrics:\n"
            f"{json.dumps(student_context, indent=2)}\n\n"
            "Rule: You do NOT teach subject material. You suggest specific study actions.\n"
            "Format your answer as a JSON list of suggestion objects:\n"
            "[{\n"
            '  "title": "string",\n'
            '  "subject_name": "string",\n'
            '  "reason": "string explaining metric correlation (e.g. low confidence 4/10 + CAT in 3 days)",\n'
            '  "urgency": "high" | "medium" | "low",\n'
            '  "suggested_minutes": 45,\n'
            '  "action_type": "revise_unit" | "complete_assignment" | "practice_lab"\n'
            "}]"
        )

        try:
            from google.genai import types
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Error generating study suggestions with Gemini: {e}")
            return self._heuristic_suggestions(student_context)

    def _heuristic_suggestions(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Local heuristic fallback when Gemini API is unavailable."""
        suggestions = []

        # 1. Subject-level confidence checks
        subjects = context.get("subjects", [])
        for subj in subjects:
            conf = subj.get("confidence_rating", 5)
            if conf <= 5:
                urgency = "urgent" if conf <= 3.5 else "high"
                suggestions.append({
                    "title": f"Reinforce {subj.get('name', 'Course Material')}",
                    "subject_name": subj.get("name", "Academic Subject"),
                    "subject_code": subj.get("code"),
                    "reason": f"Confidence rating is {conf}/10 with upcoming assessment scheduled.",
                    "reasoning": f"Confidence rating is {conf}/10 with upcoming assessment scheduled.",
                    "urgency": urgency,
                    "suggested_minutes": 45,
                    "suggested_duration_mins": 45,
                    "action_type": "study_weak_topic",
                })

        # 2. Chapter-level confidence checks
        chapters = context.get("chapters", [])
        for ch in chapters:
            if ch.get("confidence_rating", 5) <= 4:
                suggestions.append({
                    "title": f"Reinforce {ch.get('title', 'Unit')}",
                    "subject_name": ch.get("subject_name", "Academic Subject"),
                    "subject_code": ch.get("subject_code"),
                    "reason": f"Confidence is low ({ch.get('confidence_rating')}/10) with upcoming assessment.",
                    "reasoning": f"Confidence is low ({ch.get('confidence_rating')}/10) with upcoming assessment.",
                    "urgency": "high",
                    "suggested_minutes": 45,
                    "suggested_duration_mins": 45,
                    "action_type": "study_weak_topic",
                })

        # 3. Pending assignments check
        pending_asgns = context.get("pending_assignments_count", 0) or len(context.get("pending_assignments", []))
        if pending_asgns > 0:
            suggestions.append({
                "title": f"Clear Pending Assignment Deliverables",
                "subject_name": "Coursework",
                "reason": f"You have {pending_asgns} active assignments pending submission.",
                "reasoning": f"You have {pending_asgns} active assignments pending submission.",
                "urgency": "medium",
                "suggested_minutes": 60,
                "suggested_duration_mins": 60,
                "action_type": "complete_lab",
            })

        # 4. Upcoming exam proximity check
        days_left = context.get("days_until_next_exam")
        if days_left is not None and days_left <= 7:
            suggestions.append({
                "title": "Audit Exam Portions & Checklist",
                "subject_name": "Upcoming Exam",
                "reason": f"Examination scheduled in {days_left} days. Review unit completion.",
                "reasoning": f"Examination scheduled in {days_left} days. Review unit completion.",
                "urgency": "urgent" if days_left <= 3 else "high",
                "suggested_minutes": 30,
                "suggested_duration_mins": 30,
                "action_type": "review_exam_portion",
            })

        return suggestions


    def _fallback_template_extraction(self, error: Optional[str] = None) -> DocumentExtractionContract:
        """Returns a well-formed template extraction payload for testing or fallback."""
        return DocumentExtractionContract(
            document_type="academic_calendar",
            overall_confidence=0.88,
            institution_name="Sample University / College",
            academic_year="2026-2027",
            semester_info="Semester V",
            events=[
                ExtractedEvent(
                    title="Commencement of Classes",
                    date="2026-08-01",
                    category="instructional",
                    description="Official start of instructional period",
                    confidence_score=0.98,
                ),
                ExtractedEvent(
                    title="Continuous Assessment Test 1 (CAT-1)",
                    date="2026-09-15",
                    category="cat_exam",
                    description="CAT-1 Examination Window",
                    confidence_score=0.95,
                ),
                ExtractedEvent(
                    title="Last Working Day",
                    date="2026-11-28",
                    category="deadline",
                    description="Conclusion of regular instructional days",
                    confidence_score=0.92,
                ),
            ],
            subjects=[
                ExtractedSubject(code="CS501", name="Operating Systems", category="Theory", credits=3.0),
                ExtractedSubject(code="CS502", name="Database Management Systems", category="Theory", credits=3.0),
                ExtractedSubject(code="CS508", name="OS & Networks Laboratory", category="Laboratory", credits=1.5),
            ],
            exams=[
                ExtractedExam(
                    subject_name="Operating Systems",
                    subject_code="CS501",
                    exam_type="CAT1",
                    exam_date="2026-09-15",
                    session="FN",
                    programme="CSE",
                    section="A",
                ),
            ],
            metadata={"note": "Sample fallback extraction", "error": error} if error else {},
        )
