import Link from "next/link";
import { redirect } from "next/navigation";
import { FpShell } from "@/components/fp/FpShell";
import { StatusBadge } from "@/components/fp/StatusBadge";
import { getCurrentFpUser } from "@/lib/auth";
import { customerDisplayName, formatDate } from "@/lib/format";
import { ensureSampleData } from "@/lib/seed";
import { getDb } from "@/lib/store";

export default async function FpDashboardPage() {
  const fp = await getCurrentFpUser();
  if (!fp) redirect("/fp/login");

  await ensureSampleData(fp.id);
  const db = await getDb();

  const customers = db.customers.filter((customer) => customer.fpId === fp.id);
  const sessions = db.sessions
    .filter((session) => session.fpId === fp.id)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5);

  return (
    <FpShell fpName={fp.name}>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">ダッシュボード</h2>
          <p className="mt-1 text-sm text-slate-600">
            顧客の機微情報と面談設計はすべてこの専用画面で管理します。
          </p>
        </div>
        <Link
          href="/fp/customers/new"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          新規顧客登録
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">担当顧客数</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {customers.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">進行中の面談</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {sessions.filter((session) => session.status === "in_progress").length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">顧客画面</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">未接続</p>
          <p className="mt-1 text-xs text-slate-500">
            完成品の投影機能は後続フェーズで実装
          </p>
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">最近の面談</h3>
          <Link href="/fp/customers" className="text-sm text-blue-700 hover:underline">
            顧客一覧へ
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">面談名</th>
                <th className="px-4 py-3 font-medium">顧客</th>
                <th className="px-4 py-3 font-medium">状態</th>
                <th className="px-4 py-3 font-medium">更新日時</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const customer = customers.find(
                  (item) => item.id === session.customerId,
                );
                return (
                  <tr key={session.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`/fp/sessions/${session.id}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {session.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {customer ? customerDisplayName(customer) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(session.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </FpShell>
  );
}
