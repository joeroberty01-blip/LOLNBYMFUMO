"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { expenseSchema, manualExpenseCategories } from "@/lib/validators/expenses";
import { paymentMethods } from "@/lib/validators/sales";
import { createExpense, updateExpense } from "@/lib/actions/expenses";

const CATEGORY_LABEL: Record<string, string> = {
  RENT: "Rent",
  SALARIES: "Salaries",
  UTILITIES: "Utilities",
  TRANSPORT: "Transport",
  OTHER: "Other",
};

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB Bank",
  BANK_CRDB: "CRDB Bank",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

type Props = {
  mode: "create" | "edit";
  expenseId?: string;
  branches: { id: string; name: string }[];
  defaultValues?: Partial<z.output<typeof expenseSchema>>;
  onClose: () => void;
};

export function ExpenseFormModal({ mode, expenseId, branches, defaultValues, onClose }: Props) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof expenseSchema>, unknown, z.output<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { category: "OTHER", paymentMethod: "CASH", ...defaultValues },
  });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result =
      mode === "create" ? await createExpense(data) : await updateExpense(expenseId as string, data);

    if (!result.success) {
      setFormError(result.error);
      return;
    }
    router.refresh();
    onClose();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-background p-5 border border-black/10 dark:border-white/15">
        <h2 className="font-medium mb-4">{mode === "create" ? "Add Expense" : "Hariri Expense"}</h2>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              {...register("category")}
            >
              {manualExpenseCategories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              {...register("amount")}
            />
            {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description (hiari)</label>
            <input
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              {...register("description")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Payment Method</label>
            <select
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              {...register("paymentMethod")}
            >
              {paymentMethods.map((pm) => (
                <option key={pm} value={pm}>
                  {PAYMENT_LABEL[pm]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Branch (hiari)</label>
            <select
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              {...register("branchId")}
            >
              <option value="">— Hakuna —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tarehe (default leo)</label>
            <input
              type="date"
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              {...register("date")}
            />
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-black/15 dark:border-white/20 px-4 py-2 text-sm"
            >
              Ghairi
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {isSubmitting ? "Inahifadhi..." : mode === "create" ? "Ongeza" : "Hifadhi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
