/** Cursor エージェント（月額プラン内）向けの解析プロンプトを生成 */
export function buildCursorAgentPrompt(transcript: string): string {
  return `あなたは日本のファイナンシャルプランナー（FP）面談の文字起こしを解析するアシスタントです。
以下の文字起こしから、FP専用システムに反映するデータを JSON のみで返してください。説明文は不要です。

## ルール
- 金額はすべて円単位の整数（例: 650万 → 6500000、月9.5万 → 95000）
- 生年月日は YYYY-MM-DD（訂正がある場合は正しい日付を採用。例: 「4月12日だが実際は3月3日」→ 年は文脈から継承）
- 不明・言及なしの項目は省略
- 配列は該当がある場合のみ

## 出力 JSON スキーマ
\`\`\`json
{
  "customer": {
    "birthDate": "YYYY-MM-DD",
    "annualIncome": 0,
    "spouseAnnualIncome": 0,
    "dependents": 0,
    "phone": "",
    "email": "",
    "postalCode": "",
    "address": "",
    "occupation": "",
    "employer": ""
  },
  "cashFlow": [
    { "kind": "income|expense", "category": "", "label": "", "amountMonthly": 0 }
  ],
  "assets": [
    { "type": "deposit|securities|real_estate|other", "label": "", "institution": "", "amount": 0 }
  ],
  "liabilities": [
    { "type": "mortgage|loan|other", "label": "", "institution": "", "balance": 0, "monthlyPayment": 0 }
  ],
  "insurancePolicies": [
    { "company": "", "productName": "", "type": "life|medical|cancer|disability|other", "insuredAmount": 0, "annualPremium": 0, "beneficiaries": "" }
  ],
  "fpNotesAppend": "面談要約（短文）",
  "internalMemoAppend": "告知・注意事項など"
}
\`\`\`

## 文字起こし
${transcript}`;
}
