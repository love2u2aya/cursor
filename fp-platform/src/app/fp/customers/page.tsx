import Link from "next/link";
import { redirect } from "next/navigation";
import { FpShell } from "@/components/fp/FpShell";
import { getCurrentFpUser } from "@/lib/auth";
import { customerDisplayName, formatYen } from "@/lib/format";
import { getDb } from "@/lib/store";

export default async function FpCustomersPage() {
  const fp = await getCurrentFpUser();
  if (!fp) redirect("/fp/login");

  const db = await getDb();
  const customers = db.customers.filter((customer) => customer.fpId === fp.id);

  return (
    <FpShell fpName={fp.name}>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">顧客一覧</h2>
          <p className="mt-1 text-sm text-slate-600">
            個人情報・収入・連絡先など、顧客非公開データの一覧です。
          </p>
        </div>
        <Link
          href="/fp/customers/new"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          新規顧客登録
        </Link>
      </div>

      <div className="grid gap-4">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {customerDisplayName(customer)}
                </h3>
                <p className="text-sm text-slate-500">
                  {customer.lastNameKana} {customer.firstNameKana}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {customer.occupation} / {customer.employer}
                </p>
              </div>
              <div className="text-right text-sm text-slate-600">
                <p>年収 {formatYen(customer.annualIncome)}</p>
                <p className="mt-1">{customer.phone}</p>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Link
                href={`/fp/customers/${customer.id}`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                プロファイル編集
              </Link>
              <StartSessionLink customerId={customer.id} />
            </div>
          </div>
        ))}
      </div>
    </FpShell>
  );
}

function StartSessionLink({ customerId }: { customerId: string }) {
  return (
    <form action={`/fp/customers/${customerId}/start-session`} method="post">
      <button
        type="submit"
        className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
      >
        面談を開始
      </button>
    </form>
  );
}
