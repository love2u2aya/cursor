from __future__ import annotations

import asyncio
import json
from uuid import uuid4

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from config import settings
from models.schemas import CreateSessionResponse, SessionSummaryResponse, TranscriptSegment
from models.session import Session
from services.audio_buffer import AudioBuffer
from services.context import ContextService
from services.knowledge import KnowledgeService
from services.session_store import SessionStore
from services.transcription import TranscriptionService

app = FastAPI(title="Zoom Companion API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

session_store = SessionStore()
knowledge_service = KnowledgeService()
transcription_service = TranscriptionService()
context_service = ContextService(knowledge_service)


@app.on_event("startup")
async def startup() -> None:
    knowledge_service.ensure_indexed()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/sessions", response_model=CreateSessionResponse)
async def create_session() -> CreateSessionResponse:
    session = session_store.create()
    return CreateSessionResponse(session_id=session.id, started_at=session.started_at)


@app.get("/sessions/{session_id}", response_model=SessionSummaryResponse)
async def get_session(session_id: str) -> SessionSummaryResponse:
    session = _require_session(session_id)
    return SessionSummaryResponse(
        id=session.id,
        started_at=session.started_at,
        transcript_segments=session.transcript_segments,
        context_cards=session.context_cards,
    )


@app.get("/sessions/{session_id}/export")
async def export_session(session_id: str) -> PlainTextResponse:
    session = _require_session(session_id)
    lines = [
        f"# 会議メモ - {session.started_at.isoformat()}",
        "",
        "## トランスクリプト",
    ]
    for seg in session.transcript_segments:
        lines.append(f"- [{seg.timestamp.isoformat()}] {seg.text}")

    lines.extend(["", "## 要約・関連情報"])
    for card in session.context_cards:
        lines.append(f"### {card.title} ({card.type})")
        lines.append(card.body)
        if card.sources:
            lines.append(f"出典: {', '.join(card.sources)}")
        lines.append("")

    return PlainTextResponse("\n".join(lines), media_type="text/markdown; charset=utf-8")


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str) -> dict[str, str]:
    session_store.delete(session_id)
    return {"status": "deleted"}


@app.websocket("/sessions/{session_id}/audio")
async def audio_websocket(websocket: WebSocket, session_id: str) -> None:
    session = session_store.get(session_id)
    if session is None:
        await websocket.close(code=4404)
        return

    await websocket.accept()
    buffer = AudioBuffer(duration_seconds=settings.chunk_duration_seconds)

    try:
        await websocket.send_json({"type": "status", "message": "接続しました。音声の送信を開始できます。"})

        while True:
            raw = await websocket.receive_text()
            message = json.loads(raw)

            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if message.get("type") != "audio_chunk":
                continue

            buffer.add_chunk(
                data_b64=message["data"],
                seq=int(message.get("seq", 0)),
                mime_type=message.get("mime_type"),
            )

            if buffer.should_flush():
                await _process_buffer(websocket, session, buffer)

    except WebSocketDisconnect:
        if buffer.has_audio:
            await _process_buffer(websocket, session, buffer)
    except Exception as exc:
        await websocket.send_json({"type": "error", "message": str(exc)})


async def _process_buffer(websocket: WebSocket, session: Session, buffer: AudioBuffer) -> None:
    audio_bytes, mime_type = buffer.flush()
    if not audio_bytes:
        return

    await websocket.send_json({"type": "status", "message": "文字起こし中..."})

    try:
        segment = await transcription_service.transcribe(audio_bytes, mime_type=mime_type)
        segment.id = str(uuid4())
        if segment.text.strip():
            session.add_transcript(segment)
            await websocket.send_json({"type": "transcript", "segment": json.loads(segment.model_dump_json())})

            await websocket.send_json({"type": "status", "message": "関連情報を検索中..."})
            context = await context_service.extract_context(session)
            if context["cards"]:
                await websocket.send_json(
                    {
                        "type": "context",
                        "cards": context["cards"],
                        "summary": context.get("summary"),
                        "decisions": context.get("decisions"),
                        "open_questions": context.get("open_questions"),
                    }
                )
    except Exception as exc:
        await websocket.send_json({"type": "error", "message": f"処理エラー: {exc}"})


def _require_session(session_id: str) -> Session:
    session = session_store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
