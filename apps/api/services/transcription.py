from __future__ import annotations

import asyncio
import base64
import io
import tempfile
from pathlib import Path

from config import settings
from models.schemas import TranscriptSegment
from models.session import utcnow


class TranscriptionService:
    def __init__(self) -> None:
        self._client = None
        if settings.openai_api_key:
            from openai import OpenAI

            self._client = OpenAI(api_key=settings.openai_api_key)

    async def transcribe(self, audio_bytes: bytes, mime_type: str = "audio/webm") -> TranscriptSegment:
        if not audio_bytes:
            return TranscriptSegment(
                id="empty",
                timestamp=utcnow(),
                text="",
                confidence=0.0,
            )

        if self._client is None:
            return TranscriptSegment(
                id="demo",
                timestamp=utcnow(),
                text="[デモモード] OPENAI_API_KEY を設定すると文字起こしが有効になります。",
                confidence=0.0,
            )

        suffix = _suffix_for_mime(mime_type)
        return await asyncio.to_thread(self._transcribe_sync, audio_bytes, suffix)

    def _transcribe_sync(self, audio_bytes: bytes, suffix: str) -> TranscriptSegment:
        assert self._client is not None
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = Path(tmp.name)

        try:
            with tmp_path.open("rb") as audio_file:
                response = self._client.audio.transcriptions.create(
                    model=settings.transcription_model,
                    file=audio_file,
                    language="ja",
                )
            text = (response.text or "").strip()
            return TranscriptSegment(
                id=tmp_path.stem,
                timestamp=utcnow(),
                text=text,
                confidence=0.9 if text else 0.0,
            )
        finally:
            tmp_path.unlink(missing_ok=True)


def _suffix_for_mime(mime_type: str) -> str:
    mapping = {
        "audio/webm": ".webm",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp4": ".m4a",
        "audio/ogg": ".ogg",
    }
    return mapping.get(mime_type, ".webm")
