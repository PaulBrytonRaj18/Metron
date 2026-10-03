from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.api.deps import get_current_user_id
from app.repositories.in_memory_store import store
from app.core.datetime_utils import utc_now

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    is_next_action: Optional[bool] = None,
    user_id: str = Depends(get_current_user_id),
):
    """List all tasks, with optional filters for status or next-action focus."""
    tasks = [t for t in store.tasks.values() if t.get("user_id") == user_id]
    if status_filter:
        tasks = [t for t in tasks if t.get("status") == status_filter]
    if is_next_action is not None:
        tasks = [t for t in tasks if t.get("is_next_action") == is_next_action]
    return tasks


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate, user_id: str = Depends(get_current_user_id)
):
    """Create a task (standalone or linked to assignment/lab/chapter)."""
    new_id = store.new_id("task")
    now = utc_now()
    record = {
        "id": new_id,
        "user_id": user_id,
        **payload.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    store.tasks[new_id] = record
    return record


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str, user_id: str = Depends(get_current_user_id)
):
    """Get a single task by ID."""
    record = store.tasks.get(task_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Task not found")
    return record


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Update task status, priority, or next action flag."""
    record = store.tasks.get(task_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = payload.model_dump(exclude_unset=True)
    record.update(update_data)
    record["updated_at"] = utc_now()
    return record


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str, user_id: str = Depends(get_current_user_id)
):
    """Delete a task."""
    record = store.tasks.get(task_id)
    if not record or record.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Task not found")
    del store.tasks[task_id]
    return None
