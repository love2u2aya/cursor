import type { TranscriptSegment } from "@/lib/api";

interface Props {
  segments: TranscriptSegment[];
}

export function TranscriptPanel({ segments }: Props) {
  return (
    <section className="panel">
      <h2>トランスクリプト</h2>
      <div className="panel-body scrollable">
        {segments.length === 0 ? (
          <p className="muted">音声を共有すると、約30秒ごとに文字起こしが表示されます。</p>
        ) : (
          <ul className="transcript-list">
            {segments.map((seg) => (
              <li key={seg.id} className="transcript-item">
                <time>{new Date(seg.timestamp).toLocaleTimeString("ja-JP")}</time>
                <p>{seg.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
