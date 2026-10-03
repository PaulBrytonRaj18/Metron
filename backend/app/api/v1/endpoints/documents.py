from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks
from app.schemas.document import (
    DocumentResponse,
    DocumentImportRequest,
    DocumentExtractionContract,
)
from app.schemas.common import MessageResponse
from app.api.deps import get_current_user_id
from app.repositories.in_memory_store import store
from app.document_processing.gemini_provider import GeminiDocumentAIProvider
from app.core.datetime_utils import utc_now

router = APIRouter(tags=["Documents"])
ai_provider = GeminiDocumentAIProvider()


@router.post("/semesters/{semester_id}/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    semester_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """Uploads an academic calendar or timetable file to storage and creates document record."""
    sem = store.semesters.get(semester_id)
    if not sem or sem.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Semester not found")

    content = await file.read()
    doc_id = store.new_id("doc")
    now = utc_now()

    record = {
        "id": doc_id,
        "user_id": user_id,
        "semester_id": semester_id,
        "file_name": file.filename or "uploaded_document",
        "file_url": f"https://storage.supabase.co/metron/user/{user_id}/{doc_id}_{file.filename}",
        "file_type": file.content_type or "application/octet-stream",
        "file_bytes": content,
        "status": "uploaded",
        "error_message": None,
        "extraction_result": None,
        "created_at": now,
        "updated_at": now,
    }
    store.documents[doc_id] = record
    return record


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str, user_id: str = Depends(get_current_user_id)
):
    """Get document processing status and details."""
    doc = store.documents.get(document_id)
    if not doc or doc.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.post("/documents/{document_id}/process", response_model=DocumentResponse)
async def process_document(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Triggers Gemini Multimodal AI extraction on the document."""
    doc = store.documents.get(document_id)
    if not doc or doc.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Document not found")

    doc["status"] = "processing"
    doc["updated_at"] = utc_now()

    try:
        extraction = await ai_provider.extract_academic_document(
            file_bytes=doc.get("file_bytes", b""),
            mime_type=doc.get("file_type", "application/pdf"),
            context=f"Semester: {doc.get('semester_id')}",
        )
        doc["status"] = "completed"
        doc["extraction_result"] = extraction
    except Exception as e:
        doc["status"] = "failed"
        doc["error_message"] = str(e)

    doc["updated_at"] = utc_now()
    return doc


@router.get("/documents/{document_id}/import")
async def get_import_preview(
    document_id: str, user_id: str = Depends(get_current_user_id)
):
    """Returns normalized extraction payload for user review and confirmation."""
    doc = store.documents.get(document_id)
    if not doc or doc.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.get("status") != "completed" or not doc.get("extraction_result"):
        raise HTTPException(status_code=400, detail="Document processing has not completed yet")

    return {
        "document_id": document_id,
        "extraction": doc["extraction_result"],
        "review_instructions": "Review and confirm extracted events, subjects, and exams before committing.",
    }


@router.post("/documents/{document_id}/confirm", response_model=MessageResponse)
async def confirm_document_import(
    document_id: str,
    payload: DocumentImportRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Commits confirmed events, subjects, and exams to the database after user review."""
    doc = store.documents.get(document_id)
    if not doc or doc.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Document not found")

    semester_id = doc["semester_id"]
    now = utc_now()

    # 1. Commit confirmed events
    for ev in payload.confirmed_events:
        ev_id = store.new_id("ev")
        store.academic_events[ev_id] = {
            "id": ev_id,
            "user_id": user_id,
            "semester_id": semester_id,
            "title": ev.title,
            "description": ev.description,
            "start_date": ev.date,
            "end_date": None,
            "category": ev.category,
            "is_official": True,
            "google_event_id": None,
            "created_at": now,
            "updated_at": now,
        }

    # 2. Commit confirmed subjects
    for sub in payload.confirmed_subjects:
        sub_id = store.new_id("subj")
        store.subjects[sub_id] = {
            "id": sub_id,
            "user_id": user_id,
            "semester_id": semester_id,
            "code": sub.code or "SUBJ",
            "name": sub.name,
            "category": sub.category or "Theory",
            "credits": float(sub.credits) if sub.credits else 3.0,
            "color_accent": "#CD202C" if sub.category == "Theory" else "#10B981",
            "faculty_name": sub.faculty,
            "created_at": now,
            "updated_at": now,
        }

    # 3. Commit confirmed exams
    for ex in payload.confirmed_exams:
        ex_id = store.new_id("exam")
        # Match subject by code or name within the semester
        matching_subj = next(
            (s for s in store.subjects.values()
             if s.get("semester_id") == semester_id and (
                 (ex.subject_code and s.get("code") == ex.subject_code) or
                 (ex.subject_name and s.get("name") == ex.subject_name)
             )),
            None
        )
        subj_id = matching_subj["id"] if matching_subj else None
        store.exams[ex_id] = {
            "id": ex_id,
            "user_id": user_id,
            "subject_id": subj_id,
            "title": f"{ex.subject_name} {ex.exam_type}",
            "exam_type": ex.exam_type,
            "exam_date": ex.exam_date,
            "session": ex.session or "FN",
            "target_marks": None,
            "weightage_percent": 20.0,
            "created_at": now,
            "updated_at": now,
        }

    return MessageResponse(
        message=(
            f"Successfully imported {len(payload.confirmed_events)} events, "
            f"{len(payload.confirmed_subjects)} subjects, and "
            f"{len(payload.confirmed_exams)} exams into semester {semester_id}."
        )
    )
