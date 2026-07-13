import Link from "next/link";
import { ConfidentialBadge } from "@/components/fp/ConfidentialBadge";
import { LogoutButton } from "@/components/fp/LogoutButton";

const navItems = [
  { href: "/fp/dashboard", label: "ダッシュボード" },
  { href: "/fp/customers", label: "顧客一覧" },
];

export function FpShell({
  fpName,
  children,
}: {
  fpName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-64 shrink-0 flex-col bg-[#0b1f3a] text-white">
        <div className="border-b border-white/10 px-5 py-6">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200">
            FP Workspace
          </p>
          <h1 className="mt-2 text-lg font-semibold">専用コンソール</h1>
          <div className="mt-3">
            <ConfidentialBadge />
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-sm text-slate-300">
          <p className="font-medium text-white">{fpName}</p>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="border-b border-slate-200 bg-white px-8 py-4">
          <p className="text-sm text-slate-500">
            この画面は顧客には表示されません。機微情報の入力・確認専用です。
          </p>
        </header>
        <div className="px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
