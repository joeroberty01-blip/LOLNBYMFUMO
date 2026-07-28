"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { manualItemFormSchema } from "@/lib/validators/sales";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ManualItemModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: z.output<typeof manualItemFormSchema>) => void;
}) {
  const t = useTranslations();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof manualItemFormSchema>, unknown, z.output<typeof manualItemFormSchema>>({
    resolver: zodResolver(manualItemFormSchema),
  });

  const onSubmit = handleSubmit((data) => {
    onAdd(data);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface-elevated p-5">
        <h2 className="mb-4 font-medium text-primary">{t.sales.manualItem.title}</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label>{t.sales.manualItem.nameLabel}</Label>
            <Input id="manualItemName" type="text" {...register("manualItemName")} />
            {errors.manualItemName && (
              <p className="mt-1 text-sm text-danger">{errors.manualItemName.message}</p>
            )}
          </div>

          <div>
            <Label>{t.sales.manualItem.partNumberLabel}</Label>
            <Input id="manualPartNumber" type="text" {...register("manualPartNumber")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.sales.manualItem.quantityLabel}</Label>
              <Input id="quantity" type="number" min={1} {...register("quantity")} />
              {errors.quantity && (
                <p className="mt-1 text-sm text-danger">{errors.quantity.message}</p>
              )}
            </div>
            <div>
              <Label>{t.sales.manualItem.sellingPriceLabel}</Label>
              <Input id="unitPrice" type="number" step="0.01" {...register("unitPrice")} />
              {errors.unitPrice && (
                <p className="mt-1 text-sm text-danger">{errors.unitPrice.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>{t.sales.manualItem.costPriceLabel}</Label>
            <Input id="manualCostPrice" type="number" step="0.01" {...register("manualCostPrice")} />
            {errors.manualCostPrice && (
              <p className="mt-1 text-sm text-danger">{errors.manualCostPrice.message}</p>
            )}
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary">
              {t.sales.manualItem.addToCart}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
