import { NextResponse } from "next/server";
import { requireFpUser } from "@/lib/auth";
import { createId } from "@/lib/id";
import { getDb, saveDb } from "@/lib/store";
import type { ConsultationSession } from "@/types/fp";

export async function GET() {
  try {
    const fp = await requireFpUser();
    const db = await getDb();
    const sessions = db.sessions
      .filter((session) => session.fpId === fp.id)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const fp = await requireFpUser();
    const body = (await request.json()) as {
      customerId?: string;
      title?: string;
    };

    if (!body.customerId) {
      return NextResponse.json(
        { error: "顧客IDが必要です。" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const customer = db.customers.find(
      (item) => item.id === body.customerId && item.fpId === fp.id,
    );

    if (!customer) {
      return NextResponse.json({ error: "顧客が見つかりません。" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const session: ConsultationSession = {
      id: createId("ses"),
      customerId: customer.id,
      fpId: fp.id,
      status: "in_progress",
      title: body.title ?? "面談セッション",
      startedAt: now,
      cashFlow: [],
      assets: [],
      liabilities: [],
      insurancePolicies: [],
      fpNotes: "",
      internalMemo: "",
      updatedAt: now,
    };

    db.sessions.push(session);
    await saveDb(db);

    return NextResponse.json(session, { status: 201 });
  } catch {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
}
