import type { ContextCard, TranscriptSegment } from "@/lib/api";

export interface DemoStep {
  delayMs: number;
  status: string;
  segment?: TranscriptSegment;
  cards?: ContextCard[];
  summary?: string;
  decisions?: string[];
  openQuestions?: string[];
}

export const DEMO_STEPS: DemoStep[] = [
  {
    delayMs: 800,
    status: "音声を受信中...",
  },
  {
    delayMs: 1200,
    status: "文字起こし中...",
    segment: {
      id: "demo-1",
      timestamp: new Date().toISOString(),
      text: "お世話になっております。本日はプロフェッショナルプランの料金と導入期間についてお聞きしたいです。",
      confidence: 0.92,
    },
  },
  {
    delayMs: 1500,
    status: "関連情報を検索中...",
    summary: "顧客がプロフェッショナルプランの料金と導入スケジュールについて質問している。",
    cards: [
      {
        id: "demo-card-1",
        type: "knowledge",
        title: "関連情報: pricing.md",
        body: "プロフェッショナルプラン: 月額 29,800円（税抜）。ユーザー数最大50名、ストレージ500GB。電話・チャットサポート（平日9-21時）。",
        sources: ["pricing.md"],
        relevance_score: 0.91,
      },
    ],
  },
  {
    delayMs: 2000,
    status: "文字起こし中...",
    segment: {
      id: "demo-2",
      timestamp: new Date().toISOString(),
      text: "セキュリティ面も気になっています。データの保存場所と認証について教えていただけますか？",
      confidence: 0.89,
    },
  },
  {
    delayMs: 1500,
    status: "関連情報を検索中...",
    cards: [
      {
        id: "demo-card-2",
        type: "knowledge",
        title: "関連情報: faq.md",
        body: "データは国内データセンターに保存。通信はTLS 1.3で暗号化。SOC2 Type II 認証取得済み。二要素認証（2FA）対応。",
        sources: ["faq.md"],
        relevance_score: 0.88,
      },
    ],
    openQuestions: ["オンプレミス対応の可否", "既存CRMとの連携方法"],
  },
  {
    delayMs: 2000,
    status: "文字起こし中...",
    segment: {
      id: "demo-3",
      timestamp: new Date().toISOString(),
      text: "では14日間の無料トライアルから始めたいと思います。来週の月曜にオンボーディングをお願いできますか？",
      confidence: 0.94,
    },
  },
  {
    delayMs: 1500,
    status: "関連情報を検索中...",
    summary: "無料トライアル開始と来週月曜のオンボーディング希望。セキュリティ要件の確認が残っている。",
    decisions: ["14日間無料トライアルで開始", "来週月曜にオンボーディングミーティングを設定"],
    cards: [
      {
        id: "demo-card-3",
        type: "knowledge",
        title: "関連情報: onboarding.md",
        body: "トライアル開始: アカウント発行（即日〜1営業日）。初期設定ガイド送付。オンボーディングミーティング60分。",
        sources: ["onboarding.md"],
        relevance_score: 0.85,
      },
      {
        id: "demo-card-4",
        type: "action",
        title: "アクションアイテム",
        body: "来週月曜のオンボーディングミーティングをカレンダーに登録する",
        sources: [],
        relevance_score: 0.8,
      },
    ],
  },
  {
    delayMs: 500,
    status: "デモ完了 — 実際の会議では約30秒ごとに更新されます",
  },
];

export function runDemo(
  onStep: (step: DemoStep) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    let index = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const abort = () => {
      clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", abort);

    const next = () => {
      if (signal?.aborted) return;
      if (index >= DEMO_STEPS.length) {
        signal?.removeEventListener("abort", abort);
        resolve();
        return;
      }
      const step = DEMO_STEPS[index++];
      onStep(step);
      timeoutId = setTimeout(next, step.delayMs);
    };

    next();
  });
}
