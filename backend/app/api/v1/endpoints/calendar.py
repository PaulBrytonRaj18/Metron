from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.schemas.calendar import AcademicEventCreate, AcademicEventUpdate, AcademicEventResponse
from app.api.deps import get_current_user_id
from app.repositories.in_memory_store import store
from app.core.datetime_utils import utc_now

router = APIRouter(prefix="/academic-events", tags=["Calendar"])


@router.get("", response_model=List[AcademicEventResponse])
async def list_academic_events(
    semester_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user_id),
):
    """List academic calendar events (instruction days, exams, holidays)."""
    events = [e for e in store.academic_events.values() if e.get("user_id") == user_id]
    if semester_id:
        events = [e for e in events if e.get("semester_id") == semester_id]
    if category:
        events = [e for e in events if e.get("category") == category]
    return sorted(events, key=lambda x: str(x.get("start_date", "")))


@router.post("", response_model=AcademicEventResponse)
async def create_academic_event(
    payload: AcademicEventCreate, user_id: str = Depends(get_current_user_id)
):
    """Create an academic calendar event manually."""
    new_id = store.new_id("ev")
    now = utc_now()
    record = {
        "id": new_id,
        "user_id": user_id,
        **payload.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    store.academic_events[new_id] = record
    return record


@router.patch("/{event_id}", response_model=AcademicEventResponse)
async def update_academic_event(
    event_id: str,
    payload: AcademicEventUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Update an academic calendar event."""
    record = store.academic_events.get(event_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Event not found")

    update_data = payload.model_dump(exclude_unset=True)
    record.update(update_data)
    record["updated_at"] = utc_now()
    return record
