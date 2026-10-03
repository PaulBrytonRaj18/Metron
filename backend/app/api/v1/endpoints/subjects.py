from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from app.api.deps import get_current_user_id
from app.repositories.in_memory_store import store
from app.core.datetime_utils import utc_now

router = APIRouter(tags=["Subjects"])


def _calculate_subject_metrics(subject_id: str, user_id: str) -> dict:
    """Calculates learning progress, task progress, and average confidence for a subject."""
    chapters = [c for c in store.chapters.values() if c.get("subject_id") == subject_id and c.get("user_id") == user_id]
    assignments = [a for a in store.assignments.values() if a.get("subject_id") == subject_id and a.get("user_id") == user_id]
    experiments = [e for e in store.experiments.values() if e.get("subject_id") == subject_id and e.get("user_id") == user_id]

    # Manual learning progress average
    if chapters:
        learning_progress = sum(c.get("learning_progress_percent", 0.0) for c in chapters) / len(chapters)
        avg_confidence = sum(c.get("confidence_rating", 5) for c in chapters) / len(chapters)
    else:
        learning_progress = 0.0
        avg_confidence = 0.0

    # Automatic task progress calculation
    total_tasks = len(assignments) + len(experiments)
    if total_tasks > 0:
        completed_assignments = sum(
            1 for a in assignments
            if a.get("status", "").lower() in ("submitted", "graded", "completed", "submitted_hand", "submitted_moodle")
        )
        completed_experiments = sum(
            1 for e in experiments
            if e.get("record_status", "").lower() in ("submitted", "approved")
        )
        task_progress = ((completed_assignments + completed_experiments) / total_tasks) * 100.0
    else:
        task_progress = 0.0

    return {
        "learning_progress_percent": round(learning_progress, 1),
        "task_progress_percent": round(task_progress, 1),
        "average_confidence": round(avg_confidence, 1),
    }


@router.get("/semesters/{semester_id}/subjects", response_model=List[SubjectResponse])
async def list_subjects_for_semester(
    semester_id: str, user_id: str = Depends(get_current_user_id)
):
    """List all subjects within a given semester."""
    subjects = [s for s in store.subjects.values() if s.get("semester_id") == semester_id and s.get("user_id") == user_id]
    results = []
    for s in subjects:
        metrics = _calculate_subject_metrics(s["id"], user_id)
        results.append({**s, **metrics})
    return results


@router.post("/semesters/{semester_id}/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    semester_id: str,
    payload: SubjectCreate,
    user_id: str = Depends(get_current_user_id),
):
    """Create a new subject under a semester."""
    sem = store.semesters.get(semester_id)
    if not sem or sem.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Semester not found")

    new_id = store.new_id("subj")
    now = utc_now()
    record = {
        "id": new_id,
        "user_id": user_id,
        "semester_id": semester_id,
        **payload.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    store.subjects[new_id] = record
    metrics = _calculate_subject_metrics(new_id, user_id)
    return {**record, **metrics}


@router.get("/subjects/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: str, user_id: str = Depends(get_current_user_id)
):
    """Get subject details and aggregated metrics."""
    record = store.subjects.get(subject_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Subject not found")
    metrics = _calculate_subject_metrics(subject_id, user_id)
    return {**record, **metrics}


@router.patch("/subjects/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: str,
    payload: SubjectUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Update subject properties."""
    record = store.subjects.get(subject_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Subject not found")

    update_data = payload.model_dump(exclude_unset=True)
    record.update(update_data)
    record["updated_at"] = utc_now()
    metrics = _calculate_subject_metrics(subject_id, user_id)
    return {**record, **metrics}


@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: str, user_id: str = Depends(get_current_user_id)
):
    """Delete a subject."""
    record = store.subjects.get(subject_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Subject not found")
    del store.subjects[subject_id]
    return None
