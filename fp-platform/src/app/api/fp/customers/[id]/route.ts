import { NextResponse } from "next/server";
import { requireFpUser } from "@/lib/auth";
import { getDb, saveDb } from "@/lib/store";
import type { Customer } from "@/types/fp";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const fp = await requireFpUser();
    const { id } = await params;
    const db = await getDb();
    const customer = db.customers.find(
      (item) => item.id === id && item.fpId === fp.id,
    );

    if (!customer) {
      return NextResponse.json({ error: "顧客が見つかりません。" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const fp = await requireFpUser();
    const { id } = await params;
    const body = (await request.json()) as Partial<Customer>;
    const db = await getDb();
    const index = db.customers.findIndex(
      (item) => item.id === id && item.fpId === fp.id,
    );

    if (index === -1) {
      return NextResponse.json({ error: "顧客が見つかりません。" }, { status: 404 });
    }

    db.customers[index] = {
      ...db.customers[index],
      ...body,
      id: db.customers[index].id,
      fpId: db.customers[index].fpId,
      createdAt: db.customers[index].createdAt,
      updatedAt: new Date().toISOString(),
    };

    await saveDb(db);
    return NextResponse.json(db.customers[index]);
  } catch {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
}
