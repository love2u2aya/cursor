"use client";

import { useCallback, useState } from "react";
import type { ServerMessage } from "@shared/protocol";
import { ConsentModal } from "@/components/ConsentModal";
import { ContextCards } from "@/components/ContextCards";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useSession } from "@/hooks/useSession";
import type { ContextCard, TranscriptSegment } from "@/lib/api";
import { createSession, exportSessionUrl } from "@/lib/api";

export default function HomePage() {
  const [consented, setConsented] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [cards, setCards] = useState<ContextCard[]>([]);
  const [summary, setSummary] = useState<string>();
  const [decisions, setDecisions] = useState<string[]>([]);
  const [openQuestions, setOpenQuestions] = useState<string[]>([]);
  const [status, setStatus] = useState("待機中");
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  const handleMessage = useCallback((message: ServerMessage) => {
    if (message.type === "transcript") {
      setSegments((prev) => [...prev, message.segment]);
    }
    if (message.type === "context") {
      setCards((prev) => {
        const existing = new Set(prev.map((c) => `${c.type}:${c.title}`));
        const merged = [...prev];
        for (const card of message.cards) {
          const key = `${card.type}:${card.title}`;
          if (!existing.has(key)) {
            existing.add(key);
            merged.push(card);
          }
        }
        return merged;
      });
      if (message.summary) setSummary(message.summary);
      if (message.decisions) setDecisions(message.decisions);
      if (message.open_questions) setOpenQuestions(message.open_questions);
    }
  }, []);

  const { connected, connect, disconnect, sendAudioChunk } = useSession({
    sessionId,
    onMessage: handleMessage,
    onStatus: setStatus,
    onError: setError,
  });

  const { capturing, startCapture, stopCapture } = useAudioCapture({
    onChunk: sendAudioChunk,
    onError: setError,
  });

  const startSession = async () => {
    setError(null);
    const session = await createSession();
    setSessionId(session.session_id);
    setActive(true);
    connect(session.session_id);
  };

  const stopSession = () => {
    stopCapture();
    disconnect();
    setActive(false);
    setStatus("セッション終了");
  };

  const handleExport = () => {
    if (!sessionId) return;
    window.open(exportSessionUrl(sessionId), "_blank");
  };

  if (!consented) {
    return <ConsentModal onAccept={() => setConsented(true)} />;
  }

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>Zoom Companion</h1>
          <p className="subtitle">会議の聞き取りと関連情報表示（約30秒遅延）</p>
        </div>
        <div className="status-bar">
          <span className={`dot ${connected ? "online" : "offline"}`} />
          {status}
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="controls">
        {!active ? (
          <button className="btn primary" onClick={startSession}>
            セッション開始
          </button>
        ) : (
          <>
            {!capturing ? (
              <button className="btn primary" onClick={startCapture} disabled={!connected}>
                Zoomタブの音声を共有
              </button>
            ) : (
              <button className="btn danger" onClick={stopCapture}>
                音声共有を停止
              </button>
            )}
            <button className="btn secondary" onClick={handleExport} disabled={!sessionId}>
              議事録をエクスポート
            </button>
            <button className="btn secondary" onClick={stopSession}>
              セッション終了
            </button>
          </>
        )}
      </div>

      <div className="grid">
        <TranscriptPanel segments={segments} />
        <ContextCards
          cards={cards}
          summary={summary}
          decisions={decisions}
          openQuestions={openQuestions}
        />
      </div>

      <footer className="footer">
        <p>
          ヒント: ブラウザ版Zoomのタブを共有し、「タブの音声も共有」を有効にしてください。
          デスクトップ版Zoomの場合は <code>apps/capture</code> CLI をご利用ください。
        </p>
      </footer>
    </main>
  );
}
