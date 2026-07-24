"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { recordPaymentSchema } from "@/lib/validators/suppliers";
import { paymentMethods } from "@/lib/validators/sales";
import { recordSupplierPayment } from "@/lib/actions/suppliers";

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB Bank",
  BANK_CRDB: "CRDB Bank",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

export function RecordPaymentModal({
  supplierId,
  supplierName,
  currentBalance,
  branches,
  onClose,
}: {
  supplierId: string;
  supplierName: string;
  currentBalance: number;
  branches: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof recordPaymentSchema>,
    unknown,
    z.output<typeof recordPaymentSchema>
  >({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: { supplierId, paymentMethod: "CASH" },
  });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result = await recordSupplierPayment(data);
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
        <h2 className="font-medium mb-1">Record Payment</h2>
        <p className="text-sm text-black/60 dark:text-white/60 mb-4">
          {supplierName} · Balance ya sasa: {currency.format(currentBalance)}
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input type="hidden" {...register("supplierId")} />

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
              {isSubmitting ? "Inahifadhi..." : "Lipa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
