import type { SessionStatus } from "@/types/fp";

const labels: Record<SessionStatus, string> = {
  scheduled: "予定",
  in_progress: "面談中",
  completed: "完了",
};

const styles: Record<SessionStatus, string> = {
  scheduled: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
