"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { partSchema, type PartInput } from "@/lib/validators/parts";
import { createPart, updatePart } from "@/lib/actions/parts";

type Props = {
  mode: "create" | "edit";
  partId?: string;
  defaultValues?: Partial<PartInput>;
};

export function PartForm({ mode, partId, defaultValues }: Props) {
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
    <form onSubmit={onSubmit} className="flex flex-col gap-4 max-w-md">
      <div>
        <label htmlFor="partNumber" className="block text-sm font-medium mb-1">
          Part Number
        </label>
        <input
          id="partNumber"
          type="text"
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("partNumber")}
        />
        {errors.partNumber && (
          <p className="mt-1 text-sm text-red-600">{errors.partNumber.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="oemNumber" className="block text-sm font-medium mb-1">
          OEM Number (hiari)
        </label>
        <input
          id="oemNumber"
          type="text"
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("oemNumber")}
        />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Jina la Part
        </label>
        <input
          id="name"
          type="text"
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("name")}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium mb-1">
          Category
        </label>
        <input
          id="category"
          type="text"
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("category")}
        />
        {errors.category && (
          <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="costPrice" className="block text-sm font-medium mb-1">
            Buying Price
          </label>
          <input
            id="costPrice"
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
        <label htmlFor="lowStockThreshold" className="block text-sm font-medium mb-1">
          Low Stock Threshold
        </label>
        <input
          id="lowStockThreshold"
          type="number"
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("lowStockThreshold")}
        />
        {errors.lowStockThreshold && (
          <p className="mt-1 text-sm text-red-600">{errors.lowStockThreshold.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description (hiari)
        </label>
        <textarea
          id="description"
          rows={3}
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("description")}
        />
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50 self-start"
      >
        {isSubmitting ? "Inahifadhi..." : mode === "create" ? "Ongeza Part" : "Hifadhi Mabadiliko"}
      </button>
    </form>
  );
}
