from fastapi import APIRouter, Depends
from app.schemas.intelligence import (
    StudentContextPayload,
    StudySuggestionResponse,
    StudySuggestionItem,
)
from app.api.deps import get_current_user_id
from app.document_processing.gemini_provider import GeminiDocumentAIProvider

router = APIRouter(prefix="/intelligence", tags=["Intelligence"])
ai_provider = GeminiDocumentAIProvider()


@router.post("/study-suggestions", response_model=StudySuggestionResponse)
async def get_study_suggestions(
    payload: StudentContextPayload,
    user_id: str = Depends(get_current_user_id),
):
    """
    Synthesizes student's upcoming deadlines, confidence ratings, and exam dates
    into prioritized smart study recommendations.
    Never lectures or teaches syllabus; provides actionable time-blocked tasks.
    """
    student_dict = payload.model_dump()
    raw_suggestions = await ai_provider.generate_study_suggestions(student_dict)

    items = []
    for s in raw_suggestions:
        items.append(
            StudySuggestionItem(
                title=s.get("title", "Review Course Material"),
                subject_name=s.get("subject_name", "Academic Course"),
                subject_code=s.get("subject_code"),
                reason=s.get("reason", "Assessment window approaching."),
                reasoning=s.get("reasoning", s.get("reason", "Assessment window approaching.")),
                urgency=s.get("urgency", "high"),
                suggested_minutes=s.get("suggested_minutes", 45),
                suggested_duration_mins=s.get("suggested_duration_mins", s.get("suggested_minutes", 45)),
                action_type=s.get("action_type", "study_weak_topic"),
                target_id=s.get("target_id"),
            )
        )

    # If empty, provide proactive fallback
    if not items:
        items.append(
            StudySuggestionItem(
                title="Consolidate Low-Confidence Topics",
                subject_name="Academic Core",
                reason="Regular reinforcement prevents backlog before internal assessment tests.",
                reasoning="Regular reinforcement prevents backlog before internal assessment tests.",
                urgency="medium",
                suggested_minutes=30,
                suggested_duration_mins=30,
                action_type="study_weak_topic",
            )
        )

    source = "gemini_multimodal_ai" if ai_provider.api_key else "heuristic_engine"

    return StudySuggestionResponse(
        summary="Actionable study recommendations synthesized from confidence ratings and assessment windows.",
        suggestions=items,
        recommendations=items,
        model_source=source,
        generated_by=source,
    )
