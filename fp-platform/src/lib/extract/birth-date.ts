export interface BirthDateExtraction {
  birthDate: string;
  snippet: string;
  confidence: "high" | "medium" | "low";
  isCorrection: boolean;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function findYearInText(text: string): number | null {
  const match = text.match(/(\d{4})\s*年/);
  return match ? Number(match[1]) : null;
}

/** 「実際は3月3日」など月日のみの表現を ISO 日付に */
function parseMonthDay(
  text: string,
  monthStr: string,
  dayStr: string,
  yearOverride?: string,
): string | null {
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const year = yearOverride
    ? Number(yearOverride)
    : findYearInText(text);
  if (!year) return null;

  return toIsoDate(year, month, day);
}

/**
 * 生年月日の訂正を検出する。
 * 例: 「生年月日が1985年4月12日となっていたが実際は3月の3日」→ 1985-03-03
 */
export function extractBirthDate(text: string): BirthDateExtraction | null {
  const correctionWithOld = text.match(
    /(?:生年月日|誕生日|出生年月日).{0,50}?(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日.{0,80}?(?:実際は|正しくは|本当は|本来は|正しいのは)(?:、)?\s*(?:(\d{4})\s*年\s*)?(\d{1,2})\s*月の?\s*(\d{1,2})\s*日/,
  );

  if (correctionWithOld) {
    const [, oldYear, , , newYear, newMonth, newDay] = correctionWithOld;
    const birthDate =
      parseMonthDay(text, newMonth, newDay, newYear ?? oldYear) ?? null;
    if (birthDate) {
      return {
        birthDate,
        snippet: correctionWithOld[0],
        confidence: "high",
        isCorrection: true,
      };
    }
  }

  const correctionSimple = text.match(
    /(?:実際は|正しくは|本当は|本来は|正しいのは|変更(?:後|先)?(?:は|が)?)\s*(?:(\d{4})\s*年\s*)?(\d{1,2})\s*月の?\s*(\d{1,2})\s*日/,
  );

  if (correctionSimple && /変更|実際|正しい|本当|本来/.test(text)) {
    const [, yearStr, monthStr, dayStr] = correctionSimple;
    const birthDate = parseMonthDay(text, monthStr, dayStr, yearStr);
    if (birthDate) {
      return {
        birthDate,
        snippet: correctionSimple[0],
        confidence: yearStr ? "high" : "medium",
        isCorrection: true,
      };
    }
  }

  const plain = text.match(
    /(?:生年月日|誕生日|出生年月日)(?:は|が)?\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/,
  );

  if (plain) {
    const [, yearStr, monthStr, dayStr] = plain;
    const birthDate = toIsoDate(
      Number(yearStr),
      Number(monthStr),
      Number(dayStr),
    );
    return {
      birthDate,
      snippet: plain[0],
      confidence: "medium",
      isCorrection: false,
    };
  }

  return null;
}
