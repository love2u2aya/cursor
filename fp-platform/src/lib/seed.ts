import { createId } from "@/lib/id";
import { getDb, saveDb } from "@/lib/store";

export async function ensureSampleData(fpId: string): Promise<void> {
  const db = await getDb();
  if (db.customers.length > 0) return;

  const customerId = createId("cus");
  const sessionId = createId("ses");
  const now = new Date().toISOString();

  db.customers.push({
    id: customerId,
    fpId,
    lastName: "佐藤",
    firstName: "花子",
    lastNameKana: "サトウ",
    firstNameKana: "ハナコ",
    birthDate: "1985-04-12",
    gender: "female",
    postalCode: "150-0001",
    address: "東京都渋谷区神宮前1-1-1",
    phone: "090-1234-5678",
    email: "hanako.sato@example.com",
    occupation: "会社員",
    employer: "株式会社サンプル",
    annualIncome: 6_500_000,
    spouseAnnualIncome: 4_200_000,
    dependents: 2,
    createdAt: now,
    updatedAt: now,
  });

  db.sessions.push({
    id: sessionId,
    customerId,
    fpId,
    status: "scheduled",
    title: "初回ライフプランニング面談",
    startedAt: now,
    cashFlow: [
      {
        id: createId("cf"),
        kind: "income",
        category: "給与",
        label: "本人給与（手取り相当）",
        amountMonthly: 420_000,
        classification: "confidential",
      },
      {
        id: createId("cf"),
        kind: "income",
        category: "給与",
        label: "配偶者給与",
        amountMonthly: 280_000,
        classification: "confidential",
      },
      {
        id: createId("cf"),
        kind: "expense",
        category: "住居",
        label: "住宅ローン返済",
        amountMonthly: 95_000,
        classification: "confidential",
      },
      {
        id: createId("cf"),
        kind: "expense",
        category: "生活",
        label: "食費・光熱費",
        amountMonthly: 120_000,
        classification: "confidential",
      },
    ],
    assets: [
      {
        id: createId("ast"),
        type: "deposit",
        label: "普通預金",
        institution: "みずほ銀行",
        amount: 2_500_000,
      },
      {
        id: createId("ast"),
        type: "securities",
        label: "投資信託",
        institution: "SBI証券",
        amount: 1_800_000,
      },
    ],
    liabilities: [
      {
        id: createId("lia"),
        type: "mortgage",
        label: "住宅ローン",
        institution: "三菱UFJ銀行",
        balance: 28_000_000,
        monthlyPayment: 95_000,
      },
    ],
    insurancePolicies: [
      {
        id: createId("ins"),
        company: "○○生命",
        productName: "終身保険",
        policyNumber: "L-12345678",
        type: "life",
        insuredAmount: 10_000_000,
        annualPremium: 180_000,
        beneficiaries: "配偶者",
      },
    ],
    fpNotes: "教育費と住宅ローンのバランスが課題。次回は老後資金の試算を実施予定。",
    internalMemo: "告知歴あり（高血圧治療中）。保障見直し時に再確認。",
    updatedAt: now,
  });

  await saveDb(db);
}
