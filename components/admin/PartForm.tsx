"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { partSchema, type PartInput } from "@/lib/validators/parts";
import { createPart, updatePart } from "@/lib/actions/parts";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Props = {
  mode: "create" | "edit";
  partId?: string;
  defaultValues?: Partial<PartInput>;
};

export function PartForm({ mode, partId, defaultValues }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof partSchema>, unknown, z.output<typeof partSchema>>({
    resolver: zodResolver(partSchema),
    defaultValues: { lowStockThreshold: 10, ...defaultValues },
  });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result =
      mode === "create" ? await createPart(data) : await updatePart(partId as string, data);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    router.push("/dashboard/admin/parts");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <div>
        <Label>{t.adminCatalog.parts.partNumberLabel}</Label>
        <Input id="partNumber" type="text" {...register("partNumber")} />
        {errors.partNumber && (
          <p className="mt-1 text-sm text-danger">{errors.partNumber.message}</p>
        )}
      </div>

      <div>
        <Label>
          {t.adminCatalog.parts.oemNumber} ({t.common.optional})
        </Label>
        <Input id="oemNumber" type="text" {...register("oemNumber")} />
      </div>

      <div>
        <Label>{t.adminCatalog.parts.nameLabel}</Label>
        <Input id="name" type="text" {...register("name")} />
        {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
      </div>

      <div>
        <Label>{t.common.category}</Label>
        <Input id="category" type="text" {...register("category")} />
        {errors.category && <p className="mt-1 text-sm text-danger">{errors.category.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t.adminCatalog.parts.buyingPrice}</Label>
          <Input id="costPrice" type="number" step="0.01" {...register("costPrice")} />
          {errors.costPrice && (
            <p className="mt-1 text-sm text-danger">{errors.costPrice.message}</p>
          )}
        </div>

        <div>
          <Label>{t.adminCatalog.parts.sellingPrice}</Label>
          <Input id="unitPrice" type="number" step="0.01" {...register("unitPrice")} />
          {errors.unitPrice && (
            <p className="mt-1 text-sm text-danger">{errors.unitPrice.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label>{t.adminCatalog.parts.lowStockThreshold}</Label>
        <Input id="lowStockThreshold" type="number" {...register("lowStockThreshold")} />
        {errors.lowStockThreshold && (
          <p className="mt-1 text-sm text-danger">{errors.lowStockThreshold.message}</p>
        )}
      </div>

      <div>
        <Label>
          {t.common.description} ({t.common.optional})
        </Label>
        <textarea
          id="description"
          rows={3}
          className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          {...register("description")}
        />
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button type="submit" variant="primary" disabled={isSubmitting} className="self-start">
        {isSubmitting
          ? t.common.saving
          : mode === "create"
            ? t.adminCatalog.parts.addSubmit
            : t.adminCatalog.parts.saveChanges}
      </Button>
    </form>
  );
}
