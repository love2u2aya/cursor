export type ContextCardType = "knowledge" | "summary" | "action";

export interface TranscriptSegment {
  id: string;
  timestamp: string;
  text: string;
  speaker?: string | null;
  confidence?: number | null;
}

export interface ContextCard {
  id: string;
  type: ContextCardType;
  title: string;
  body: string;
  sources: string[];
  relevance_score: number;
}

export interface SessionSummary {
  id: string;
  started_at: string;
  transcript_segments: TranscriptSegment[];
  context_cards: ContextCard[];
}

export type ClientMessage =
  | { type: "audio_chunk"; data: string; seq: number; mime_type?: string }
  | { type: "ping" };

export type ServerMessage =
  | { type: "transcript"; segment: TranscriptSegment }
  | { type: "context"; cards: ContextCard[]; summary?: string; decisions?: string[]; open_questions?: string[] }
  | { type: "status"; message: string }
  | { type: "error"; message: string }
  | { type: "pong" };
