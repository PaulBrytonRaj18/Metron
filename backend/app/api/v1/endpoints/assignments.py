from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate, AssignmentResponse
from app.api.deps import get_current_user_id
from app.repositories.in_memory_store import store
from app.core.datetime_utils import utc_now

router = APIRouter(tags=["Assignments"])


@router.get("/subjects/{subject_id}/assignments", response_model=List[AssignmentResponse])
async def list_assignments_for_subject(
    subject_id: str, user_id: str = Depends(get_current_user_id)
):
    """List all assignments for a subject."""
    return [
        a for a in store.assignments.values()
        if a.get("subject_id") == subject_id and a.get("user_id") == user_id
    ]


@router.post("/subjects/{subject_id}/assignments", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    subject_id: str,
    payload: AssignmentCreate,
    user_id: str = Depends(get_current_user_id),
):
    """Create a new assignment under a subject."""
    subj = store.subjects.get(subject_id)
    if not subj or subj.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Subject not found")

    new_id = store.new_id("asgn")
    now = utc_now()
    record = {
        "id": new_id,
        "user_id": user_id,
        "subject_id": subject_id,
        **payload.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    store.assignments[new_id] = record
    return record


@router.patch("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: str,
    payload: AssignmentUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Update assignment status, marks, or due date."""
    record = store.assignments.get(assignment_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Assignment not found")

    update_data = payload.model_dump(exclude_unset=True)
    record.update(update_data)
    record["updated_at"] = utc_now()
    return record
