from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.semester import SemesterCreate, SemesterUpdate, SemesterResponse
from app.api.deps import get_current_user_id
from app.repositories.in_memory_store import store
from app.core.datetime_utils import utc_now

router = APIRouter(prefix="/semesters", tags=["Semesters"])


@router.get("", response_model=List[SemesterResponse])
async def list_semesters(user_id: str = Depends(get_current_user_id)):
    """List all semesters for the authenticated user."""
    return [s for s in store.semesters.values() if s.get("user_id") == user_id]


@router.post("", response_model=SemesterResponse, status_code=status.HTTP_201_CREATED)
async def create_semester(
    payload: SemesterCreate, user_id: str = Depends(get_current_user_id)
):
    """Create a new academic semester."""
    new_id = store.new_id("sem")
    now = utc_now()
    record = {
        "id": new_id,
        "user_id": user_id,
        **payload.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    store.semesters[new_id] = record
    return record


@router.get("/{semester_id}", response_model=SemesterResponse)
async def get_semester(
    semester_id: str, user_id: str = Depends(get_current_user_id)
):
    """Get a specific semester by ID."""
    record = store.semesters.get(semester_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Semester not found")
    return record


@router.patch("/{semester_id}", response_model=SemesterResponse)
async def update_semester(
    semester_id: str,
    payload: SemesterUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Update semester fields."""
    record = store.semesters.get(semester_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Semester not found")

    update_data = payload.model_dump(exclude_unset=True)
    record.update(update_data)
    record["updated_at"] = utc_now()
    return record


@router.delete("/{semester_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_semester(
    semester_id: str, user_id: str = Depends(get_current_user_id)
):
    """Delete a semester."""
    record = store.semesters.get(semester_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Semester not found")
    del store.semesters[semester_id]
    return None
