import type { IntakeExtraction, ExtractedField } from "@/types/intake";
import type {
  AssetItem,
  CashFlowLine,
  Customer,
  InsurancePolicy,
  LiabilityItem,
} from "@/types/fp";

type AgentPayload = {
  customer?: Partial<Customer>;
  cashFlow?: Omit<CashFlowLine, "id" | "classification">[];
  assets?: Omit<AssetItem, "id">[];
  liabilities?: Omit<LiabilityItem, "id">[];
  insurancePolicies?: Omit<InsurancePolicy, "id">[];
  fpNotesAppend?: string;
  internalMemoAppend?: string;
};

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : trimmed;
}

function buildFields(payload: AgentPayload): ExtractedField[] {
  const fields: ExtractedField[] = [];

  if (payload.customer) {
    const labels: Record<string, string> = {
      birthDate: "生年月日",
      annualIncome: "本人年収",
      spouseAnnualIncome: "配偶者年収",
      dependents: "扶養人数",
      phone: "電話番号",
      email: "メール",
      postalCode: "郵便番号",
      address: "住所",
      occupation: "職業",
      employer: "勤務先",
    };

    for (const [key, label] of Object.entries(labels)) {
      const value = payload.customer[key as keyof Customer];
      if (value !== undefined && value !== "" && value !== 0) {
        fields.push({
          key: `customer.${key}`,
          label,
          value,
          snippet: "Cursor解析",
          confidence: "high",
        });
      }
    }
  }

  if (payload.cashFlow?.length) {
    payload.cashFlow.forEach((line, index) => {
      fields.push({
        key: `cashflow.${index}`,
        label: line.kind === "income" ? `月次収入: ${line.label}` : `月次支出: ${line.label}`,
        value: line.amountMonthly,
        snippet: line.label,
        confidence: "high",
      });
    });
  }

  if (payload.assets?.length) {
    fields.push({
      key: "assets.all",
      label: `資産（${payload.assets.length}件）`,
      value: payload.assets,
      snippet: payload.assets.map((a) => a.label).join(", "),
      confidence: "high",
    });
  }

  if (payload.liabilities?.length) {
    fields.push({
      key: "liabilities.all",
      label: `負債（${payload.liabilities.length}件）`,
      value: payload.liabilities,
      snippet: payload.liabilities.map((l) => l.label).join(", "),
      confidence: "high",
    });
  }

  if (payload.insurancePolicies?.length) {
    fields.push({
      key: "insurance.all",
      label: `保険（${payload.insurancePolicies.length}件）`,
      value: payload.insurancePolicies,
      snippet: payload.insurancePolicies.map((p) => p.productName).join(", "),
      confidence: "high",
    });
  }

  if (payload.internalMemoAppend) {
    fields.push({
      key: "memo.internal",
      label: "内部メモ",
      value: payload.internalMemoAppend,
      snippet: payload.internalMemoAppend.slice(0, 60),
      confidence: "high",
    });
  }

  return fields;
}

/** Cursor エージェントの返答 JSON を IntakeExtraction に変換 */
export function parseAgentExtraction(
  raw: string,
  transcript: string,
): IntakeExtraction {
  const payload = JSON.parse(stripCodeFence(raw)) as AgentPayload;

  const cashFlow: Omit<CashFlowLine, "id">[] = (payload.cashFlow ?? []).map(
    (line) => ({
      ...line,
      classification: "confidential" as const,
    }),
  );

  const extraction: IntakeExtraction = {
    customer: payload.customer ?? {},
    cashFlow,
    assets: payload.assets ?? [],
    liabilities: payload.liabilities ?? [],
    insurancePolicies: payload.insurancePolicies ?? [],
    fpNotesAppend: payload.fpNotesAppend ?? "",
    internalMemoAppend: payload.internalMemoAppend ?? "",
    fields: [],
    transcript,
    method: "cursor",
  };

  extraction.fields = buildFields(payload);
  return extraction;
}
