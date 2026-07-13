import { NextResponse } from "next/server";
import { requireFpUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import { getDb, saveDb } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const fp = await requireFpUser();
    const { id: customerId } = await params;
    const db = await getDb();

    const customer = db.customers.find(
      (item) => item.id === customerId && item.fpId === fp.id,
    );

    if (!customer) {
      return NextResponse.json({ error: "顧客が見つかりません。" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const sessionId = createId("ses");

    db.sessions.push({
      id: sessionId,
      customerId,
      fpId: fp.id,
      status: "in_progress",
      title: "面談セッション",
      startedAt: now,
      cashFlow: [],
      assets: [],
      liabilities: [],
      insurancePolicies: [],
      fpNotes: "",
      internalMemo: "",
      updatedAt: now,
    });

    await saveDb(db);

    return NextResponse.redirect(new URL(`/fp/sessions/${sessionId}`, request.url));
  } catch {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
}
