from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.chapter import ChapterCreate, ChapterUpdate, ChapterResponse
from app.api.deps import get_current_user_id
from app.repositories.in_memory_store import store
from app.core.datetime_utils import utc_now

router = APIRouter(tags=["Chapters"])


@router.get("/subjects/{subject_id}/chapters", response_model=List[ChapterResponse])
async def list_chapters_for_subject(
    subject_id: str, user_id: str = Depends(get_current_user_id)
):
    """List all chapters/units for a subject."""
    return [
        c for c in store.chapters.values()
        if c.get("subject_id") == subject_id and c.get("user_id") == user_id
    ]


@router.post("/subjects/{subject_id}/chapters", response_model=ChapterResponse, status_code=status.HTTP_201_CREATED)
async def create_chapter(
    subject_id: str,
    payload: ChapterCreate,
    user_id: str = Depends(get_current_user_id),
):
    """Create a chapter/unit with learning progress and confidence rating."""
    subj = store.subjects.get(subject_id)
    if not subj or subj.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Subject not found")

    new_id = store.new_id("ch")
    now = utc_now()
    record = {
        "id": new_id,
        "user_id": user_id,
        "subject_id": subject_id,
        **payload.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    store.chapters[new_id] = record
    return record


@router.get("/chapters/{chapter_id}", response_model=ChapterResponse)
async def get_chapter(
    chapter_id: str, user_id: str = Depends(get_current_user_id)
):
    """Get chapter details by ID."""
    record = store.chapters.get(chapter_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return record


@router.patch("/chapters/{chapter_id}", response_model=ChapterResponse)
async def update_chapter(
    chapter_id: str,
    payload: ChapterUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Update learning progress slider (0-100%) or confidence rating (1-10)."""
    record = store.chapters.get(chapter_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Chapter not found")

    update_data = payload.model_dump(exclude_unset=True)
    record.update(update_data)
    record["updated_at"] = utc_now()
    return record


@router.delete("/chapters/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chapter(
    chapter_id: str, user_id: str = Depends(get_current_user_id)
):
    """Delete a chapter."""
    record = store.chapters.get(chapter_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Chapter not found")
    del store.chapters[chapter_id]
    return None
