from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    semesters,
    documents,
    subjects,
    chapters,
    assignments,
    laboratories,
    exams,
    tasks,
    history,
    calendar,
    integrations,
    marks,
    intelligence,
    sync,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(semesters.router)
api_router.include_router(documents.router)
api_router.include_router(subjects.router)
api_router.include_router(chapters.router)
api_router.include_router(assignments.router)
api_router.include_router(laboratories.router)
api_router.include_router(exams.router)
api_router.include_router(tasks.router)
api_router.include_router(history.router)
api_router.include_router(calendar.router)
api_router.include_router(integrations.router)
api_router.include_router(marks.router)
api_router.include_router(intelligence.router)
api_router.include_router(sync.router)
