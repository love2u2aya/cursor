/** 「650万」「6,500万円」「6500000円」などを円単位に変換 */
export function parseJapaneseAmount(raw: string): number | null {
  const normalized = raw.replace(/,/g, "").trim();
  if (!normalized) return null;

  const okuMatch = normalized.match(/^(\d+(?:\.\d+)?)億(?:円)?$/);
  if (okuMatch) return Math.round(Number(okuMatch[1]) * 100_000_000);

  const manMatch = normalized.match(/^(\d+(?:\.\d+)?)万(?:円)?$/);
  if (manMatch) return Math.round(Number(manMatch[1]) * 10_000);

  const yenMatch = normalized.match(/^(\d+)円?$/);
  if (yenMatch) return Number(yenMatch[1]);

  return null;
}

/** テキスト中の金額表現（例: 年収650万）を抽出 */
export function findAmountAfter(
  text: string,
  pattern: RegExp,
): { amount: number; snippet: string } | null {
  const match = text.match(pattern);
  if (!match?.[1]) return null;

  const amount = parseJapaneseAmount(`${match[1]}万`) ?? parseJapaneseAmount(match[1]);
  if (amount == null) return null;

  return { amount, snippet: match[0] };
}

export function findFirstAmountInMan(text: string, window: string): number | null {
  const found = findAmountAfter(text, new RegExp(window, "i"));
  return found?.amount ?? null;
}
