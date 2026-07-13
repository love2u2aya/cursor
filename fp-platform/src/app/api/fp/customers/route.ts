import { NextResponse } from "next/server";
import { requireFpUser } from "@/lib/auth";
import { customerDisplayName } from "@/lib/format";
import { createId } from "@/lib/id";
import { getDb, saveDb } from "@/lib/store";
import type { Customer } from "@/types/fp";

export async function GET() {
  try {
    const fp = await requireFpUser();
    const db = await getDb();
    const customers = db.customers
      .filter((customer) => customer.fpId === fp.id)
      .map((customer) => ({
        ...customer,
        displayName: customerDisplayName(customer),
      }));

    return NextResponse.json(customers);
  } catch {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const fp = await requireFpUser();
    const body = (await request.json()) as Partial<Customer>;
    const now = new Date().toISOString();

    const customer: Customer = {
      id: createId("cus"),
      fpId: fp.id,
      lastName: body.lastName ?? "",
      firstName: body.firstName ?? "",
      lastNameKana: body.lastNameKana ?? "",
      firstNameKana: body.firstNameKana ?? "",
      birthDate: body.birthDate ?? "",
      gender: body.gender ?? "unspecified",
      postalCode: body.postalCode ?? "",
      address: body.address ?? "",
      phone: body.phone ?? "",
      email: body.email ?? "",
      occupation: body.occupation ?? "",
      employer: body.employer ?? "",
      annualIncome: Number(body.annualIncome ?? 0),
      spouseAnnualIncome: Number(body.spouseAnnualIncome ?? 0),
      dependents: Number(body.dependents ?? 0),
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    db.customers.push(customer);
    await saveDb(db);

    return NextResponse.json(customer, { status: 201 });
  } catch {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
}
