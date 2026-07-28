"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { expenseSchema, manualExpenseCategories } from "@/lib/validators/expenses";
import { paymentMethods } from "@/lib/validators/sales";
import { createExpense, updateExpense } from "@/lib/actions/expenses";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, DateInput, Select, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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
  const t = useTranslations();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface-elevated p-5">
        <h2 className="mb-4 font-medium text-primary">
          {mode === "create" ? t.adminOps.expenses.addExpense : t.adminOps.expenses.editExpense}
        </h2>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label>{t.common.category}</Label>
            <Select {...register("category")}>
              {manualExpenseCategories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>{t.common.amount}</Label>
            <Input type="number" step="0.01" {...register("amount")} />
            {errors.amount && <p className="mt-1 text-sm text-danger">{errors.amount.message}</p>}
          </div>

          <div>
            <Label>
              {t.common.description} ({t.common.optional})
            </Label>
            <Input {...register("description")} />
          </div>

          <div>
            <Label>{t.common.paymentMethod}</Label>
            <Select {...register("paymentMethod")}>
              {paymentMethods.map((pm) => (
                <option key={pm} value={pm}>
                  {PAYMENT_LABEL[pm]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>
              {t.common.branch} ({t.common.optional})
            </Label>
            <Select {...register("branchId")}>
              <option value="">{t.adminOps.expenses.noneOption}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>
              {t.common.date} ({t.adminOps.expenses.defaultToday})
            </Label>
            <DateInput {...register("date")} />
          </div>

          {formError && <p className="text-sm text-danger">{formError}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? t.common.saving : mode === "create" ? t.common.add : t.common.save}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
