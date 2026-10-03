from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.history import HistoryCreate, HistoryUpdate, HistoryResponse
from app.api.deps import get_current_user_id
from app.repositories.in_memory_store import store
from app.core.datetime_utils import utc_now

router = APIRouter(prefix="/history", tags=["History"])


@router.get("", response_model=List[HistoryResponse])
async def list_history(user_id: str = Depends(get_current_user_id)):
    """List historical logs of student study sessions, assignment submissions, etc."""
    min_dt = datetime.min.replace(tzinfo=timezone.utc)
    logs = [h for h in store.history.values() if h.get("user_id") == user_id]
    return sorted(logs, key=lambda x: x.get("logged_at") or min_dt, reverse=True)


@router.post("", response_model=HistoryResponse, status_code=status.HTTP_201_CREATED)
async def create_history_entry(
    payload: HistoryCreate, user_id: str = Depends(get_current_user_id)
):
    """Log an event to history."""
    new_id = store.new_id("hist")
    now = utc_now()
    record = {
        "id": new_id,
        "user_id": user_id,
        **payload.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    store.history[new_id] = record
    return record


@router.patch("/{history_id}", response_model=HistoryResponse)
async def update_history_entry(
    history_id: str,
    payload: HistoryUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Update a history log entry."""
    record = store.history.get(history_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="History entry not found")

    update_data = payload.model_dump(exclude_unset=True)
    record.update(update_data)
    record["updated_at"] = utc_now()
    return record
