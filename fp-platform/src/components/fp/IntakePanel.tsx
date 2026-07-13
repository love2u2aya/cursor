"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IntakeExtraction } from "@/types/intake";
import type { ConsultationSession, Customer } from "@/types/fp";
import {
  mergeExtractionIntoCustomer,
  mergeExtractionIntoSession,
} from "@/lib/extract/transcript-parser";
import { buildCursorAgentPrompt } from "@/lib/extract/agent-prompt";
import { parseAgentExtraction } from "@/lib/extract/agent-import";
import { formatYen } from "@/lib/format";

type IntakeMode = "record" | "text" | "file" | "cursor";

interface SpeechRecognitionEventLike {
  results: ArrayLike<{ [index: number]: { transcript: string } }>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function IntakePanel({
  customer,
  session,
  onApply,
}: {
  customer: Customer;
  session: ConsultationSession;
  onApply: (patch: {
    customer: Customer;
    session: Partial<ConsultationSession>;
  }) => Promise<void>;
}) {
  const [mode, setMode] = useState<IntakeMode>("record");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extraction, setExtraction] = useState<IntakeExtraction | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [agentJson, setAgentJson] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    mediaRecorderRef.current?.stop();
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  async function startListening() {
    setError("");
    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setError(
        "このブラウザは音声認識に対応していません。テキスト入力またはファイルをご利用ください。",
      );
      setMode("text");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch {
      setError("マイクへのアクセスが拒否されました。");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let next = "";
      for (let i = 0; i < event.results.length; i += 1) {
        next += event.results[i][0].transcript;
      }
      setTranscript(next);
    };

    recognition.onerror = (event) => {
      setError(`音声認識エラー: ${event.error}`);
      stopListening();
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setMessage("面談内容を話してください。停止すると文字起こしを解析できます。");
  }

  async function handleFileUpload(file: File) {
    setError("");
    setIsProcessing(true);
    setMessage("ファイルを文字起こし中...");

    const form = new FormData();
    form.append("file", file);

    const response = await fetch("/api/fp/intake/transcribe", {
      method: "POST",
      body: form,
    });

    const data = (await response.json()) as {
      transcript?: string;
      error?: string;
    };

    setIsProcessing(false);

    if (!response.ok) {
      setError(data.error ?? "文字起こしに失敗しました。");
      if (data.error?.includes("OPENAI_API_KEY")) {
        setMessage(
          "ライブ録音またはテキスト貼り付けで代替できます。動画の場合は別途文字起こし結果を貼り付けてください。",
        );
      }
      return;
    }

    setTranscript(data.transcript ?? "");
    setMessage("文字起こしが完了しました。解析を実行してください。");
  }

  async function runExtraction() {
    if (!transcript.trim()) {
      setError("文字起こしテキストがありません。");
      return;
    }

    setIsProcessing(true);
    setError("");

    const response = await fetch("/api/fp/intake/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });

    const data = (await response.json()) as IntakeExtraction & { error?: string };
    setIsProcessing(false);

    if (!response.ok) {
      setError(data.error ?? "解析に失敗しました。");
      return;
    }

    setExtraction(data);
    setSelectedKeys(new Set(data.fields.map((field) => field.key)));
    setMessage(
      `${data.fields.length} 件の項目を検出しました（方式: ${methodLabel(data.method)}）。反映する項目を選んでください。`,
    );
  }

  function methodLabel(method: IntakeExtraction["method"]): string {
    const labels = {
      rules: "ルール解析",
      llm: "AI解析",
      hybrid: "ハイブリッド",
      cursor: "Cursor解析",
    };
    return labels[method];
  }

  async function copyCursorPrompt() {
    if (!transcript.trim()) {
      setError("先に文字起こしテキストを入力してください。");
      return;
    }
    await navigator.clipboard.writeText(buildCursorAgentPrompt(transcript));
    setPromptCopied(true);
    setMessage(
      "プロンプトをコピーしました。Cursor チャットに貼り付けて解析してください。返ってきた JSON を下の欄に貼り付けます。",
    );
    setTimeout(() => setPromptCopied(false), 3000);
  }

  function importCursorJson() {
    setError("");
    try {
      const data = parseAgentExtraction(agentJson, transcript);
      setExtraction(data);
      setSelectedKeys(new Set(data.fields.map((field) => field.key)));
      setMessage(
        `${data.fields.length} 件の項目を Cursor 解析から読み込みました。`,
      );
    } catch {
      setError("JSON の形式が正しくありません。Cursor の返答をそのまま貼り付けてください。");
    }
  }

  async function applySelected() {
    if (!extraction) return;

    const filtered: IntakeExtraction = {
      ...extraction,
      customer: {},
      cashFlow: [],
      assets: [],
      liabilities: [],
      insurancePolicies: [],
      fpNotesAppend: "",
      internalMemoAppend: "",
      fields: extraction.fields.filter((field) => selectedKeys.has(field.key)),
    };

    for (const field of filtered.fields) {
      if (field.key.startsWith("customer.")) {
        const key = field.key.replace("customer.", "") as keyof Customer;
        (filtered.customer as Record<string, unknown>)[key] = field.value;
      }
      if (field.key === "cashflow.income" || field.key === "cashflow.expense") {
        const line = extraction.cashFlow.find((item) =>
          field.key === "cashflow.income"
            ? item.kind === "income"
            : item.kind === "expense",
        );
        if (line) filtered.cashFlow.push(line);
      }
      if (field.key === "asset.deposit" || field.key === "asset.securities") {
        const asset = extraction.assets.find((item) =>
          field.key === "asset.deposit"
            ? item.type === "deposit"
            : item.type === "securities",
        );
        if (asset) filtered.assets.push(asset);
      }
      if (field.key === "liability.mortgage") {
        filtered.liabilities.push(...extraction.liabilities);
      }
      if (field.key === "insurance.policy") {
        filtered.insurancePolicies.push(...extraction.insurancePolicies);
      }
      if (field.key === "insurance.all") {
        filtered.insurancePolicies.push(...extraction.insurancePolicies);
      }
      if (field.key.startsWith("cashflow.") && field.key !== "cashflow.income" && field.key !== "cashflow.expense") {
        const index = Number(field.key.split(".")[1]);
        const line = extraction.cashFlow[index];
        if (line) filtered.cashFlow.push(line);
      }
      if (field.key === "assets.all") {
        filtered.assets.push(...extraction.assets);
      }
      if (field.key === "liabilities.all") {
        filtered.liabilities.push(...extraction.liabilities);
      }
      if (field.key === "memo.internal") {
        filtered.internalMemoAppend = extraction.internalMemoAppend;
      }
    }

    filtered.fpNotesAppend = extraction.fpNotesAppend;

    const nextCustomer = mergeExtractionIntoCustomer(customer, filtered.customer);
    const sessionPatch = mergeExtractionIntoSession(session, filtered);

    await onApply({ customer: nextCustomer, session: sessionPatch });
    setMessage("選択した項目をフォームに反映しました。");
    setExtraction(null);
  }

  function toggleKey(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          音声・テキスト自動入力
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          リアルタイムは録音＋ルール解析。まとめて処理する場合は Cursor（月額内）解析も使えます。
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["record", "ライブ録音"],
            ["text", "テキスト"],
            ["file", "動画・音声"],
            ["cursor", "Cursorまとめて解析"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              mode === id
                ? "bg-blue-700 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "record" ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {!isListening ? (
            <button
              type="button"
              onClick={startListening}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              録音・音声認識を開始
            </button>
          ) : (
            <button
              type="button"
              onClick={stopListening}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white"
            >
              停止
            </button>
          )}
          <span className="self-center text-sm text-slate-500">
            {isListening ? "認識中..." : "面談しながら話した内容が下に表示されます"}
          </span>
        </div>
      ) : null}

      {mode === "file" ? (
        <label className="mb-4 block">
          <span className="text-sm font-medium text-slate-700">
            動画・音声ファイル（mp4, webm, m4a など）
          </span>
          <input
            type="file"
            accept="audio/*,video/*"
            className="mt-2 block w-full text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFileUpload(file);
            }}
          />
        </label>
      ) : null}

      {mode === "cursor" ? (
        <div className="mb-4 space-y-3 rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm text-slate-700">
          <p className="font-medium text-violet-900">
            面談後のまとめて解析（OPENAI_API_KEY 不要・Cursor月額内）
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>下の文字起こしを入力（または貼り付け）</li>
            <li>「プロンプトをコピー」→ Cursor チャットに貼り付け</li>
            <li>返ってきた JSON を下の欄に貼り付け →「JSONを読み込む」</li>
          </ol>
          <button
            type="button"
            onClick={copyCursorPrompt}
            disabled={!transcript.trim()}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
          >
            {promptCopied ? "コピーしました" : "Cursor用プロンプトをコピー"}
          </button>
          <label className="block font-medium text-slate-700">
            Cursor の返答 JSON
            <textarea
              value={agentJson}
              onChange={(event) => setAgentJson(event.target.value)}
              rows={5}
              placeholder='{"customer":{"birthDate":"1985-03-03",...},...}'
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs"
            />
          </label>
          <button
            type="button"
            onClick={importCursorJson}
            disabled={!agentJson.trim()}
            className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50"
          >
            JSONを読み込む
          </button>
        </div>
      ) : null}

      <label className="block text-sm font-medium text-slate-700">
        文字起こしテキスト
        <textarea
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          rows={6}
          placeholder="例: 年収は650万で、配偶者は420万です。住宅ローン残高は2800万、月々9万5千円くらい払っています。終身保険に入っていて保障額は1000万です。"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        {mode !== "cursor" ? (
          <button
            type="button"
            onClick={runExtraction}
            disabled={isProcessing || !transcript.trim()}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {isProcessing ? "処理中..." : "解析して項目を抽出（ルール）"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      {extraction && extraction.fields.length > 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="font-semibold text-slate-900">抽出結果プレビュー</h4>
          <ul className="mt-3 space-y-2">
            {extraction.fields.map((field) => (
              <li
                key={field.key}
                className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedKeys.has(field.key)}
                  onChange={() => toggleKey(field.key)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {field.label}
                    </span>
                    <ConfidenceBadge confidence={field.confidence} />
                  </div>
                  <p className="mt-1 text-slate-700">
                    {formatFieldValue(field.value)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    根拠: 「{field.snippet}」
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={applySelected}
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            選択項目をフォームに反映
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: "high" | "medium" | "low";
}) {
  const styles = {
    high: "bg-emerald-100 text-emerald-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-slate-100 text-slate-600",
  };
  const labels = { high: "高", medium: "中", low: "低" };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[confidence]}`}
    >
      信頼度{labels[confidence]}
    </span>
  );
}

function formatFieldValue(value: unknown): string {
  if (typeof value === "number") return formatYen(value);
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("balance" in obj || "monthlyPayment" in obj) {
      return `残高 ${formatYen(Number(obj.balance ?? 0))} / 月 ${formatYen(Number(obj.monthlyPayment ?? 0))}`;
    }
    if ("insuredAmount" in obj) {
      return `${String(obj.productName ?? "保険")} 保障 ${formatYen(Number(obj.insuredAmount ?? 0))}`;
    }
    return JSON.stringify(value);
  }
  return String(value);
}
