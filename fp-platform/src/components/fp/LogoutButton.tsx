"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/fp/auth/logout", { method: "POST" });
    router.push("/fp/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="mt-2 text-xs text-blue-200 hover:text-white"
    >
      ログアウト
    </button>
  );
}
