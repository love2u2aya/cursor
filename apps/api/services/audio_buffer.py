from __future__ import annotations

import asyncio
import base64
import time
from dataclasses import dataclass, field


@dataclass
class AudioBuffer:
    duration_seconds: int = 30
    _chunks: list[bytes] = field(default_factory=list)
    _mime_type: str = "audio/webm"
    _started_at: float = field(default_factory=time.monotonic)
    _last_seq: int = -1

    def add_chunk(self, data_b64: str, seq: int, mime_type: str | None = None) -> None:
        if mime_type:
            self._mime_type = mime_type
        self._chunks.append(base64.b64decode(data_b64))
        self._last_seq = seq

    @property
    def mime_type(self) -> str:
        return self._mime_type

    @property
    def elapsed(self) -> float:
        return time.monotonic() - self._started_at

    @property
    def has_audio(self) -> bool:
        return bool(self._chunks)

    def should_flush(self) -> bool:
        return self.has_audio and self.elapsed >= self.duration_seconds

    def flush(self) -> tuple[bytes, str]:
        audio = b"".join(self._chunks)
        mime = self._mime_type
        self._chunks = []
        self._started_at = time.monotonic()
        return audio, mime

    def reset(self) -> None:
        self._chunks = []
        self._started_at = time.monotonic()
