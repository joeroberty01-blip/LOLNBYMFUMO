"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ExpenseRow } from "@/lib/data/expenses";
import type { manualExpenseCategories } from "@/lib/validators/expenses";
import type { paymentMethods } from "@/lib/validators/sales";
import { ExpenseFormModal } from "@/components/admin/ExpenseFormModal";
import { deleteExpense } from "@/lib/actions/expenses";

type ManualCategory = (typeof manualExpenseCategories)[number];

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
const CATEGORY_LABEL: Record<string, string> = {
  SUPPLIER_PAYMENT: "Supplier Payment",
  RENT: "Rent",
  SALARIES: "Salaries",
  UTILITIES: "Utilities",
  TRANSPORT: "Transport",
  OTHER: "Other",
};
const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB",
  BANK_CRDB: "CRDB",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

export function ExpensesTable({
  rows,
  branches,
}: {
  rows: ExpenseRow[];
  branches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(id: string) {
    const confirmed = window.confirm("Una uhakika unataka kufuta expense hii?");
    if (!confirmed) return;

    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await deleteExpense(id);
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium"
        >
          + Add Expense
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {rows.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">Hakuna expenses kwa kipindi hiki.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/15 text-left">
                <th className="py-2 pr-3 font-medium">Tarehe</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Description</th>
                <th className="py-2 pr-3 font-medium">Branch</th>
                <th className="py-2 pr-3 font-medium">Payment</th>
                <th className="py-2 pr-3 font-medium">Amount</th>
                <th className="py-2 pr-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-black/5 dark:border-white/10">
                  <td className="py-2 pr-3">{r.createdAt.toLocaleString("sw-TZ")}</td>
                  <td className="py-2 pr-3">{CATEGORY_LABEL[r.category] ?? r.category}</td>
                  <td className="py-2 pr-3">
                    {r.description ?? (r.supplierName ? `Malipo kwa ${r.supplierName}` : "—")}
                  </td>
                  <td className="py-2 pr-3">{r.branchName ?? "—"}</td>
                  <td className="py-2 pr-3">{PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod}</td>
                  <td className="py-2 pr-3">{currency.format(r.amount)}</td>
                  <td className="py-2 pr-3">
                    {r.isEditable ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(r)}
                          className="rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isPending && pendingId === r.id}
                          onClick={() => handleDelete(r.id)}
                          className="rounded-md border border-red-600/40 text-red-600 px-3 py-1.5 text-sm disabled:opacity-50"
                        >
                          Futa
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-black/40 dark:text-white/40">
                        Auto (Supplier Payment)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <ExpenseFormModal mode="create" branches={branches} onClose={() => setAdding(false)} />
      )}
      {editing && (
        <ExpenseFormModal
          mode="edit"
          expenseId={editing.id}
          branches={branches}
          defaultValues={{
            category: editing.category as ManualCategory,
            amount: editing.amount,
            description: editing.description ?? undefined,
            paymentMethod: editing.paymentMethod as (typeof paymentMethods)[number],
            branchId: undefined,
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
