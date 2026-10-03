from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class SyncMutationItem(BaseModel):
    entity_type: str = Field(..., description="Table name e.g. semesters, subjects, chapters, assignments, etc.")
    entity_id: str = Field(..., description="UUID or unique text ID of the entity")
    action: Literal["insert", "update", "delete"] = Field(..., description="Mutation operation")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Entity fields/attributes")
    client_updated_at: datetime = Field(..., description="Timestamp of client modification for LWW resolution")


class SyncPushRequest(BaseModel):
    mutations: List[SyncMutationItem] = Field(default_factory=list, description="Ordered batch of client mutations")


class SyncPushResponse(BaseModel):
    applied_count: int
    conflicts_count: int
    rejected_count: int
    details: List[Dict[str, Any]] = Field(default_factory=list)
    server_timestamp: datetime


class SyncPullRequest(BaseModel):
    since: Optional[datetime] = Field(default=None, description="ISO timestamp to fetch delta changes after")


class SyncPullResponse(BaseModel):
    entities: Dict[str, List[Dict[str, Any]]] = Field(
        default_factory=dict,
        description="Dictionary mapping entity_type to modified records"
    )
    server_timestamp: datetime
