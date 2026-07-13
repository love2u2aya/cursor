import type { IntakeExtraction } from "@/types/intake";

const SYSTEM_PROMPT = `あなたは日本のファイナンシャルプランナー面談の文字起こしから、構造化データを抽出するアシスタントです。
JSONのみを返してください。スキーマ:
{
  "customer": { "birthDate": "YYYY-MM-DD", "annualIncome": number, "spouseAnnualIncome": number, "dependents": number, "phone": string, "email": string, "address": string, "occupation": string, "employer": string },
  "cashFlow": [{ "kind": "income"|"expense", "category": string, "label": string, "amountMonthly": number }],
  "assets": [{ "type": "deposit"|"securities"|"real_estate"|"other", "label": string, "amount": number }],
  "liabilities": [{ "type": "mortgage"|"loan"|"other", "label": string, "balance": number, "monthlyPayment": number }],
  "insurancePolicies": [{ "company": string, "productName": string, "type": "life"|"medical"|"cancer"|"other", "insuredAmount": number, "annualPremium": number }],
  "internalMemoAppend": string
}
金額はすべて円単位の整数。不明な項目は省略。`;

export async function extractWithLlm(
  transcript: string,
): Promise<Partial<IntakeExtraction> | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: transcript },
      ],
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as Partial<IntakeExtraction>;
    return parsed;
  } catch {
    return null;
  }
}

export async function transcribeAudio(
  file: Blob,
  filename: string,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const form = new FormData();
  form.append("file", file, filename);
  form.append("model", "whisper-1");
  form.append("language", "ja");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { text?: string };
  return data.text ?? null;
}
