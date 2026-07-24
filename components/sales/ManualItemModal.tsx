"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { manualItemFormSchema } from "@/lib/validators/sales";

export function ManualItemModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: z.output<typeof manualItemFormSchema>) => void;
}) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-background p-5 border border-black/10 dark:border-white/15">
        <h2 className="font-medium mb-4">Add Manual Item</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <label htmlFor="manualItemName" className="block text-sm font-medium mb-1">
              Jina la bidhaa
            </label>
            <input
              id="manualItemName"
              type="text"
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              {...register("manualItemName")}
            />
            {errors.manualItemName && (
              <p className="mt-1 text-sm text-red-600">{errors.manualItemName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="manualPartNumber" className="block text-sm font-medium mb-1">
              Part Number (hiari)
            </label>
            <input
              id="manualPartNumber"
              type="text"
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              {...register("manualPartNumber")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
                {...register("quantity")}
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="unitPrice" className="block text-sm font-medium mb-1">
                Selling Price
              </label>
              <input
                id="unitPrice"
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

          <div>
            <label htmlFor="manualCostPrice" className="block text-sm font-medium mb-1">
              Buying Price / Cost Price
            </label>
            <input
              id="manualCostPrice"
              type="number"
              step="0.01"
              className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
              {...register("manualCostPrice")}
            />
            {errors.manualCostPrice && (
              <p className="mt-1 text-sm text-red-600">{errors.manualCostPrice.message}</p>
            )}
          </div>

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
              className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium"
            >
              Ongeza kwenye Cart
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
