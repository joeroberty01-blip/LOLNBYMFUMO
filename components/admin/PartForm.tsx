"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { partFormSchema } from "@/lib/validators/parts";
import { createPart, updatePart } from "@/lib/actions/parts";
import { useTranslations } from "@/lib/i18n/I18nProvider";
import { Input, Select, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Props = {
  mode: "create" | "edit";
  partId?: string;
  /** Superset of both modes' fields — includes `quantity`, which the edit page fills with that
   * store row's current count so the field opens on the true value, not a stray 0. */
  defaultValues?: Partial<z.output<typeof partFormSchema>>;
  branches?: { id: string; name: string }[];
  /** Edit mode: the store whose row the admin opened this part from. A part can hold stock in
   * several stores at once, so the page has to say which one is being edited — picking a
   * different store in the form moves that store's stock to the new one. */
  currentBranchId?: string;
};

export function PartForm({
  mode,
  partId,
  defaultValues,
  branches = [],
  currentBranchId,
}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  // partFormSchema carries the extra fields of both modes; each one is optional and only
  // rendered in the mode it belongs to, and the receiving action re-validates with its own
  // schema, which drops the keys it doesn't declare.
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof partFormSchema>, unknown, z.output<typeof partFormSchema>>({
    resolver: zodResolver(partFormSchema),
    defaultValues: {
      lowStockThreshold: 5,
      openingQuantity: 0,
      openingBranchId: branches[0]?.id ?? "",
      quantity: 0,
      fromBranchId: currentBranchId ?? "",
      toBranchId: currentBranchId ?? "",
      ...defaultValues,
    },
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

      {mode === "edit" && branches.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t.adminCatalog.parts.quantity}</Label>
            <Input id="quantity" type="number" min={0} {...register("quantity")} />
            {errors.quantity && (
              <p className="mt-1 text-sm text-danger">{errors.quantity.message}</p>
            )}
            <p className="mt-1 text-xs text-secondary">
              Ukibadilisha namba hii, inarekodiwa kama stock correction — sio kubadilishwa kimya
              kimya.
            </p>
          </div>
          <div>
            <Label>Store</Label>
            <input type="hidden" {...register("fromBranchId")} />
            <Select id="toBranchId" {...register("toBranchId")}>
              {!currentBranchId && <option value="">Chagua store</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-secondary">
              Ukibadilisha store, stock yote ya part hii inahama kwenda store mpya. Jumla ya stock
              haibadiliki.
            </p>
          </div>
        </div>
      )}

      {mode === "create" && branches.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Quantity ({t.common.optional})</Label>
            <Input id="openingQuantity" type="number" min={0} {...register("openingQuantity")} />
            {errors.openingQuantity && (
              <p className="mt-1 text-sm text-danger">{errors.openingQuantity.message}</p>
            )}
          </div>
          <div>
            <Label>Store</Label>
            <Select id="openingBranchId" {...register("openingBranchId")}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

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
