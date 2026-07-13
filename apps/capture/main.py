#!/usr/bin/env python3
"""Zoom desktop audio capture CLI.

Captures system audio and streams it to the Zoom Companion API via WebSocket.
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import io
import sys
import wave
from pathlib import Path

import httpx
import numpy as np
import websockets

try:
    import sounddevice as sd
except OSError as exc:
    sd = None  # type: ignore[assignment]
    _SD_IMPORT_ERROR = exc
else:
    _SD_IMPORT_ERROR = None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Capture system audio for Zoom Companion")
    parser.add_argument("--api-url", default="http://localhost:8000", help="API base URL")
    parser.add_argument("--session-id", help="Existing session ID (creates new if omitted)")
    parser.add_argument("--device", type=int, help="Audio input device index")
    parser.add_argument("--chunk-seconds", type=int, default=5, help="Seconds per audio chunk")
    parser.add_argument("--list-devices", action="store_true", help="List audio devices and exit")
    return parser.parse_args()


def list_devices() -> None:
    _require_sounddevice()
    print(sd.query_devices())


def _require_sounddevice() -> None:
    if sd is None:
        raise SystemExit(
            "sounddevice/PortAudio が利用できません。"
            " macOS/Windows/Linux に PortAudio をインストールしてください。"
            f" 詳細: {_SD_IMPORT_ERROR}"
        )


async def create_session(api_url: str) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{api_url}/sessions")
        response.raise_for_status()
        return response.json()["session_id"]


def record_chunk(device: int | None, seconds: int, sample_rate: int = 16000) -> bytes:
    _require_sounddevice()
    frames = int(seconds * sample_rate)
    recording = sd.rec(frames, samplerate=sample_rate, channels=1, dtype="int16", device=device)
    sd.wait()

    if np.max(np.abs(recording)) < 100:
        return b""

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(recording.tobytes())
    return buffer.getvalue()


async def stream_audio(api_url: str, session_id: str, device: int | None, chunk_seconds: int) -> None:
    ws_url = api_url.replace("http://", "ws://").replace("https://", "wss://")
    ws_url = f"{ws_url}/sessions/{session_id}/audio"

    seq = 0
    print(f"Streaming to {ws_url}")
    print("Press Ctrl+C to stop.")

    async with websockets.connect(ws_url) as ws:
        while True:
            audio = await asyncio.to_thread(record_chunk, device, chunk_seconds)
            if not audio:
                print("No audio detected, skipping chunk...")
                continue

            seq += 1
            payload = {
                "type": "audio_chunk",
                "data": base64.b64encode(audio).decode("ascii"),
                "seq": seq,
                "mime_type": "audio/wav",
            }
            await ws.send(__import__("json").dumps(payload))

            try:
                while True:
                    message = await asyncio.wait_for(ws.recv(), timeout=0.1)
                    data = __import__("json").loads(message)
                    if data.get("type") == "transcript":
                        print(f"[transcript] {data['segment']['text']}")
                    elif data.get("type") == "context":
                        for card in data.get("cards", []):
                            print(f"[{card['type']}] {card['title']}: {card['body'][:80]}...")
                    elif data.get("type") == "status":
                        print(f"[status] {data['message']}")
                    elif data.get("type") == "error":
                        print(f"[error] {data['message']}", file=sys.stderr)
            except asyncio.TimeoutError:
                pass


async def main() -> None:
    args = parse_args()

    if args.list_devices:
        list_devices()
        return

    session_id = args.session_id or await create_session(args.api_url)
    print(f"Session ID: {session_id}")

    try:
        await stream_audio(args.api_url, session_id, args.device, args.chunk_seconds)
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    asyncio.run(main())
