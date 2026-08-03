"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { partSchema } from "@/lib/validators/parts";
import { createPartQuick } from "@/lib/actions/parts";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const quickPartSchema = partSchema.pick({
  partNumber: true,
  name: true,
  category: true,
  costPrice: true,
  unitPrice: true,
});

export function QuickPartModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (part: { id: string; partNumber: string; name: string; costPrice: number }) => void;
}) {
  const t = useTranslations();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof quickPartSchema>, unknown, z.output<typeof quickPartSchema>>({
    resolver: zodResolver(quickPartSchema),
  });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result = await createPartQuick({
      ...data,
      oemNumber: undefined,
      description: undefined,
      lowStockThreshold: 5,
    });
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    onCreated({
      id: result.partId,
      partNumber: data.partNumber,
      name: data.name,
      costPrice: data.costPrice,
    });
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface-elevated p-5">
        <h2 className="mb-4 font-medium text-primary">{t.adminCatalog.purchases.newProductTitle}</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label>{t.adminCatalog.parts.partNumberLabel}</Label>
            <Input type="text" {...register("partNumber")} />
            {errors.partNumber && (
              <p className="mt-1 text-sm text-danger">{errors.partNumber.message}</p>
            )}
          </div>
          <div>
            <Label>{t.adminCatalog.parts.nameLabel}</Label>
            <Input type="text" {...register("name")} />
            {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
          </div>
          <div>
            <Label>{t.common.category}</Label>
            <Input type="text" {...register("category")} />
            {errors.category && (
              <p className="mt-1 text-sm text-danger">{errors.category.message}</p>
            )}
          </div>
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

          {formError && <p className="text-sm text-danger">{formError}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? t.common.saving : t.common.add}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
