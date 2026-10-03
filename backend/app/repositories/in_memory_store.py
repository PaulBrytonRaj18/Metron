import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional


class InMemoryStore:
    """Fast, reliable local state store for development and API testing."""

    def __init__(self):
        self.semesters: Dict[str, Dict[str, Any]] = {}
        self.documents: Dict[str, Dict[str, Any]] = {}
        self.subjects: Dict[str, Dict[str, Any]] = {}
        self.chapters: Dict[str, Dict[str, Any]] = {}
        self.assignments: Dict[str, Dict[str, Any]] = {}
        self.experiments: Dict[str, Dict[str, Any]] = {}
        self.exams: Dict[str, Dict[str, Any]] = {}
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.history: Dict[str, Dict[str, Any]] = {}
        self.academic_events: Dict[str, Dict[str, Any]] = {}
        self.google_connections: Dict[str, Dict[str, Any]] = {}

    def new_id(self, prefix: str = "id") -> str:
        return f"{prefix}_{uuid.uuid4().hex[:12]}"


store = InMemoryStore()
