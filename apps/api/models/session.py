from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from models.schemas import ContextCard, TranscriptSegment


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class Session:
    id: str
    started_at: datetime = field(default_factory=utcnow)
    transcript_segments: list[TranscriptSegment] = field(default_factory=list)
    context_cards: list[ContextCard] = field(default_factory=list)
    seen_card_titles: set[str] = field(default_factory=set)
    last_context_at: Optional[datetime] = None

    @classmethod
    def create(cls) -> "Session":
        return cls(id=str(uuid4()))

    def add_transcript(self, segment: TranscriptSegment) -> None:
        self.transcript_segments.append(segment)

    def add_cards(self, cards: list[ContextCard]) -> list[ContextCard]:
        new_cards: list[ContextCard] = []
        for card in cards:
            key = f"{card.type}:{card.title.strip().lower()}"
            if key in self.seen_card_titles:
                continue
            self.seen_card_titles.add(key)
            self.context_cards.append(card)
            new_cards.append(card)
        return new_cards

    def recent_transcript_text(self, minutes: int = 3) -> str:
        cutoff = utcnow().timestamp() - minutes * 60
        lines = [
            seg.text
            for seg in self.transcript_segments
            if seg.timestamp.timestamp() >= cutoff
        ]
        return "\n".join(lines)
