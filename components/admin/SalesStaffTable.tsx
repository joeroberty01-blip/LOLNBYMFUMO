"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveSalesStaff,
  rejectSalesStaff,
  deactivateSalesStaff,
} from "@/lib/actions/admin";

type Staff = {
  id: string;
  name: string;
  email: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DEACTIVATED";
  createdAt: Date;
};

const STATUS_LABEL: Record<Staff["status"], string> = {
  PENDING: "Inasubiri",
  APPROVED: "Imeidhinishwa",
  REJECTED: "Imekataliwa",
  DEACTIVATED: "Imezimwa",
};

const STATUS_CLASS: Record<Staff["status"], string> = {
  PENDING: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  APPROVED: "bg-green-500/15 text-green-700 dark:text-green-400",
  REJECTED: "bg-red-500/15 text-red-700 dark:text-red-400",
  DEACTIVATED: "bg-black/10 text-black/60 dark:bg-white/10 dark:text-white/60",
};

export function SalesStaffTable({ initialStaff }: { initialStaff: Staff[] }) {
  const router = useRouter();
  const [staff, setStaff] = useState(initialStaff);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function runAction(
    id: string,
    action: (id: string) => Promise<{ success: true } | { success: false; error: string }>,
    nextStatus: Staff["status"]
  ) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await action(id);
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, status: nextStatus } : s)));
      router.refresh();
    });
  }

  if (staff.length === 0) {
    return <p className="text-sm text-black/60 dark:text-white/60">Hakuna sales staff bado.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {staff.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-4 rounded-md border border-black/10 dark:border-white/15 p-4"
        >
          <div className="min-w-0">
            <p className="font-medium truncate">{s.name}</p>
            <p className="text-sm text-black/60 dark:text-white/60 truncate">{s.email}</p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[s.status]}`}
            >
              {STATUS_LABEL[s.status]}
            </span>
          </div>

          <div className="flex shrink-0 gap-2">
            {s.status === "PENDING" && (
              <>
                <button
                  type="button"
                  disabled={isPending && pendingId === s.id}
                  onClick={() => runAction(s.id, approveSalesStaff, "APPROVED")}
                  className="rounded-md bg-foreground text-background px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                >
                  Idhinisha
                </button>
                <button
                  type="button"
                  disabled={isPending && pendingId === s.id}
                  onClick={() => runAction(s.id, rejectSalesStaff, "REJECTED")}
                  className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Kataa
                </button>
              </>
            )}

            {s.status === "APPROVED" && (
              <button
                type="button"
                disabled={isPending && pendingId === s.id}
                onClick={() => runAction(s.id, deactivateSalesStaff, "DEACTIVATED")}
                className="rounded-md border border-red-600/40 text-red-600 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Zima Akaunti
              </button>
            )}

            {(s.status === "REJECTED" || s.status === "DEACTIVATED") && (
              <button
                type="button"
                disabled={isPending && pendingId === s.id}
                onClick={() => runAction(s.id, approveSalesStaff, "APPROVED")}
                className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Idhinisha Tena
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
