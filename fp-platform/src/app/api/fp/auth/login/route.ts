import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { ensureSampleData } from "@/lib/seed";
import { getDb } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const db = await getDb();

  const user = db.fpUsers.find(
    (candidate) =>
      candidate.email === body.email && candidate.password === body.password,
  );

  if (!user) {
    return NextResponse.json(
      { error: "メールアドレスまたはパスワードが正しくありません。" },
      { status: 401 },
    );
  }

  await ensureSampleData(user.id);

  const response = NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  response.cookies.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
