from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class TranscriptSegment(BaseModel):
    id: str
    timestamp: datetime
    text: str
    speaker: Optional[str] = None
    confidence: Optional[float] = None


class ContextCard(BaseModel):
    id: str
    type: Literal["knowledge", "summary", "action"]
    title: str
    body: str
    sources: list[str] = Field(default_factory=list)
    relevance_score: float = 0.0


class SessionResponse(BaseModel):
    id: str
    started_at: datetime


class SessionSummaryResponse(BaseModel):
    id: str
    started_at: datetime
    transcript_segments: list[TranscriptSegment]
    context_cards: list[ContextCard]


class CreateSessionResponse(BaseModel):
    session_id: str
    started_at: datetime
