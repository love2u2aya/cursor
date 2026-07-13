import { NextResponse } from "next/server";
import { requireFpUser } from "@/lib/auth";
import { getDb, saveDb } from "@/lib/store";
import type { ConsultationSession } from "@/types/fp";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const fp = await requireFpUser();
    const { id } = await params;
    const db = await getDb();
    const session = db.sessions.find(
      (item) => item.id === id && item.fpId === fp.id,
    );

    if (!session) {
      return NextResponse.json({ error: "面談が見つかりません。" }, { status: 404 });
    }

    const customer = db.customers.find((item) => item.id === session.customerId);
    return NextResponse.json({ session, customer });
  } catch {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const fp = await requireFpUser();
    const { id } = await params;
    const body = (await request.json()) as Partial<ConsultationSession>;
    const db = await getDb();
    const index = db.sessions.findIndex(
      (item) => item.id === id && item.fpId === fp.id,
    );

    if (index === -1) {
      return NextResponse.json({ error: "面談が見つかりません。" }, { status: 404 });
    }

    db.sessions[index] = {
      ...db.sessions[index],
      ...body,
      id: db.sessions[index].id,
      customerId: db.sessions[index].customerId,
      fpId: db.sessions[index].fpId,
      startedAt: db.sessions[index].startedAt,
      updatedAt: new Date().toISOString(),
    };

    await saveDb(db);
    return NextResponse.json(db.sessions[index]);
  } catch {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
}
