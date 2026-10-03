from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.schemas.exam import ExamCreate, ExamUpdate, ExamResponse
from app.api.deps import get_current_user_id
from app.repositories.in_memory_store import store
from app.core.datetime_utils import utc_now

router = APIRouter(tags=["Exams"])


@router.get("/subjects/{subject_id}/exams", response_model=List[ExamResponse])
async def list_exams_for_subject(
    subject_id: str, user_id: str = Depends(get_current_user_id)
):
    """List exams associated with a subject."""
    return sorted(
        [
            ex for ex in store.exams.values()
            if ex.get("subject_id") == subject_id and ex.get("user_id") == user_id
        ],
        key=lambda x: str(x.get("exam_date", ""))
    )


@router.get("/exams", response_model=List[ExamResponse])
async def list_all_exams(
    programme: Optional[str] = Query(None, description="Filter by academic programme, e.g. 'B.Tech CSE'"),
    section: Optional[str] = Query(None, description="Filter by section, e.g. 'A'"),
    exam_type: Optional[str] = Query(None, description="Filter by exam type, e.g. 'CAT1'"),
    user_id: str = Depends(get_current_user_id),
):
    """List all exams across all subjects for the user, with dynamic programme and section filtering."""
    exams = [ex for ex in store.exams.values() if ex.get("user_id") == user_id]
    if programme:
        exams = [ex for ex in exams if ex.get("programme") == programme]
    if section:
        exams = [ex for ex in exams if ex.get("section") == section]
    if exam_type:
        exams = [ex for ex in exams if ex.get("exam_type") == exam_type]

    return sorted(exams, key=lambda x: str(x.get("exam_date", "")))


@router.post("/subjects/{subject_id}/exams", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    subject_id: str,
    payload: ExamCreate,
    user_id: str = Depends(get_current_user_id),
):
    """Create a new exam (CAT, Semester final, model)."""
    subj = store.subjects.get(subject_id)
    if not subj or subj.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Subject not found")

    new_id = store.new_id("exam")
    now = utc_now()
    dumped = payload.model_dump()
    if not dumped.get("title"):
        dumped["title"] = f"{payload.exam_type} Examination"
    record = {
        "id": new_id,
        "user_id": user_id,
        "subject_id": subject_id,
        **dumped,
        "created_at": now,
        "updated_at": now,
    }
    store.exams[new_id] = record
    return record


@router.post("/exams", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam_global(
    payload: ExamCreate,
    user_id: str = Depends(get_current_user_id),
):
    """Create a new exam directly from Exam Center."""
    subject_id = payload.subject_id
    if not subject_id:
        first_subj = next((s for s in store.subjects.values() if s.get("user_id") == user_id), None)
        subject_id = first_subj["id"] if first_subj else "subj_default"

    new_id = store.new_id("exam")
    now = utc_now()
    dumped = payload.model_dump()
    if not dumped.get("title"):
        dumped["title"] = f"{payload.exam_type} Examination"
    record = {
        "id": new_id,
        "user_id": user_id,
        "subject_id": subject_id,
        **dumped,
        "created_at": now,
        "updated_at": now,
    }
    store.exams[new_id] = record
    return record


@router.patch("/exams/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: str,
    payload: ExamUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Update exam score, date, portions, or target marks."""
    record = store.exams.get(exam_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Exam not found")

    update_data = payload.model_dump(exclude_unset=True)
    record.update(update_data)
    record["updated_at"] = utc_now()
    return record
