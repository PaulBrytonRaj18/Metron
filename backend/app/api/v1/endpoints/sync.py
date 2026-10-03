from datetime import datetime, timezone
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.datetime_utils import utc_now
from app.schemas.sync import (
    SyncPushRequest,
    SyncPushResponse,
    SyncPullRequest,
    SyncPullResponse,
)
from app.api.deps import get_current_user_id
from app.repositories.in_memory_store import store

router = APIRouter(prefix="/sync", tags=["Cloud Sync & Conflict Resolution"])


def _get_table_map() -> Dict[str, Dict[str, Any]]:
    return {
        "semesters": store.semesters,
        "subjects": store.subjects,
        "chapters": store.chapters,
        "assignments": store.assignments,
        "experiments": store.experiments,
        "exams": store.exams,
        "tasks": store.tasks,
        "history": store.history,
        "academic_events": store.academic_events,
    }


def _normalize_dt(val: Any) -> datetime:
    """Helper to convert str or datetime to timezone-aware UTC datetime."""
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val
    if isinstance(val, str):
        try:
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            return datetime.min.replace(tzinfo=timezone.utc)
    return datetime.min.replace(tzinfo=timezone.utc)


@router.post("/push", response_model=SyncPushResponse)
async def push_sync_mutations(
    payload: SyncPushRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Drains client sync_queue mutations with Last-Write-Wins (LWW) conflict resolution.
    If incoming client_updated_at >= server updated_at, mutation is accepted and applied.
    Otherwise, the conflict is rejected (server wins) and logged for client reconciliation.
    """
    table_map = _get_table_map()
    applied = 0
    conflicts = 0
    rejected = 0
    details: List[Dict[str, Any]] = []
    now = utc_now()

    for mut in payload.mutations:
        table = table_map.get(mut.entity_type)
        if table is None:
            rejected += 1
            details.append({
                "entity_type": mut.entity_type,
                "entity_id": mut.entity_id,
                "status": "rejected_unknown_entity_type",
            })
            continue

        existing = table.get(mut.entity_id)
        client_dt = _normalize_dt(mut.client_updated_at)

        if existing:
            # Tenant isolation check
            if existing.get("user_id") and existing.get("user_id") != user_id:
                rejected += 1
                details.append({
                    "entity_type": mut.entity_type,
                    "entity_id": mut.entity_id,
                    "status": "rejected_unauthorized",
                })
                continue

            existing_dt = _normalize_dt(existing.get("updated_at", datetime.min))

            # Last-Write-Wins (LWW) check
            if client_dt >= existing_dt:
                if mut.action == "delete":
                    del table[mut.entity_id]
                else:
                    merged = {**existing, **mut.payload}
                    merged["id"] = mut.entity_id
                    merged["user_id"] = user_id
                    merged["updated_at"] = client_dt
                    table[mut.entity_id] = merged
                applied += 1
                details.append({
                    "entity_type": mut.entity_type,
                    "entity_id": mut.entity_id,
                    "status": "applied",
                })
            else:
                conflicts += 1
                details.append({
                    "entity_type": mut.entity_type,
                    "entity_id": mut.entity_id,
                    "status": "conflict_server_wins",
                    "server_updated_at": existing.get("updated_at"),
                })
        else:
            if mut.action == "delete":
                # Already deleted or nonexistent
                applied += 1
            else:
                new_item = {**mut.payload}
                new_item["id"] = mut.entity_id
                new_item["user_id"] = user_id
                new_item["created_at"] = new_item.get("created_at") or client_dt
                new_item["updated_at"] = client_dt
                table[mut.entity_id] = new_item
                applied += 1
            details.append({
                "entity_type": mut.entity_type,
                "entity_id": mut.entity_id,
                "status": "applied",
            })

    return SyncPushResponse(
        applied_count=applied,
        conflicts_count=conflicts,
        rejected_count=rejected,
        details=details,
        server_timestamp=now,
    )


@router.post("/pull", response_model=SyncPullResponse)
async def pull_sync_changes(
    payload: SyncPullRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Pulls delta changes for all entities updated since the provided timestamp.
    Enables local client database to reconcile remote modifications.
    """
    table_map = _get_table_map()
    now = utc_now()
    since_dt = _normalize_dt(payload.since) if payload.since else None

    result: Dict[str, List[Dict[str, Any]]] = {}

    for entity_name, table in table_map.items():
        matched: List[Dict[str, Any]] = []
        for record in table.values():
            if record.get("user_id") == user_id:
                if since_dt is None:
                    matched.append(record)
                else:
                    rec_dt = _normalize_dt(record.get("updated_at", datetime.min))
                    if rec_dt > since_dt:
                        matched.append(record)
        result[entity_name] = matched

    return SyncPullResponse(
        entities=result,
        server_timestamp=now,
    )
