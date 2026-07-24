"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { supplierSchema } from "@/lib/validators/suppliers";
import { createSupplier, updateSupplier } from "@/lib/actions/suppliers";

type Props = {
  mode: "create" | "edit";
  supplierId?: string;
  defaultValues?: Partial<z.output<typeof supplierSchema>>;
};

export function SupplierForm({ mode, supplierId, defaultValues }: Props) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof supplierSchema>, unknown, z.output<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { balance: 0, ...defaultValues },
  });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const result =
      mode === "create"
        ? await createSupplier(data)
        : await updateSupplier(supplierId as string, data);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    router.push("/dashboard/admin/suppliers");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">Jina</label>
        <input
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("name")}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Simu (hiari)</label>
        <input
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("phone")}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Barua pepe (hiari)</label>
        <input
          type="email"
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("email")}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Anwani (hiari)</label>
        <input
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("address")}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Balance (deni tunalodaiwa)</label>
        <input
          type="number"
          step="0.01"
          className="w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          {...register("balance")}
        />
        {errors.balance && <p className="mt-1 text-sm text-red-600">{errors.balance.message}</p>}
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          Weka hapa deni lililopo kwa sasa (mfano manunuzi ya awali ya credit). Malipo yajayo
          yatapunguza namba hii moja kwa moja kupitia &quot;Record Payment&quot;.
        </p>
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50 self-start"
      >
        {isSubmitting ? "Inahifadhi..." : mode === "create" ? "Ongeza Supplier" : "Hifadhi Mabadiliko"}
      </button>
    </form>
  );
}
