"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ServerMessage } from "@shared/protocol";

interface UseSessionOptions {
  sessionId: string | null;
  onMessage: (message: ServerMessage) => void;
  onStatus?: (status: string) => void;
  onError?: (error: string) => void;
}

export function useSession({ sessionId, onMessage, onStatus, onError }: UseSessionOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const seqRef = useRef(0);

  const connect = useCallback((overrideSessionId?: string) => {
    const sid = overrideSessionId ?? sessionId;
    if (!sid) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const wsUrl = apiUrl.replace(/^http/, "ws") + `/sessions/${sid}/audio`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => onError?.("WebSocket接続エラー");
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      if (message.type === "status") onStatus?.(message.message);
      if (message.type === "error") onError?.(message.message);
      onMessage(message);
    };
  }, [sessionId, onMessage, onStatus, onError]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  const sendAudioChunk = useCallback((base64: string, mimeType: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    seqRef.current += 1;
    ws.send(
      JSON.stringify({
        type: "audio_chunk",
        data: base64,
        seq: seqRef.current,
        mime_type: mimeType,
      })
    );
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { connected, connect, disconnect, sendAudioChunk };
}
