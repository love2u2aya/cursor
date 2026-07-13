"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FpShell } from "@/components/fp/FpShell";
import { ConfidentialBadge } from "@/components/fp/ConfidentialBadge";

export function NewCustomerForm({ fpName }: { fpName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    lastNameKana: "",
    firstNameKana: "",
    birthDate: "",
    phone: "",
    email: "",
    occupation: "",
    employer: "",
    annualIncome: 0,
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    const response = await fetch("/api/fp/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const customer = (await response.json()) as { id: string };
    router.push(`/fp/customers/${customer.id}`);
    router.refresh();
  }

  return (
    <FpShell fpName={fpName}>
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-2xl font-bold text-slate-900">新規顧客登録</h2>
        <ConfidentialBadge />
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["lastName", "姓"],
            ["firstName", "名"],
            ["lastNameKana", "セイ"],
            ["firstNameKana", "メイ"],
            ["birthDate", "生年月日"],
            ["phone", "電話番号"],
            ["email", "メール"],
            ["occupation", "職業"],
            ["employer", "勤務先"],
          ].map(([key, label]) => (
            <label key={key} className="block text-sm font-medium text-slate-700">
              {label}
              <input
                type={key === "birthDate" ? "date" : "text"}
                value={form[key as keyof typeof form] as string}
                onChange={(event) =>
                  setForm({ ...form, [key]: event.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          ))}
          <label className="block text-sm font-medium text-slate-700">
            年収
            <input
              type="number"
              value={form.annualIncome}
              onChange={(event) =>
                setForm({ ...form, annualIncome: Number(event.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {loading ? "登録中..." : "登録する"}
        </button>
      </form>
    </FpShell>
  );
}
