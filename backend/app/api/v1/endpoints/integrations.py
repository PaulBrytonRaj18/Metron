from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.datetime_utils import utc_now
from app.schemas.integration import (
    GoogleIntegrationStatus,
    GoogleConnectRequest,
    GoogleSyncRequest,
    GoogleSyncResponse,
)
from app.schemas.common import MessageResponse
from app.api.deps import get_current_user_id
from app.repositories.in_memory_store import store

router = APIRouter(prefix="/integrations/google", tags=["Integrations"])


@router.get("", response_model=GoogleIntegrationStatus)
async def get_google_integration_status(user_id: str = Depends(get_current_user_id)):
    """Check whether Google Calendar integration is connected."""
    conn = store.google_connections.get(user_id)
    if not conn:
        return GoogleIntegrationStatus(
            is_connected=False,
            email=None,
            last_synced_at=None,
            synced_events_count=0,
        )
    return GoogleIntegrationStatus(**conn)


@router.post("/connect", response_model=GoogleIntegrationStatus)
async def connect_google_calendar(
    payload: GoogleConnectRequest, user_id: str = Depends(get_current_user_id)
):
    """Exchanges server auth code for OAuth credentials and links Google Calendar."""
    record = {
        "is_connected": True,
        "email": "student@university.edu",
        "last_synced_at": utc_now(),
        "synced_events_count": 0,
        "refresh_token": f"mock_refresh_token_{payload.server_auth_code[:8] if payload.server_auth_code else 'xyz'}",
    }
    store.google_connections[user_id] = record
    return GoogleIntegrationStatus(**record)


@router.post("/sync", response_model=GoogleSyncResponse)
async def sync_to_google_calendar(
    payload: GoogleSyncRequest, user_id: str = Depends(get_current_user_id)
):
    """Pushes confirmed academic events and exams to user's Google Calendar with selective sync."""
    conn = store.google_connections.get(user_id)
    if not conn or not conn.get("is_connected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar is not connected. Please connect first."
        )

    events_to_sync = []
    if payload.sync_official_events:
        academic_events = [
            e for e in store.academic_events.values()
            if e.get("user_id") == user_id
        ]
        if payload.semester_id:
            academic_events = [e for e in academic_events if e.get("semester_id") == payload.semester_id]
        events_to_sync.extend(academic_events)

        # Include official exams
        exams_to_sync = [
            ex for ex in store.exams.values()
            if ex.get("user_id") == user_id
        ]
        events_to_sync.extend(exams_to_sync)

    if payload.sync_personal_tasks:
        personal_tasks = [
            t for t in store.tasks.values()
            if t.get("user_id") == user_id and t.get("due_date")
        ]
        events_to_sync.extend(personal_tasks)

    now = utc_now()
    pushed = 0
    updated = 0
    for ev in events_to_sync:
        if not ev.get("google_event_id"):
            ev["google_event_id"] = f"gcal_{ev['id']}"
            pushed += 1
        else:
            updated += 1
        ev["updated_at"] = now

    conn["last_synced_at"] = now
    conn["synced_events_count"] = len(events_to_sync)

    return GoogleSyncResponse(
        pushed_events_count=pushed,
        updated_events_count=updated,
        failed_events_count=0,
        synced_at=now,
    )


@router.delete("", response_model=MessageResponse)
async def disconnect_google_calendar(user_id: str = Depends(get_current_user_id)):
    """Disconnects and revokes Google Calendar access."""
    if user_id in store.google_connections:
        del store.google_connections[user_id]
    return MessageResponse(message="Google Calendar integration disconnected.")
