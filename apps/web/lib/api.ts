import type { ContextCard, TranscriptSegment } from "@shared/protocol";

export type { ContextCard, TranscriptSegment };

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function createSession(): Promise<{ session_id: string; started_at: string }> {
  const res = await fetch(`${API_URL}/sessions`, { method: "POST" });
  if (!res.ok) throw new Error("セッションの作成に失敗しました");
  const data = await res.json();
  return { session_id: data.session_id, started_at: data.started_at };
}

export function exportSessionUrl(sessionId: string): string {
  return `${API_URL}/sessions/${sessionId}/export`;
}
