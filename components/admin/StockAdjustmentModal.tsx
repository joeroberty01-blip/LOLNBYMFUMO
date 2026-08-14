"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SlidersHorizontal } from "lucide-react";
import { adjustStock } from "@/lib/actions/inventory";
import { adjustmentReasons } from "@/lib/validators/inventory";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
import { Input, Select, Label } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const REASON_LABEL: Record<(typeof adjustmentReasons)[number], string> = {
  NEW_STOCK: "New stock",
  DAMAGED: "Damaged goods",
  CORRECTION: "Correction",
  OTHER: "Other",
};

type Branch = { id: string; name: string };

export function StockAdjustmentModal({
  partId,
  partName,
  branchId,
  branchName,
  branches,
  compact = false,
}: {
  partId: string;
  partName: string;
  branchId: string | null;
  branchName: string;
  branches: Branch[];
  /** Icon-only trigger, for dense table rows where a labelled button would wrap the row. */
  compact?: boolean;
}) {
  const t = useTranslations();
  const formSchema = z.object({
    branchId: z.string().min(1, t.adminCatalog.parts.selectBranchError),
    type: z.enum(["ADD", "REMOVE"]),
    amount: z.coerce.number().int().positive(t.adminCatalog.parts.positiveNumberError),
    reason: z.enum(adjustmentReasons),
  });
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<z.output<typeof formSchema> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof formSchema>, unknown, z.output<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { branchId: branchId ?? "", type: "ADD", reason: "NEW_STOCK" },
  });

  function close() {
    setOpen(false);
    setFormError(null);
    setPending(null);
    reset();
  }

  // Step 1: validate the form and show a confirmation summary — nothing is written yet.
  const onReview = handleSubmit((values) => {
    setFormError(null);
    setPending(values);
  });

  // Step 2: the admin explicitly confirmed — now actually adjust stock.
  async function confirmAdjustment() {
    if (!pending) return;
    setIsSubmitting(true);
    const quantityChange = pending.type === "ADD" ? pending.amount : -pending.amount;

    const result = await adjustStock({
      partId,
      branchId: pending.branchId,
      quantityChange,
      reason: pending.reason,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setPending(null);
      setFormError(result.error);
      return;
    }

    close();
    router.refresh();
  }

  const pendingBranchName =
    branches.find((b) => b.id === pending?.branchId)?.name ?? branchName;

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.adminCatalog.parts.adjustStock}
          title={t.adminCatalog.parts.adjustStock}
          className="rounded-control p-1.5 text-secondary hover:bg-white/[0.06] hover:text-primary"
        >
          <SlidersHorizontal size={15} />
        </button>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          {t.adminCatalog.parts.adjustStock}
        </Button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-card border border-border bg-surface-elevated p-5">
            <h2 className="mb-1 font-medium text-primary">{t.adminCatalog.parts.adjustStock}</h2>
            <p className="mb-4 text-sm text-secondary">{partName}</p>

            <form onSubmit={onReview} className="flex flex-col gap-3">
              {branchId ? (
                <div>
                  <Label>{t.common.branch}</Label>
                  <p className="text-sm text-primary">{branchName}</p>
                  <input type="hidden" value={branchId} {...register("branchId")} />
                </div>
              ) : (
                <div>
                  <Label>{t.common.branch}</Label>
                  <Select id="branchId" {...register("branchId")}>
                    <option value="">{t.adminCatalog.parts.selectBranch}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                  {errors.branchId && (
                    <p className="mt-1 text-sm text-danger">{errors.branchId.message}</p>
                  )}
                </div>
              )}

              <div>
                <Label>{t.adminCatalog.parts.type}</Label>
                <div className="flex gap-4 text-sm text-primary">
                  <label className="flex items-center gap-1.5">
                    <input type="radio" value="ADD" {...register("type")} />
                    {t.common.add}
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" value="REMOVE" {...register("type")} />
                    {t.adminCatalog.parts.remove}
                  </label>
                </div>
              </div>

              <div>
                <Label>{t.adminCatalog.parts.quantity}</Label>
                <Input id="amount" type="number" min={1} {...register("amount")} />
                {errors.amount && (
                  <p className="mt-1 text-sm text-danger">{errors.amount.message}</p>
                )}
              </div>

              <div>
                <Label>{t.adminCatalog.parts.reason}</Label>
                <Select id="reason" {...register("reason")}>
                  {adjustmentReasons.map((r) => (
                    <option key={r} value={r}>
                      {REASON_LABEL[r]}
                    </option>
                  ))}
                </Select>
              </div>

              {formError && <p className="text-sm text-danger">{formError}</p>}

              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={close}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? t.common.saving : t.common.save}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pending && (
        <ConfirmDialog
          title={`${t.adminCatalog.parts.confirmAdjustmentTitle} — ${partName}`}
          lines={[
            { label: t.common.branch, value: pendingBranchName },
            {
              label: t.adminCatalog.parts.type,
              value: pending.type === "ADD" ? t.common.add : t.adminCatalog.parts.remove,
            },
            {
              label: t.adminCatalog.parts.quantity,
              value: `${pending.type === "ADD" ? "+" : "-"}${pending.amount}`,
              emphasis: true,
            },
            { label: t.adminCatalog.parts.reason, value: REASON_LABEL[pending.reason] },
          ]}
          warning={
            pending.type === "REMOVE" && pending.amount >= 100
              ? t.adminCatalog.parts.confirmLargeAdjustment
              : undefined
          }
          confirmLabel={t.adminCatalog.parts.confirmAdjustmentButton}
          isSubmitting={isSubmitting}
          onConfirm={confirmAdjustment}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
