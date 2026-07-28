"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { recordCustomerPaymentSchema } from "@/lib/validators/customers";
import { paymentMethods } from "@/lib/validators/sales";
import { recordCustomerPayment } from "@/lib/actions/customers";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, Select, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_NMB: "NMB Bank",
  BANK_CRDB: "CRDB Bank",
  VODA_LIPA: "Voda Lipa",
  TIGO_LIPA: "Tigo Lipa",
};

export function RecordCustomerPaymentModal({
  customerId,
  customerName,
  currentBalance,
  branches,
  onClose,
}: {
  customerId: string;
  customerName: string;
  currentBalance: number;
  branches: { id: string; name: string }[];
  onClose: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<z.output<typeof recordCustomerPaymentSchema> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currency = new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<
    z.input<typeof recordCustomerPaymentSchema>,
    unknown,
    z.output<typeof recordCustomerPaymentSchema>
  >({
    resolver: zodResolver(recordCustomerPaymentSchema),
    defaultValues: { customerId, paymentMethod: "CASH" },
  });

  const onReview = handleSubmit((data) => {
    setFormError(null);
    setPending(data);
  });

  async function confirmPayment() {
    if (!pending) return;
    setIsSubmitting(true);
    const result = await recordCustomerPayment(pending);
    setIsSubmitting(false);
    if (!result.success) {
      setPending(null);
      setFormError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  const pendingBranchName = branches.find((b) => b.id === pending?.branchId)?.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface-elevated p-5">
        <h2 className="mb-1 font-medium text-primary">{t.adminCatalog.customers.recordPayment}</h2>
        <p className="mb-4 text-sm text-secondary">
          {customerName} · {t.adminCatalog.customers.currentBalance}: {currency.format(currentBalance)}
        </p>

        <form onSubmit={onReview} className="flex flex-col gap-3">
          <input type="hidden" {...register("customerId")} />

          <div>
            <Label>{t.common.amount}</Label>
            <Input type="number" step="0.01" {...register("amount")} />
            {errors.amount && <p className="mt-1 text-sm text-danger">{errors.amount.message}</p>}
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
              <option value="">{t.adminCatalog.customers.noneOption}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>

          {formError && <p className="text-sm text-danger">{formError}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary">
              {t.adminCatalog.customers.pay}
            </Button>
          </div>
        </form>
      </div>

      {pending && (
        <ConfirmDialog
          title={`${t.adminCatalog.customers.recordPayment} — ${customerName}`}
          lines={[
            { label: t.common.amount, value: currency.format(pending.amount), emphasis: true },
            { label: t.common.paymentMethod, value: PAYMENT_LABEL[pending.paymentMethod] },
            { label: t.common.branch, value: pendingBranchName ?? t.adminCatalog.customers.noneOption },
            {
              label: t.adminCatalog.customers.balance,
              value: `${currency.format(currentBalance)} → ${currency.format(Math.max(0, currentBalance - pending.amount))}`,
            },
          ]}
          warning={pending.amount > currentBalance ? t.adminCatalog.customers.overpaymentWarning : undefined}
          confirmLabel={t.adminCatalog.customers.pay}
          isSubmitting={isSubmitting}
          onConfirm={confirmPayment}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
