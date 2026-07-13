/** 顧客画面への公開レベル（FP専用画面ではすべて表示） */
export type DataClassification = "public" | "summary" | "confidential";

export interface FpUser {
  id: string;
  email: string;
  name: string;
  password: string;
}

export interface Customer {
  id: string;
  fpId: string;
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  birthDate: string;
  gender: "male" | "female" | "other" | "unspecified";
  postalCode: string;
  address: string;
  phone: string;
  email: string;
  occupation: string;
  employer: string;
  annualIncome: number;
  spouseAnnualIncome: number;
  dependents: number;
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus = "scheduled" | "in_progress" | "completed";

export interface CashFlowLine {
  id: string;
  kind: "income" | "expense";
  category: string;
  label: string;
  amountMonthly: number;
  classification: DataClassification;
  note?: string;
}

export interface AssetItem {
  id: string;
  type: "deposit" | "securities" | "insurance" | "real_estate" | "other";
  label: string;
  institution: string;
  amount: number;
  note?: string;
}

export interface LiabilityItem {
  id: string;
  type: "mortgage" | "loan" | "other";
  label: string;
  institution: string;
  balance: number;
  monthlyPayment: number;
  note?: string;
}

export interface InsurancePolicy {
  id: string;
  company: string;
  productName: string;
  policyNumber: string;
  type: "life" | "medical" | "cancer" | "disability" | "property" | "other";
  insuredAmount: number;
  annualPremium: number;
  beneficiaries: string;
  note?: string;
}

export interface ConsultationSession {
  id: string;
  customerId: string;
  fpId: string;
  status: SessionStatus;
  title: string;
  startedAt: string;
  endedAt?: string;
  cashFlow: CashFlowLine[];
  assets: AssetItem[];
  liabilities: LiabilityItem[];
  insurancePolicies: InsurancePolicy[];
  fpNotes: string;
  internalMemo: string;
  updatedAt: string;
}

export interface Database {
  fpUsers: FpUser[];
  customers: Customer[];
  sessions: ConsultationSession[];
}

export type SessionModule =
  | "profile"
  | "cashflow"
  | "assets"
  | "insurance"
  | "notes";

/** 面談の音声・テキスト取り込み元 */
export type IntakeSourceKind = "speech" | "text" | "audio_file" | "video_file";
