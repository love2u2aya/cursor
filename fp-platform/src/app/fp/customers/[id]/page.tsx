import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FpShell } from "@/components/fp/FpShell";
import { ConfidentialBadge } from "@/components/fp/ConfidentialBadge";
import { getCurrentFpUser } from "@/lib/auth";
import { customerDisplayName, formatYen } from "@/lib/format";
import { getDb } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export default async function FpCustomerDetailPage({ params }: Params) {
  const fp = await getCurrentFpUser();
  if (!fp) redirect("/fp/login");

  const { id } = await params;
  const db = await getDb();
  const customer = db.customers.find(
    (item) => item.id === id && item.fpId === fp.id,
  );

  if (!customer) notFound();

  const sessions = db.sessions
    .filter((session) => session.customerId === customer.id)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  return (
    <FpShell fpName={fp.name}>
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-2xl font-bold text-slate-900">
          {customerDisplayName(customer)}
        </h2>
        <ConfidentialBadge />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900">基本情報</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="生年月日" value={customer.birthDate} />
            <Row label="電話" value={customer.phone} />
            <Row label="メール" value={customer.email} />
            <Row label="住所" value={customer.address} />
            <Row label="職業" value={`${customer.occupation} / ${customer.employer}`} />
            <Row label="本人年収" value={formatYen(customer.annualIncome)} />
            <Row label="配偶者年収" value={formatYen(customer.spouseAnnualIncome)} />
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">面談履歴</h3>
            <form action={`/fp/customers/${customer.id}/start-session`} method="post">
              <button
                type="submit"
                className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
              >
                面談を開始
              </button>
            </form>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/fp/sessions/${session.id}`}
                  className="text-blue-700 hover:underline"
                >
                  {session.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </FpShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-800">{value}</dd>
    </div>
  );
}
