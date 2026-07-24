"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { convertManualItemSchema } from "@/lib/validators/manualItems";
import { convertManualItemToPart } from "@/lib/actions/manualItems";

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
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
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

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result = await convertManualItemToPart(data);
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    router.refresh();
    onClose();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-background p-5 border border-black/10 dark:border-white/15 max-h-[90vh] overflow-y-auto">
        <h2 className="font-medium mb-1">Convert to Official Part</h2>
        <p className="text-sm text-black/60 dark:text-white/60 mb-4">
          Mauzo ya nyuma ya manual yataendelea kuonekana kama yalivyo. Hii inaunda part rasmi kwa
          mauzo yajayo.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Jina la Part</label>
            <input
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              {...register("name")}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Part Number</label>
            <input
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              {...register("partNumber")}
            />
            {errors.partNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.partNumber.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              {...register("category")}
            />
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Buying Price</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
                {...register("costPrice")}
              />
              {errors.costPrice && (
                <p className="mt-1 text-sm text-red-600">{errors.costPrice.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Selling Price</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
                {...register("unitPrice")}
              />
              {errors.unitPrice && (
                <p className="mt-1 text-sm text-red-600">{errors.unitPrice.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Branch</label>
              <select
                className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
                {...register("branchId")}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.branchId && (
                <p className="mt-1 text-sm text-red-600">{errors.branchId.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Initial Quantity</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
                {...register("initialQuantity")}
              />
              {errors.initialQuantity && (
                <p className="mt-1 text-sm text-red-600">{errors.initialQuantity.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Low Stock Threshold</label>
            <input
              type="number"
              min={0}
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              {...register("lowStockThreshold")}
            />
            {errors.lowStockThreshold && (
              <p className="mt-1 text-sm text-red-600">{errors.lowStockThreshold.message}</p>
            )}
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
              {isSubmitting ? "Inahifadhi..." : "Thibitisha na Unda Part"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
