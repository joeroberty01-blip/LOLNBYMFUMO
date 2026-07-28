"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { convertManualItemSchema } from "@/lib/validators/manualItems";
import { convertManualItemToPart } from "@/lib/actions/manualItems";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Select, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Branch = { id: string; name: string };

export function ConvertManualItemModal({
  groupName,
  suggestedPartNumber,
  suggestedUnitPrice,
  suggestedCostPrice,
  branches,
  onClose,
}: {
  groupName: string;
  suggestedPartNumber: string | null;
  suggestedUnitPrice: number;
  suggestedCostPrice: number;
  branches: Branch[];
  onClose: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<z.output<typeof convertManualItemSchema> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<
    z.input<typeof convertManualItemSchema>,
    unknown,
    z.output<typeof convertManualItemSchema>
  >({
    resolver: zodResolver(convertManualItemSchema),
    defaultValues: {
      name: groupName,
      partNumber: suggestedPartNumber ?? "",
      category: "",
      unitPrice: suggestedUnitPrice,
      costPrice: suggestedCostPrice,
      lowStockThreshold: 10,
      branchId: branches[0]?.id ?? "",
      initialQuantity: 0,
    },
  });

  const onReview = handleSubmit((data) => {
    setFormError(null);
    setPending(data);
  });

  async function confirmConvert() {
    if (!pending) return;
    setIsSubmitting(true);
    const result = await convertManualItemToPart(pending);
    setIsSubmitting(false);
    if (!result.success) {
      setPending(null);
      setFormError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  const pendingBranchName = branches.find((b) => b.id === pending?.branchId)?.name ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-card border border-border bg-surface-elevated p-5">
        <h2 className="mb-1 font-medium text-primary">{t.adminCatalog.manualItems.convertTitle}</h2>
        <p className="mb-4 text-sm text-secondary">{t.adminCatalog.manualItems.convertDescription}</p>

        <form onSubmit={onReview} className="flex flex-col gap-3">
          <div>
            <Label>{t.adminCatalog.parts.nameLabel}</Label>
            <Input {...register("name")} />
            {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
          </div>

          <div>
            <Label>{t.adminCatalog.parts.partNumberLabel}</Label>
            <Input {...register("partNumber")} />
            {errors.partNumber && (
              <p className="mt-1 text-sm text-danger">{errors.partNumber.message}</p>
            )}
          </div>

          <div>
            <Label>{t.common.category}</Label>
            <Input {...register("category")} />
            {errors.category && (
              <p className="mt-1 text-sm text-danger">{errors.category.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.adminCatalog.parts.buyingPrice}</Label>
              <Input type="number" step="0.01" {...register("costPrice")} />
              {errors.costPrice && (
                <p className="mt-1 text-sm text-danger">{errors.costPrice.message}</p>
              )}
            </div>
            <div>
              <Label>{t.adminCatalog.parts.sellingPrice}</Label>
              <Input type="number" step="0.01" {...register("unitPrice")} />
              {errors.unitPrice && (
                <p className="mt-1 text-sm text-danger">{errors.unitPrice.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.common.branch}</Label>
              <Select {...register("branchId")}>
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
            <div>
              <Label>{t.adminCatalog.manualItems.initialQuantity}</Label>
              <Input type="number" min={0} {...register("initialQuantity")} />
              {errors.initialQuantity && (
                <p className="mt-1 text-sm text-danger">{errors.initialQuantity.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>{t.adminCatalog.parts.lowStockThreshold}</Label>
            <Input type="number" min={0} {...register("lowStockThreshold")} />
            {errors.lowStockThreshold && (
              <p className="mt-1 text-sm text-danger">{errors.lowStockThreshold.message}</p>
            )}
          </div>

          {formError && <p className="text-sm text-danger">{formError}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary">
              {t.adminCatalog.manualItems.confirmAndCreate}
            </Button>
          </div>
        </form>
      </div>

      {pending && (
        <ConfirmDialog
          title={t.adminCatalog.manualItems.confirmAndCreate}
          lines={[
            { label: t.adminCatalog.parts.nameLabel, value: pending.name },
            { label: t.adminCatalog.parts.partNumberLabel, value: pending.partNumber },
            { label: t.common.branch, value: pendingBranchName },
            { label: t.adminCatalog.parts.buyingPrice, value: String(pending.costPrice) },
            { label: t.adminCatalog.parts.sellingPrice, value: String(pending.unitPrice) },
            {
              label: t.adminCatalog.manualItems.initialQuantity,
              value: String(pending.initialQuantity),
            },
          ]}
          confirmLabel={t.adminCatalog.manualItems.confirmAndCreate}
          isSubmitting={isSubmitting}
          onConfirm={confirmConvert}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
