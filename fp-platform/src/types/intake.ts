import type {
  AssetItem,
  CashFlowLine,
  Customer,
  InsurancePolicy,
  LiabilityItem,
} from "@/types/fp";

export interface ExtractedField<T = unknown> {
  key: string;
  label: string;
  value: T;
  snippet: string;
  confidence: "high" | "medium" | "low";
}

export interface IntakeExtraction {
  customer: Partial<Customer>;
  cashFlow: Omit<CashFlowLine, "id">[];
  assets: Omit<AssetItem, "id">[];
  liabilities: Omit<LiabilityItem, "id">[];
  insurancePolicies: Omit<InsurancePolicy, "id">[];
  fpNotesAppend: string;
  internalMemoAppend: string;
  fields: ExtractedField[];
  transcript: string;
  method: "rules" | "llm" | "hybrid";
}

export type IntakeSource = "speech" | "text" | "audio_file" | "video_file";
