import { notFound, redirect } from "next/navigation";
import { FpShell } from "@/components/fp/FpShell";
import { SessionWorkspace } from "@/components/fp/SessionWorkspace";
import { getCurrentFpUser } from "@/lib/auth";
import { getDb } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export default async function FpSessionPage({ params }: Params) {
  const fp = await getCurrentFpUser();
  if (!fp) redirect("/fp/login");

  const { id } = await params;
  const db = await getDb();
  const session = db.sessions.find(
    (item) => item.id === id && item.fpId === fp.id,
  );

  if (!session) notFound();

  const customer = db.customers.find((item) => item.id === session.customerId);
  if (!customer) notFound();

  return (
    <FpShell fpName={fp.name}>
      <SessionWorkspace initialSession={session} initialCustomer={customer} />
    </FpShell>
  );
}
