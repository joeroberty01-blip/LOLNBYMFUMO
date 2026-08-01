"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ExpenseRow } from "@/lib/data/expenses";
import type { manualExpenseCategories } from "@/lib/validators/expenses";
import type { paymentMethods } from "@/lib/validators/sales";
import { ExpenseFormModal } from "@/components/admin/ExpenseFormModal";
import { deleteExpense } from "@/lib/actions/expenses";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import {
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/constants/expenseCategoryColors";
import type { ExpenseCategory } from "@/generated/prisma/client";
import { Table, THead, THeadRow, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

type ManualCategory = (typeof manualExpenseCategories)[number];

const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
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
  canManage = true,
}: {
  rows: ExpenseRow[];
  branches: { id: string; name: string }[];
  /** Sales staff can add expenses but not edit/delete existing ones — only an admin can. */
  canManage?: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(id: string) {
    const confirmed = window.confirm(t.adminOps.expenses.confirmDelete);
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
      <div className="mb-4 flex justify-end">
        <Button type="button" variant="primary" onClick={() => setAdding(true)}>
          + {t.adminOps.expenses.addExpense}
        </Button>
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {rows.length === 0 ? (
        <EmptyState title={t.adminOps.expenses.noExpenses} />
      ) : (
        <Table>
          <THead>
            <THeadRow>
              <Th>{t.common.date}</Th>
              <Th>{t.common.category}</Th>
              <Th>{t.common.description}</Th>
              <Th>{t.common.branch}</Th>
              <Th>{t.common.paymentMethod}</Th>
              <Th className="text-right">{t.common.amount}</Th>
              <Th>{t.common.actions}</Th>
            </THeadRow>
          </THead>
          <TBody>
            {rows.map((r, i) => {
              const category = r.category as ExpenseCategory;
              return (
                <Tr key={r.id} index={i}>
                  <Td className="text-secondary">{r.createdAt.toLocaleString("sw-TZ")}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: EXPENSE_CATEGORY_COLORS[category] ?? "#8B8D98" }}
                      />
                      {EXPENSE_CATEGORY_LABELS[category] ?? r.category}
                    </span>
                  </Td>
                  <Td>
                    {r.description ??
                      (r.supplierName ? `${t.adminOps.expenses.paymentTo} ${r.supplierName}` : "—")}
                  </Td>
                  <Td>{r.branchName ?? "—"}</Td>
                  <Td>{PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod}</Td>
                  <Td className="text-right tabular-nums">{currency.format(r.amount)}</Td>
                  <Td>
                    {!r.isEditable ? (
                      <span className="text-xs text-secondary">
                        {t.adminOps.expenses.autoSupplierPayment}
                      </span>
                    ) : canManage ? (
                      <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => setEditing(r)}>
                          {t.common.edit}
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={isPending && pendingId === r.id}
                          onClick={() => handleDelete(r.id)}
                        >
                          {t.common.delete}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-secondary">—</span>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
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
