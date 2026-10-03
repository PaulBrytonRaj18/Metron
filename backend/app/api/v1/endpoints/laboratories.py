from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.laboratory import ExperimentCreate, ExperimentUpdate, ExperimentResponse
from app.api.deps import get_current_user_id
from app.repositories.in_memory_store import store
from app.core.datetime_utils import utc_now

router = APIRouter(tags=["Laboratories"])


@router.get("/subjects/{subject_id}/experiments", response_model=List[ExperimentResponse])
async def list_experiments_for_subject(
    subject_id: str, user_id: str = Depends(get_current_user_id)
):
    """List laboratory experiments for a subject."""
    return [
        e for e in store.experiments.values()
        if e.get("subject_id") == subject_id and e.get("user_id") == user_id
    ]


@router.post("/subjects/{subject_id}/experiments", response_model=ExperimentResponse, status_code=status.HTTP_201_CREATED)
async def create_experiment(
    subject_id: str,
    payload: ExperimentCreate,
    user_id: str = Depends(get_current_user_id),
):
    """Add a new laboratory experiment."""
    subj = store.subjects.get(subject_id)
    if not subj or subj.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Subject not found")

    new_id = store.new_id("exp")
    now = utc_now()
    record = {
        "id": new_id,
        "user_id": user_id,
        "subject_id": subject_id,
        **payload.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    store.experiments[new_id] = record
    return record


@router.patch("/experiments/{experiment_id}", response_model=ExperimentResponse)
async def update_experiment(
    experiment_id: str,
    payload: ExperimentUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Update experiment observation status or record submission status."""
    record = store.experiments.get(experiment_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Experiment not found")

    update_data = payload.model_dump(exclude_unset=True)
    record.update(update_data)
    record["updated_at"] = utc_now()
    return record
