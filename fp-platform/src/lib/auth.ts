import { cookies } from "next/headers";
import type { FpUser } from "@/types/fp";
import { getDb } from "@/lib/store";

export const SESSION_COOKIE = "fp_session";

export async function getCurrentFpUser(): Promise<FpUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const db = await getDb();
  return db.fpUsers.find((user) => user.id === sessionId) ?? null;
}

export async function requireFpUser(): Promise<FpUser> {
  const user = await getCurrentFpUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
