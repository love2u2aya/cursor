"use client";

import { useState } from "react";
import type {
  AssetItem,
  CashFlowLine,
  ConsultationSession,
  Customer,
  InsurancePolicy,
  LiabilityItem,
  SessionModule,
} from "@/types/fp";
import { ConfidentialBadge } from "@/components/fp/ConfidentialBadge";
import { StatusBadge } from "@/components/fp/StatusBadge";
import { customerDisplayName, formatYen } from "@/lib/format";
import { createId } from "@/lib/id";

const modules: { id: SessionModule; label: string }[] = [
  { id: "profile", label: "顧客プロファイル" },
  { id: "cashflow", label: "キャッシュフロー" },
  { id: "assets", label: "資産・負債" },
  { id: "insurance", label: "保障・保険" },
  { id: "notes", label: "FPメモ" },
];

export function SessionWorkspace({
  initialSession,
  initialCustomer,
}: {
  initialSession: ConsultationSession;
  initialCustomer: Customer;
}) {
  const [session, setSession] = useState(initialSession);
  const [customer, setCustomer] = useState(initialCustomer);
  const [activeModule, setActiveModule] = useState<SessionModule>("profile");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveSession(patch: Partial<ConsultationSession>) {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/fp/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await response.json()) as ConsultationSession;
    setSession(data);
    setSaving(false);
    setMessage("保存しました");
  }

  async function saveCustomer(patch: Partial<Customer>) {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/fp/customers/${customer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await response.json()) as Customer;
    setCustomer(data);
    setSaving(false);
    setMessage("顧客情報を保存しました");
  }

  const monthlyIncome = session.cashFlow
    .filter((line) => line.kind === "income")
    .reduce((sum, line) => sum + line.amountMonthly, 0);
  const monthlyExpense = session.cashFlow
    .filter((line) => line.kind === "expense")
    .reduce((sum, line) => sum + line.amountMonthly, 0);
  const totalAssets = session.assets.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilities = session.liabilities.reduce(
    (sum, item) => sum + item.balance,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">{session.title}</h2>
              <StatusBadge status={session.status} />
              <ConfidentialBadge />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              顧客: {customerDisplayName(customer)} ／ この画面は顧客には表示されません
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => saveSession({ status: "in_progress" })}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              面談中にする
            </button>
            <button
              type="button"
              onClick={() => saveSession({ status: "completed" })}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              面談完了
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <SummaryCard label="月次収入" value={formatYen(monthlyIncome)} />
          <SummaryCard label="月次支出" value={formatYen(monthlyExpense)} />
          <SummaryCard label="総資産" value={formatYen(totalAssets)} />
          <SummaryCard label="総負債" value={formatYen(totalLiabilities)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {modules.map((module) => (
          <button
            key={module.id}
            type="button"
            onClick={() => setActiveModule(module.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeModule === module.id
                ? "bg-blue-700 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {module.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeModule === "profile" ? (
          <ProfileModule customer={customer} onSave={saveCustomer} />
        ) : null}
        {activeModule === "cashflow" ? (
          <CashFlowModule
            lines={session.cashFlow}
            onChange={(cashFlow) => saveSession({ cashFlow })}
          />
        ) : null}
        {activeModule === "assets" ? (
          <AssetsModule
            assets={session.assets}
            liabilities={session.liabilities}
            onChange={(patch) => saveSession(patch)}
          />
        ) : null}
        {activeModule === "insurance" ? (
          <InsuranceModule
            policies={session.insurancePolicies}
            onChange={(insurancePolicies) => saveSession({ insurancePolicies })}
          />
        ) : null}
        {activeModule === "notes" ? (
          <NotesModule
            fpNotes={session.fpNotes}
            internalMemo={session.internalMemo}
            onSave={(patch) => saveSession(patch)}
          />
        ) : null}
      </div>

      <p className="text-sm text-slate-500">
        {saving ? "保存中..." : message}
      </p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ProfileModule({
  customer,
  onSave,
}: {
  customer: Customer;
  onSave: (patch: Partial<Customer>) => Promise<void>;
}) {
  const [form, setForm] = useState(customer);

  return (
    <div className="space-y-4">
      <SectionTitle
        title="顧客プロファイル"
        description="氏名・住所・連絡先・年収など、顧客に見せない機微情報"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="姓" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
        <Field label="名" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
        <Field label="セイ" value={form.lastNameKana} onChange={(v) => setForm({ ...form, lastNameKana: v })} />
        <Field label="メイ" value={form.firstNameKana} onChange={(v) => setForm({ ...form, firstNameKana: v })} />
        <Field label="生年月日" value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} type="date" />
        <Field label="電話番号" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="メール" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="郵便番号" value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} />
        <Field label="住所" value={form.address} onChange={(v) => setForm({ ...form, address: v })} className="md:col-span-2" />
        <Field label="職業" value={form.occupation} onChange={(v) => setForm({ ...form, occupation: v })} />
        <Field label="勤務先" value={form.employer} onChange={(v) => setForm({ ...form, employer: v })} />
        <NumberField label="本人年収" value={form.annualIncome} onChange={(v) => setForm({ ...form, annualIncome: v })} />
        <NumberField label="配偶者年収" value={form.spouseAnnualIncome} onChange={(v) => setForm({ ...form, spouseAnnualIncome: v })} />
        <NumberField label="扶養人数" value={form.dependents} onChange={(v) => setForm({ ...form, dependents: v })} />
      </div>
      <SaveButton onClick={() => onSave(form)} />
    </div>
  );
}

function CashFlowModule({
  lines,
  onChange,
}: {
  lines: CashFlowLine[];
  onChange: (lines: CashFlowLine[]) => Promise<void>;
}) {
  const [items, setItems] = useState(lines);

  function addLine(kind: "income" | "expense") {
    setItems([
      ...items,
      {
        id: createId("cf"),
        kind,
        category: kind === "income" ? "給与" : "生活",
        label: "",
        amountMonthly: 0,
        classification: "confidential",
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="キャッシュフロー明細"
        description="月次の収入・支出の詳細。顧客画面には抽象化サマリーのみ将来投影可能"
      />
      <div className="space-y-3">
        {items.map((line, index) => (
          <div key={line.id} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-5">
            <select
              value={line.kind}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...line, kind: event.target.value as "income" | "expense" };
                setItems(next);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="income">収入</option>
              <option value="expense">支出</option>
            </select>
            <input
              value={line.category}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...line, category: event.target.value };
                setItems(next);
              }}
              placeholder="科目"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={line.label}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...line, label: event.target.value };
                setItems(next);
              }}
              placeholder="項目名"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            />
            <input
              type="number"
              value={line.amountMonthly}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...line, amountMonthly: Number(event.target.value) };
                setItems(next);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => addLine("income")} className="rounded-lg border px-3 py-1.5 text-sm">収入追加</button>
        <button type="button" onClick={() => addLine("expense")} className="rounded-lg border px-3 py-1.5 text-sm">支出追加</button>
        <SaveButton onClick={() => onChange(items)} />
      </div>
    </div>
  );
}

function AssetsModule({
  assets,
  liabilities,
  onChange,
}: {
  assets: AssetItem[];
  liabilities: LiabilityItem[];
  onChange: (patch: {
    assets?: AssetItem[];
    liabilities?: LiabilityItem[];
  }) => Promise<void>;
}) {
  const [assetItems, setAssetItems] = useState(assets);
  const [liabilityItems, setLiabilityItems] = useState(liabilities);

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle title="資産明細" description="口座・証券・不動産などの詳細残高" />
        <div className="space-y-3">
          {assetItems.map((item, index) => (
            <div key={item.id} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-4">
              <input value={item.label} onChange={(e) => { const n = [...assetItems]; n[index] = { ...item, label: e.target.value }; setAssetItems(n); }} placeholder="名称" className="rounded-lg border px-3 py-2 text-sm" />
              <input value={item.institution} onChange={(e) => { const n = [...assetItems]; n[index] = { ...item, institution: e.target.value }; setAssetItems(n); }} placeholder="金融機関" className="rounded-lg border px-3 py-2 text-sm" />
              <input type="number" value={item.amount} onChange={(e) => { const n = [...assetItems]; n[index] = { ...item, amount: Number(e.target.value) }; setAssetItems(n); }} className="rounded-lg border px-3 py-2 text-sm" />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setAssetItems([...assetItems, { id: createId("ast"), type: "deposit", label: "", institution: "", amount: 0 }])} className="mt-3 rounded-lg border px-3 py-1.5 text-sm">資産追加</button>
      </div>

      <div>
        <SectionTitle title="負債明細" description="ローン残高と月次返済額" />
        <div className="space-y-3">
          {liabilityItems.map((item, index) => (
            <div key={item.id} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-5">
              <input value={item.label} onChange={(e) => { const n = [...liabilityItems]; n[index] = { ...item, label: e.target.value }; setLiabilityItems(n); }} placeholder="名称" className="rounded-lg border px-3 py-2 text-sm md:col-span-2" />
              <input value={item.institution} onChange={(e) => { const n = [...liabilityItems]; n[index] = { ...item, institution: e.target.value }; setLiabilityItems(n); }} placeholder="金融機関" className="rounded-lg border px-3 py-2 text-sm" />
              <input type="number" value={item.balance} onChange={(e) => { const n = [...liabilityItems]; n[index] = { ...item, balance: Number(e.target.value) }; setLiabilityItems(n); }} placeholder="残高" className="rounded-lg border px-3 py-2 text-sm" />
              <input type="number" value={item.monthlyPayment} onChange={(e) => { const n = [...liabilityItems]; n[index] = { ...item, monthlyPayment: Number(e.target.value) }; setLiabilityItems(n); }} placeholder="月返済" className="rounded-lg border px-3 py-2 text-sm" />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setLiabilityItems([...liabilityItems, { id: createId("lia"), type: "loan", label: "", institution: "", balance: 0, monthlyPayment: 0 }])} className="mt-3 rounded-lg border px-3 py-1.5 text-sm">負債追加</button>
      </div>

      <SaveButton onClick={() => onChange({ assets: assetItems, liabilities: liabilityItems })} />
    </div>
  );
}

function InsuranceModule({
  policies,
  onChange,
}: {
  policies: InsurancePolicy[];
  onChange: (policies: InsurancePolicy[]) => Promise<void>;
}) {
  const [items, setItems] = useState(policies);

  return (
    <div className="space-y-4">
      <SectionTitle
        title="保障・保険証券"
        description="証券番号・告知内容・保障額など、顧客画面には出さない詳細"
      />
      {items.map((policy, index) => (
        <div key={policy.id} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-3">
          <input value={policy.company} onChange={(e) => { const n = [...items]; n[index] = { ...policy, company: e.target.value }; setItems(n); }} placeholder="保険会社" className="rounded-lg border px-3 py-2 text-sm" />
          <input value={policy.productName} onChange={(e) => { const n = [...items]; n[index] = { ...policy, productName: e.target.value }; setItems(n); }} placeholder="商品名" className="rounded-lg border px-3 py-2 text-sm" />
          <input value={policy.policyNumber} onChange={(e) => { const n = [...items]; n[index] = { ...policy, policyNumber: e.target.value }; setItems(n); }} placeholder="証券番号" className="rounded-lg border px-3 py-2 text-sm" />
          <input type="number" value={policy.insuredAmount} onChange={(e) => { const n = [...items]; n[index] = { ...policy, insuredAmount: Number(e.target.value) }; setItems(n); }} placeholder="保障額" className="rounded-lg border px-3 py-2 text-sm" />
          <input type="number" value={policy.annualPremium} onChange={(e) => { const n = [...items]; n[index] = { ...policy, annualPremium: Number(e.target.value) }; setItems(n); }} placeholder="年間保険料" className="rounded-lg border px-3 py-2 text-sm" />
          <input value={policy.beneficiaries} onChange={(e) => { const n = [...items]; n[index] = { ...policy, beneficiaries: e.target.value }; setItems(n); }} placeholder="受取人" className="rounded-lg border px-3 py-2 text-sm" />
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" onClick={() => setItems([...items, { id: createId("ins"), company: "", productName: "", policyNumber: "", type: "life", insuredAmount: 0, annualPremium: 0, beneficiaries: "" }])} className="rounded-lg border px-3 py-1.5 text-sm">証券追加</button>
        <SaveButton onClick={() => onChange(items)} />
      </div>
    </div>
  );
}

function NotesModule({
  fpNotes,
  internalMemo,
  onSave,
}: {
  fpNotes: string;
  internalMemo: string;
  onSave: (patch: { fpNotes?: string; internalMemo?: string }) => Promise<void>;
}) {
  const [notes, setNotes] = useState(fpNotes);
  const [memo, setMemo] = useState(internalMemo);

  return (
    <div className="space-y-4">
      <SectionTitle
        title="FPメモ"
        description="面談記録と内部メモ。顧客には一切表示しません"
      />
      <label className="block text-sm font-medium text-slate-700">
        面談記録
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={5}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        内部メモ（告知歴・注意事項など）
        <textarea
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          rows={5}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <SaveButton onClick={() => onSave({ fpNotes: notes, internalMemo: memo })} />
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

function SaveButton({ onClick }: { onClick: () => Promise<void> }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
    >
      保存
    </button>
  );
}
