"use client";

interface Props {
  audioLevel: number;
  isSpeaking: boolean;
  chunksSent: number;
  frequencyData: Uint8Array;
  bufferSeconds?: number;
  bufferTotal?: number;
  lastChunkAt?: number | null;
}

export function AudioActivityPanel({
  audioLevel,
  isSpeaking,
  chunksSent,
  frequencyData,
  bufferSeconds = 0,
  bufferTotal = 30,
  lastChunkAt,
}: Props) {
  const bars = Array.from(frequencyData.slice(0, 24));
  const bufferPercent = Math.min(100, (bufferSeconds / bufferTotal) * 100);

  return (
    <section className={`audio-activity ${isSpeaking ? "speaking" : "silent"}`}>
      <div className="audio-activity-header">
        <span className={`audio-dot ${isSpeaking ? "active" : ""}`} />
        <strong>{isSpeaking ? "音声を検知中" : "待機中（無音）"}</strong>
        <span className="audio-meta">送信チャンク: {chunksSent}</span>
      </div>

      <div className="vu-bars" aria-hidden>
        {bars.map((value, i) => (
          <div
            key={i}
            className="vu-bar"
            style={{ height: `${Math.max(4, (value / 255) * 100)}%` }}
          />
        ))}
      </div>

      <div className="level-row">
        <div className="level-track">
          <div
            className="level-fill"
            style={{ width: `${Math.min(100, audioLevel * 400)}%` }}
          />
        </div>
        <span className="level-label">{Math.round(audioLevel * 100)}%</span>
      </div>

      <div className="buffer-row">
        <span>文字起こしまで</span>
        <div className="buffer-track">
          <div className="buffer-fill" style={{ width: `${bufferPercent}%` }} />
        </div>
        <span className="buffer-label">
          {bufferSeconds.toFixed(0)} / {bufferTotal}秒
        </span>
      </div>

      {lastChunkAt && (
        <p className="audio-hint">サーバー受信 OK（{new Date(lastChunkAt).toLocaleTimeString("ja-JP")}）</p>
      )}

      {!isSpeaking && chunksSent > 0 && (
        <p className="audio-warn">
          音声が検知されていません。Zoomタブの「タブの音声も共有」がオンか確認してください。
        </p>
      )}
    </section>
  );
}
