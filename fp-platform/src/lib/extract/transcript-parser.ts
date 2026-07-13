import { createId } from "@/lib/id";
import { findAmountAfter } from "@/lib/extract/amount";
import type { IntakeExtraction } from "@/types/intake";
import type {
  AssetItem,
  CashFlowLine,
  Customer,
  InsurancePolicy,
  LiabilityItem,
} from "@/types/fp";

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[　]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pushField(
  extraction: IntakeExtraction,
  key: string,
  label: string,
  value: unknown,
  snippet: string,
  confidence: "high" | "medium" | "low",
) {
  extraction.fields.push({ key, label, value, snippet, confidence });
}

export function extractFromTranscript(transcript: string): IntakeExtraction {
  const text = normalizeText(transcript);
  const extraction: IntakeExtraction = {
    customer: {},
    cashFlow: [],
    assets: [],
    liabilities: [],
    insurancePolicies: [],
    fpNotesAppend: "",
    internalMemoAppend: "",
    fields: [],
    transcript: text,
    method: "rules",
  };

  if (!text) return extraction;

  const phoneMatch = text.match(/(0\d{1,4}[-‐－]?\d{1,4}[-‐－]?\d{3,4})/);
  if (phoneMatch) {
    extraction.customer.phone = phoneMatch[1].replace(/[‐－]/g, "-");
    pushField(
      extraction,
      "customer.phone",
      "電話番号",
      extraction.customer.phone,
      phoneMatch[0],
      "high",
    );
  }

  const emailMatch = text.match(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
  );
  if (emailMatch) {
    extraction.customer.email = emailMatch[1];
    pushField(
      extraction,
      "customer.email",
      "メール",
      extraction.customer.email,
      emailMatch[0],
      "high",
    );
  }

  const postalMatch = text.match(/(?:〒)?(\d{3}[-‐－]?\d{4})/);
  if (postalMatch) {
    extraction.customer.postalCode = postalMatch[1].replace(/[‐－]/g, "-");
    pushField(
      extraction,
      "customer.postalCode",
      "郵便番号",
      extraction.customer.postalCode,
      postalMatch[0],
      "high",
    );
  }

  const annualIncome = findAmountAfter(
    text,
    /(?:本人|自分|わたし|私)?(?:の)?年収(?:は|が)?\s*(\d+(?:,\d+)?)\s*万/,
  );
  if (annualIncome) {
    extraction.customer.annualIncome = annualIncome.amount;
    pushField(
      extraction,
      "customer.annualIncome",
      "本人年収",
      annualIncome.amount,
      annualIncome.snippet,
      "high",
    );
  }

  const spouseIncome = findAmountAfter(
    text,
    /(?:配偶者|妻|夫|パートナー).{0,12}(?:年収|収入)(?:は|が)?\s*(\d+(?:,\d+)?)\s*万/,
  );
  if (spouseIncome) {
    extraction.customer.spouseAnnualIncome = spouseIncome.amount;
    pushField(
      extraction,
      "customer.spouseAnnualIncome",
      "配偶者年収",
      spouseIncome.amount,
      spouseIncome.snippet,
      "medium",
    );
  }

  const dependentsMatch = text.match(
    /(?:扶養|子ども|子供|お子さん).{0,8}(\d+)\s*人/,
  );
  if (dependentsMatch) {
    extraction.customer.dependents = Number(dependentsMatch[1]);
    pushField(
      extraction,
      "customer.dependents",
      "扶養人数",
      extraction.customer.dependents,
      dependentsMatch[0],
      "medium",
    );
  }

  const employerMatch = text.match(
    /(?:勤務先|会社|お勤め先)(?:は|が)?\s*([^。、,\n]{2,30})/,
  );
  if (employerMatch) {
    extraction.customer.employer = employerMatch[1].trim();
    pushField(
      extraction,
      "customer.employer",
      "勤務先",
      extraction.customer.employer,
      employerMatch[0],
      "medium",
    );
  }

  if (/会社員|公務員|自営業|フリーランス|経営者/.test(text)) {
    const occupationMatch = text.match(/(会社員|公務員|自営業|フリーランス|経営者)/);
    if (occupationMatch) {
      extraction.customer.occupation = occupationMatch[1];
      pushField(
        extraction,
        "customer.occupation",
        "職業",
        extraction.customer.occupation,
        occupationMatch[0],
        "medium",
      );
    }
  }

  const addressMatch = text.match(
    /(?:住所|お住まい|住んで|在住)(?:は|が)?\s*((?:東京都|北海道|(?:京都|大阪)府|.{2,3}県).{2,40})/,
  );
  if (addressMatch) {
    extraction.customer.address = addressMatch[1].trim();
    pushField(
      extraction,
      "customer.address",
      "住所",
      extraction.customer.address,
      addressMatch[0],
      "medium",
    );
  }

  const monthlyIncome = findAmountAfter(
    text,
    /(?:月収|手取り|月額(?:収入)?)(?:は|が|で)?\s*(\d+(?:,\d+)?)\s*万/,
  );
  if (monthlyIncome) {
    extraction.cashFlow.push({
      kind: "income",
      category: "給与",
      label: "本人月収（文字起こしより）",
      amountMonthly: monthlyIncome.amount,
      classification: "confidential",
      note: monthlyIncome.snippet,
    });
    pushField(
      extraction,
      "cashflow.income",
      "月次収入",
      monthlyIncome.amount,
      monthlyIncome.snippet,
      "high",
    );
  }

  const monthlyExpense = findAmountAfter(
    text,
    /(?:毎月|月々|月額).{0,8}(?:支出|かか|払).{0,8}(\d+(?:,\d+)?)\s*万/,
  );
  if (monthlyExpense) {
    extraction.cashFlow.push({
      kind: "expense",
      category: "生活",
      label: "月次支出（文字起こしより）",
      amountMonthly: monthlyExpense.amount,
      classification: "confidential",
      note: monthlyExpense.snippet,
    });
    pushField(
      extraction,
      "cashflow.expense",
      "月次支出",
      monthlyExpense.amount,
      monthlyExpense.snippet,
      "medium",
    );
  }

  const loanBalance = findAmountAfter(
    text,
    /(?:住宅ローン|ローン).{0,12}(?:残高|残り)(?:は|が)?\s*(\d+(?:,\d+)?)\s*万/,
  );
  const loanPayment = findAmountAfter(
    text,
    /(?:住宅ローン|ローン).{0,12}(?:月々|毎月|月額)(?:返済|支払)(?:は|が)?\s*(\d+(?:,\d+)?)\s*万/,
  );
  if (loanBalance || loanPayment) {
    extraction.liabilities.push({
      type: "mortgage",
      label: "住宅ローン",
      institution: "",
      balance: loanBalance?.amount ?? 0,
      monthlyPayment: loanPayment?.amount ?? 0,
      note: [loanBalance?.snippet, loanPayment?.snippet].filter(Boolean).join(" / "),
    });
    pushField(
      extraction,
      "liability.mortgage",
      "住宅ローン",
      extraction.liabilities[0],
      [loanBalance?.snippet, loanPayment?.snippet].filter(Boolean).join(" / "),
      loanBalance && loanPayment ? "high" : "medium",
    );
  }

  const deposit = findAmountAfter(
    text,
    /(?:預金|普通預金|貯金).{0,12}(\d+(?:,\d+)?)\s*万/,
  );
  if (deposit) {
    extraction.assets.push({
      type: "deposit",
      label: "預金",
      institution: "",
      amount: deposit.amount,
      note: deposit.snippet,
    });
    pushField(
      extraction,
      "asset.deposit",
      "預金",
      deposit.amount,
      deposit.snippet,
      "medium",
    );
  }

  const securities = findAmountAfter(
    text,
    /(?:投資信託|株式|証券).{0,12}(\d+(?:,\d+)?)\s*万/,
  );
  if (securities) {
    extraction.assets.push({
      type: "securities",
      label: "証券・投資",
      institution: "",
      amount: securities.amount,
      note: securities.snippet,
    });
    pushField(
      extraction,
      "asset.securities",
      "証券・投資",
      securities.amount,
      securities.snippet,
      "medium",
    );
  }

  if (/終身保険|医療保険|がん保険|生命保険/.test(text)) {
    const productMatch = text.match(/(終身保険|医療保険|がん保険|生命保険)/);
    const coverage = findAmountAfter(text, /保障額.{0,10}(\d+(?:,\d+)?)\s*万/);
    const premium = findAmountAfter(text, /保険料.{0,10}(\d+(?:,\d+)?)\s*万/);
    const companyMatch = text.match(
      /((?:日本|東京|明治安田|第一|住友|あいおい|かんぽ|○○)[^\s、。]{0,8}(?:生命|損保|海上))/,
    );

    const policy: Omit<InsurancePolicy, "id"> = {
      company: companyMatch?.[1] ?? "",
      productName: productMatch?.[1] ?? "保険",
      policyNumber: "",
      type: productMatch?.[1]?.includes("医療")
        ? "medical"
        : productMatch?.[1]?.includes("がん")
          ? "cancer"
          : "life",
      insuredAmount: coverage?.amount ?? 0,
      annualPremium: premium?.amount ?? 0,
      beneficiaries: /配偶者/.test(text) ? "配偶者" : "",
      note: [productMatch?.[0], coverage?.snippet, premium?.snippet]
        .filter(Boolean)
        .join(" / "),
    };

    extraction.insurancePolicies.push(policy);
    pushField(
      extraction,
      "insurance.policy",
      "保険契約",
      policy,
      policy.note ?? productMatch?.[0] ?? "",
      coverage || premium ? "medium" : "low",
    );
  }

  if (/高血圧|糖尿病|告知|既往|入院歴/.test(text)) {
    const alertMatch = text.match(/(.{0,20}(?:高血圧|糖尿病|告知|既往|入院歴).{0,30})/);
    extraction.internalMemoAppend = alertMatch?.[1]?.trim() ?? "健康・告知に関する発言あり";
    pushField(
      extraction,
      "memo.internal",
      "内部メモ",
      extraction.internalMemoAppend,
      extraction.internalMemoAppend,
      "low",
    );
  }

  extraction.fpNotesAppend = `【文字起こしより自動記録】\n${text.slice(0, 500)}${text.length > 500 ? "…" : ""}`;

  return extraction;
}

export function mergeExtractionIntoCustomer(
  current: Customer,
  patch: Partial<Customer>,
): Customer {
  const merged = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    const k = key as keyof Customer;
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "number" && value === 0 && (current[k] as number) > 0) {
      continue;
    }
    if (typeof value === "string" && !value && current[k]) continue;
    (merged as Record<string, unknown>)[k] = value;
  }
  return merged;
}

export function mergeExtractionIntoSession(
  session: {
    cashFlow: CashFlowLine[];
    assets: AssetItem[];
    liabilities: LiabilityItem[];
    insurancePolicies: InsurancePolicy[];
    fpNotes: string;
    internalMemo: string;
  },
  extraction: IntakeExtraction,
): {
  cashFlow: CashFlowLine[];
  assets: AssetItem[];
  liabilities: LiabilityItem[];
  insurancePolicies: InsurancePolicy[];
  fpNotes: string;
  internalMemo: string;
} {
  return {
    cashFlow: [
      ...session.cashFlow,
      ...extraction.cashFlow.map((line) => ({
        ...line,
        id: createId("cf"),
      })),
    ],
    assets: [
      ...session.assets,
      ...extraction.assets.map((item) => ({
        ...item,
        id: createId("ast"),
      })),
    ],
    liabilities: [
      ...session.liabilities,
      ...extraction.liabilities.map((item) => ({
        ...item,
        id: createId("lia"),
      })),
    ],
    insurancePolicies: [
      ...session.insurancePolicies,
      ...extraction.insurancePolicies.map((item) => ({
        ...item,
        id: createId("ins"),
      })),
    ],
    fpNotes: extraction.fpNotesAppend
      ? `${session.fpNotes}\n\n${extraction.fpNotesAppend}`.trim()
      : session.fpNotes,
    internalMemo: extraction.internalMemoAppend
      ? `${session.internalMemo}\n${extraction.internalMemoAppend}`.trim()
      : session.internalMemo,
  };
}
